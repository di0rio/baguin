import { livekitSala } from "@baguin/shared";
import type { RemoteAudioTrack, RemoteParticipant, Room } from "livekit-client";
import { api } from "../api";
import type { FonteMundo, Voz, VozDebug, VozEstado } from "./voz";
import { alvosDeVoz, decidirConexao, devePublicarMic, esperaBackoff, suavizar } from "./vozRegras";

type LivekitClient = typeof import("livekit-client");

const TICK_MS = 200;
/** A rampa de volume roda mais rápido que o tick para não haver degrau audível. */
const RAMPA_MS = 50;
/** Passo por RAMPA_MS: do mudo ao volume cheio em ~250 ms. */
const RAMPA_PASSO = 0.2;
const CHAVE_MIC = "baguin.microfone";
const MOTIVO_INDISPONIVEL = "voz indisponível";
const MOTIVO_SOM = "clique para ativar o som";
const MOTIVO_MIC_NEGADO = "microfone bloqueado";
const MOTIVO_MIC_OUTRO = "microfone indisponível";
const MOTIVO_SILENCIADO = "você está silenciado";

/** Uma conexão (ou tentativa) com a sala LiveKit de um Lugar. */
type Sessao = {
  lugarId: string;
  room: Room | null;
  pronta: boolean;
  cancelada: boolean;
  /** O token foi emitido com canPublish=false (Silenciado); reconecta quando o silêncio acabar. */
  tokenSilenciado: boolean;
};

const lerPreferencia = (): "ligado" | "mudo" => {
  try {
    return localStorage.getItem(CHAVE_MIC) === "mudo" ? "mudo" : "ligado";
  } catch {
    return "ligado";
  }
};

const igualEstado = (a: VozEstado, b: VozEstado) =>
  a.disponivel === b.disponivel &&
  a.motivo === b.motivo &&
  a.microfone === b.microfone &&
  a.conectado === b.conectado &&
  a.falando.size === b.falando.size &&
  [...a.falando].every((id) => b.falando.has(id));

/**
 * Voz de proximidade: uma sala LiveKit por Lugar, aberta só quando há alguém para ouvir.
 * Toda a decisão (quem ouvir, volume, quando conectar/desconectar) vem de `vozRegras.ts`;
 * aqui só se aplica isso à sala e se expõe o estado.
 */
export function criarVozLivekit(): Voz {
  const assinantes = new Set<() => void>();
  let snapshot: VozEstado = { disponivel: true, microfone: "ligado", conectado: false, falando: new Set() };

  let fonte: FonteMundo | null = null;
  let rodando = false;
  let semLivekit = false;
  let timerTick: ReturnType<typeof setInterval> | null = null;
  let timerRampa: ReturnType<typeof setInterval> | null = null;
  let containerAudio: HTMLDivElement | null = null;
  let lk: LivekitClient | null = null;

  let sessao: Sessao | null = null;
  let vazioDesde: number | null = null;
  let falhas = 0;
  let proximaTentativa = 0;
  let falhou = false;
  let reconectando = false;
  let somBloqueado = false;
  let micErro: string | null = null;
  let micOcupado = false;
  let silenciado = false;
  let preferencia = lerPreferencia();
  let alvos = new Map<string, number>();
  let falando: ReadonlySet<string> = new Set();
  let naoPerturbe = false;

  // ---- estado publicado ----

  function publicarEstado() {
    const conectado = !!sessao?.pronta;
    const motivo =
      semLivekit || falhou || reconectando
        ? MOTIVO_INDISPONIVEL
        : somBloqueado
          ? MOTIVO_SOM
          : micErro
            ? micErro
            : silenciado
              ? MOTIVO_SILENCIADO
              : undefined;
    const prox: VozEstado = {
      disponivel: !(semLivekit || falhou || reconectando),
      ...(motivo ? { motivo } : {}),
      microfone: preferencia === "ligado" && !micErro && !silenciado ? "ligado" : "mudo",
      conectado,
      falando,
    };
    if (igualEstado(snapshot, prox)) return;
    snapshot = prox;
    for (const fn of [...assinantes]) fn();
  }

  // ---- conexão ----

  function desconectar() {
    const s = sessao;
    if (!s) return;
    s.cancelada = true;
    sessao = null;
    const room = s.room;
    if (room) {
      room.removeAllListeners();
      void room.disconnect();
    }
    containerAudio?.replaceChildren();
    vazioDesde = null;
    reconectando = false;
    somBloqueado = false;
    micErro = null;
    micOcupado = false;
    falando = new Set();
    publicarEstado();
  }

  function falhar(s: Sessao) {
    if (sessao === s) desconectar();
    falhas++;
    proximaTentativa = Date.now() + esperaBackoff(falhas);
    falhou = true;
    publicarEstado();
  }

  async function conectar(lugarId: string) {
    const s: Sessao = { lugarId, room: null, pronta: false, cancelada: false, tokenSilenciado: fonte!.silenciadoAte() > Date.now() };
    sessao = s;
    try {
      const [dto, cliente] = await Promise.all([api.livekitToken(fonte!.espacoId, lugarId), import("livekit-client")]);
      if (s.cancelada) return;
      lk = cliente;
      const room = new cliente.Room();
      s.room = room;
      registrar(room, s, cliente);
      await room.connect(dto.url, dto.token, { autoSubscribe: false });
      if (s.cancelada) return void room.disconnect();
      s.pronta = true;
      falhas = 0;
      falhou = false;
      somBloqueado = !room.canPlaybackAudio;
      publicarEstado();
      tick();
    } catch {
      if (!s.cancelada) falhar(s);
    }
  }

  function registrar(room: Room, s: Sessao, c: LivekitClient) {
    const { RoomEvent } = c;
    room
      .on(RoomEvent.TrackSubscribed, (track, _pub, p) => {
        if (track.kind !== c.Track.Kind.Audio) return;
        const el = track.attach();
        el.dataset.contaId = p.identity;
        (containerAudio ??= criarContainer()).appendChild(el);
        (track as RemoteAudioTrack).setVolume(0); // a rampa sobe até o alvo
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        for (const el of track.detach()) el.remove();
        recalcularFalando();
      })
      .on(RoomEvent.TrackPublished, () => aplicar())
      .on(RoomEvent.ParticipantConnected, () => aplicar())
      .on(RoomEvent.ActiveSpeakersChanged, () => recalcularFalando())
      .on(RoomEvent.AudioPlaybackStatusChanged, () => {
        somBloqueado = !room.canPlaybackAudio;
        publicarEstado();
      })
      .on(RoomEvent.Reconnecting, () => {
        reconectando = true;
        publicarEstado();
      })
      .on(RoomEvent.Reconnected, () => {
        reconectando = false;
        publicarEstado();
      })
      .on(RoomEvent.Disconnected, () => {
        // Chamadas nossas a disconnect() já limparam a sessão (removeAllListeners); aqui só o inesperado.
        if (!s.cancelada) falhar(s);
      });
  }

  function criarContainer() {
    const d = document.createElement("div");
    d.hidden = true;
    d.dataset.baguinVoz = "audio";
    document.body.appendChild(d);
    return d;
  }

  // ---- aplicação do estado desejado na sala ----

  const microfonePublicado = (room: Room) => !!room.localParticipant.getTrackPublication(lk!.Track.Source.Microphone);

  const audiosDe = (p: RemoteParticipant) => [...p.audioTrackPublications.values()];

  function aplicar() {
    const s = sessao;
    if (!s?.pronta || !s.room || !lk) return;
    const room = s.room;

    // Assina o áudio de quem posso ouvir e desassina o resto.
    for (const p of room.remoteParticipants.values()) {
      const quer = alvos.has(p.identity);
      for (const pub of audiosDe(p)) if (pub.isDesired !== quer) pub.setSubscribed(quer);
    }

    // Microfone: publicado só quando conectado, ligado, sem Silenciar e sem Não perturbe.
    const queroMic = devePublicarMic({
      conectado: true,
      preferencia,
      silenciado,
      naoPerturbe,
      bloqueado: micErro !== null,
    });
    if (!micOcupado && queroMic !== microfonePublicado(room)) void ajustarMic(s, room, queroMic);
    recalcularFalando();
  }

  async function ajustarMic(s: Sessao, room: Room, publicar: boolean) {
    micOcupado = true;
    try {
      if (publicar) {
        await room.localParticipant.setMicrophoneEnabled(true);
      } else {
        const pub = room.localParticipant.getTrackPublication(lk!.Track.Source.Microphone);
        if (pub?.track) await room.localParticipant.unpublishTrack(pub.track, true);
      }
    } catch (e) {
      if (!s.cancelada && publicar) {
        micErro = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? MOTIVO_MIC_NEGADO : MOTIVO_MIC_OUTRO;
      }
    } finally {
      if (!s.cancelada) {
        micOcupado = false;
        publicarEstado();
      }
    }
  }

  function rampa() {
    const room = sessao?.pronta ? sessao.room : null;
    if (!room) return;
    for (const p of room.remoteParticipants.values()) {
      const alvo = alvos.get(p.identity);
      for (const pub of audiosDe(p)) {
        const t = pub.audioTrack as RemoteAudioTrack | undefined;
        if (!t) continue;
        // Sem alvo: mudo já (a desassinatura está a caminho).
        t.setVolume(alvo === undefined ? 0 : suavizar(t.getVolume(), alvo, RAMPA_PASSO));
      }
    }
  }

  function recalcularFalando() {
    const s = sessao;
    const novo = new Set<string>();
    if (s?.pronta && s.room) {
      const room = s.room;
      for (const sp of room.activeSpeakers) {
        if (sp === room.localParticipant) {
          if (microfonePublicado(room)) novo.add(sp.identity);
        } else if (alvos.has(sp.identity) && audiosDe(sp as RemoteParticipant).some((pub) => pub.isSubscribed)) {
          novo.add(sp.identity);
        }
      }
    }
    if (novo.size !== falando.size || [...novo].some((id) => !falando.has(id))) {
      falando = novo;
      publicarEstado();
    }
  }

  // ---- laço principal ----

  function tick() {
    if (!rodando || semLivekit || !fonte) return;
    const agora = Date.now();
    const lugar = fonte.lugar();
    const eu = fonte.eu();

    if (!lugar || !eu) {
      // Passagem entre Lugares (ou ainda entrando): sem sala, sem ninguém.
      desconectar();
      alvos = new Map();
      return;
    }
    if (sessao && sessao.lugarId !== lugar.id) desconectar();

    silenciado = fonte.silenciadoAte() > agora;
    if (sessao?.tokenSilenciado && !silenciado) desconectar(); // reconecta com canPublish=true logo abaixo
    naoPerturbe = eu.naoPerturbe;
    alvos = alvosDeVoz(eu, fonte.outros(), lugar, fonte.bloqueados());

    const d = decidirConexao({
      conectado: !!sessao?.pronta,
      conectando: !!sessao && !sessao.pronta,
      temAlvos: alvos.size > 0,
      agora,
      vazioDesde,
      proximaTentativa,
    });
    vazioDesde = d.vazioDesde;
    if (d.acao === "desconectar") desconectar();
    else if (d.acao === "conectar") void conectar(lugar.id);

    aplicar();
    publicarEstado();
  }

  function aoGesto() {
    const room = sessao?.room;
    if (room && !room.canPlaybackAudio) void room.startAudio().catch(() => {});
  }

  function depurar(): VozDebug {
    const s = sessao;
    const room = s?.pronta ? s.room : null;
    return {
      conectado: !!room,
      sala: s ? livekitSala(fonte!.espacoId, s.lugarId) : null,
      microfonePublicado: room ? microfonePublicado(room) : false,
      remotos: room
        ? [...room.remoteParticipants.values()].map((p) => {
            const pub = audiosDe(p)[0];
            const t = pub?.audioTrack as RemoteAudioTrack | undefined;
            return {
              contaId: p.identity,
              assinado: !!pub?.isSubscribed,
              desejado: !!pub?.isDesired,
              alvo: alvos.get(p.identity) ?? null,
              volume: t ? t.getVolume() : null,
            };
          })
        : [],
    };
  }

  return {
    iniciar(f) {
      if (rodando) return;
      rodando = true;
      fonte = f;
      window.addEventListener("pointerdown", aoGesto, true);
      window.addEventListener("keydown", aoGesto, true);
      // Sem LiveKit configurado no servidor, o mundo segue sem voz.
      void api
        .config()
        .then((c) => c.livekitUrl)
        .catch(() => "sim")
        .then((url) => {
          if (!rodando) return;
          if (!url) {
            semLivekit = true;
            publicarEstado();
            return;
          }
          timerTick = setInterval(tick, TICK_MS);
          timerRampa = setInterval(rampa, RAMPA_MS);
          tick();
        });
    },
    parar() {
      if (!rodando) return;
      rodando = false;
      if (timerTick) clearInterval(timerTick);
      if (timerRampa) clearInterval(timerRampa);
      window.removeEventListener("pointerdown", aoGesto, true);
      window.removeEventListener("keydown", aoGesto, true);
      desconectar();
      containerAudio?.remove();
      containerAudio = null;
      fonte = null;
    },
    estado: () => snapshot,
    assinar(fn) {
      assinantes.add(fn);
      return () => void assinantes.delete(fn);
    },
    alternarMicrofone() {
      preferencia = preferencia === "ligado" ? "mudo" : "ligado";
      micErro = null; // tentar de novo
      try {
        localStorage.setItem(CHAVE_MIC, preferencia);
      } catch {
        /* sem storage: só não persiste */
      }
      publicarEstado();
      tick();
    },
    depurar,
  };
}
