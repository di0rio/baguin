import {
  TEMPLATES_LUGAR,
  TILE,
  VELOCIDADE,
  bloqueado,
  portaEm,
  type AvatarEstado,
  type Direcao,
  type LugarDto,
  type Template,
} from "@baguin/shared";
import Phaser from "phaser";
import { AvatarSprite } from "./AvatarSprite";
import { indicadorDe } from "./indicador";
import { desenharMapa, portasDoMapa } from "./mapa";
import type { Sala } from "./sala";
import { Teclado } from "./teclado";
import type { Voz } from "./voz";

const ENVIO_MS = 50;
const FADE_SAIDA_MS = 180;
const FADE_ENTRADA_MS = 250;
const SUAVIZACAO_OUTROS = 14; // maior = segue o servidor mais de perto
const SNAP_PX = 200;
const FONTE = '"Pixelify Sans", ui-monospace, monospace';

type Outro = { sprite: AvatarSprite; av: AvatarEstado; x: number; y: number };
type Eu = { x: number; y: number; dir: Direcao; movendo: boolean };

/** Zoom inteiro conforme o tamanho da janela (pixels do mapa ficam nítidos). */
const zoomPara = (l: number, a: number) => Math.max(1, Math.min(3, Math.floor(Math.min(l, a) / 300)));

/** Desenha o Lugar atual, os Avatares e move o próprio Avatar (predição local). */
export class LugarScene extends Phaser.Scene {
  private teclado!: Teclado;
  private template: Template | null = null;
  private decoracao: Phaser.GameObjects.GameObject[] = [];
  private avatares = new Map<string, Outro>();
  private eu: Eu | null = null;
  private euSprite: AvatarSprite | null = null;
  private cameraAlvo = { x: 0, y: 0 };
  private ativo = false;
  private portaEnviada = false;
  private msDesdeEnvio = 0;
  private enviouParado = true;
  private dirEnviada: Direcao = "baixo";
  private descartar: (() => void)[] = [];

  constructor(
    private sala: Sala,
    private voz: Voz,
  ) {
    super("lugar");
  }

  create() {
    this.teclado = new Teclado();
    this.cameras.main.setBackgroundColor("#16121e").startFollow(this.cameraAlvo, true, 1, 1);
    this.ajustarZoom();
    this.scale.on("resize", this.ajustarZoom, this);

    const s = this.sala;
    this.descartar.push(
      s.on("entrou", (lugar) => lugar && this.montarLugar(lugar)),
      s.on("saindo", () => {
        this.ativo = false;
        this.teclado.soltar();
        this.cameras.main.fadeOut(FADE_SAIDA_MS, 22, 18, 30);
      }),
      s.on("avatarEntrou", (av) => this.adicionar(av)),
      s.on("avatarSaiu", (id) => this.remover(id)),
      s.on("balao", (m) => this.avatares.get(m.contaId)?.sprite.mostrarBalao(m.texto, this.time.now)),
      s.on("corrigir", (m) => {
        if (this.eu) Object.assign(this.eu, { x: m.x, y: m.y });
      }),
    );
    // `game.destroy(true)` emite DESTROY (não SHUTDOWN); a limpeza é idempotente e vale para os dois
    let limpo = false;
    const limpar = () => {
      if (limpo) return;
      limpo = true;
      this.scale.off("resize", this.ajustarZoom, this);
      this.descartar.forEach((f) => f());
      this.teclado.destruir();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, limpar);
    this.events.once(Phaser.Scenes.Events.DESTROY, limpar);

    // a conexão pode ter terminado antes da cena existir
    if (s.lugar) {
      this.montarLugar(s.lugar);
      for (const av of s.avatares.values()) this.adicionar(av);
    }
  }

  private ajustarZoom() {
    this.cameras.main.setZoom(zoomPara(this.scale.width, this.scale.height));
  }

  // ---- montagem do Lugar ----

  private montarLugar(lugar: LugarDto) {
    this.limparLugar();
    this.template = lugar.template;
    const modelo = TEMPLATES_LUGAR[lugar.template];
    const chave = `mapa:${lugar.template}`;
    if (!this.textures.exists(chave)) this.textures.addCanvas(chave, desenharMapa(lugar.template));
    const larg = modelo.mapa[0].length * TILE;
    const alt = modelo.mapa.length * TILE;
    this.decoracao.push(this.add.image(0, 0, chave).setOrigin(0).setDepth(-1));
    this.cameras.main.setBounds(0, 0, larg, alt);

    const nomeDe = (destino: Template) => this.sala.nomeDoLugar(destino);
    for (const p of portasDoMapa(lugar.template, nomeDe)) {
      const cx = p.col * TILE + TILE / 2;
      const cy = p.lin * TILE + TILE / 2;
      const [x, y, ox, oy] =
        p.lado === "baixo" ? [cx, cy + TILE / 2 + 3, 0.5, 0]
        : p.lado === "cima" ? [cx, cy - TILE / 2 - 3, 0.5, 1]
        : p.lado === "direita" ? [cx + TILE / 2 + 3, cy, 0, 0.5]
        : [cx - TILE / 2 - 3, cy, 1, 0.5];
      this.decoracao.push(
        this.add
          .text(x, y, `→ ${p.texto}`, {
            fontFamily: FONTE,
            fontSize: "8px",
            color: "#ffe9b0",
            backgroundColor: "#1a1424cc",
            padding: { x: 3, y: 1 },
          })
          .setResolution(4)
          .setOrigin(ox, oy)
          .setDepth(0),
      );
    }

    this.cameras.main.fadeIn(FADE_ENTRADA_MS, 22, 18, 30);
    this.ativo = true;
    this.portaEnviada = false;
    this.msDesdeEnvio = 0;
    this.enviouParado = true;
  }

  private limparLugar() {
    this.decoracao.forEach((o) => o.destroy());
    this.decoracao = [];
    for (const o of this.avatares.values()) o.sprite.destruir();
    this.avatares.clear();
    this.euSprite = null;
    this.eu = null;
    this.sala.eu = null;
  }

  // ---- avatares ----

  private adicionar(av: AvatarEstado) {
    this.avatares.get(av.contaId)?.sprite.destruir();
    const ehEu = av.contaId === this.sala.contaId;
    const sprite = new AvatarSprite(this, av.contaId, av.nome, ehEu);
    sprite.definirPecas(av.pecas);
    this.avatares.set(av.contaId, { sprite, av, x: av.x, y: av.y });
    if (ehEu) {
      this.euSprite = sprite;
      this.eu = { x: av.x, y: av.y, dir: av.dir, movendo: false };
      this.dirEnviada = av.dir;
      const naPorta = this.template && portaEm(this.template, av.x, av.y);
      this.portaEnviada = !!naPorta; // chegada em cima de porta não dispara passagem
      this.cameraAlvo.x = av.x;
      this.cameraAlvo.y = av.y;
    }
  }

  private remover(contaId: string) {
    this.avatares.get(contaId)?.sprite.destruir();
    this.avatares.delete(contaId);
    if (contaId === this.sala.contaId) {
      this.euSprite = null;
      this.eu = null;
      this.sala.eu = null;
    }
  }

  // ---- quadro a quadro ----

  update(tempo: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.1);
    if (this.eu && this.template) this.moverEu(this.eu, this.template, dt, delta);

    const agora = Date.now();
    const falando = this.voz.estado().falando;
    const k = 1 - Math.exp(-dt * SUAVIZACAO_OUTROS);
    for (const [id, o] of this.avatares) {
      o.sprite.definirPecas(o.av.pecas);
      o.sprite.definirIndicador(indicadorDe(o.av, falando.has(id), agora));
      if (id === this.sala.contaId && this.eu) {
        o.sprite.atualizar(this.eu.x, this.eu.y, this.eu.dir, this.eu.movendo, tempo);
        continue;
      }
      if (Math.hypot(o.av.x - o.x, o.av.y - o.y) > SNAP_PX) {
        o.x = o.av.x;
        o.y = o.av.y;
      }
      const falta = Math.hypot(o.av.x - o.x, o.av.y - o.y);
      o.x += (o.av.x - o.x) * k;
      o.y += (o.av.y - o.y) * k;
      const dir = o.av.dir as Direcao;
      o.sprite.atualizar(o.x, o.y, dir, o.av.movendo || falta > 1, tempo);
    }
    if (this.eu) {
      this.cameraAlvo.x = Math.round(this.eu.x);
      this.cameraAlvo.y = Math.round(this.eu.y);
    }
  }

  private moverEu(eu: Eu, template: Template, dt: number, delta: number) {
    const { dx, dy } = this.ativo ? this.teclado.eixos() : { dx: 0, dy: 0 };
    let moveu = false;
    if (dx || dy) {
      const norma = Math.hypot(dx, dy);
      const passo = VELOCIDADE * dt;
      // eixos separados: encostar numa parede desliza ao longo dela
      const nx = eu.x + (dx / norma) * passo;
      if (!bloqueado(template, nx, eu.y)) {
        moveu ||= nx !== eu.x;
        eu.x = nx;
      }
      const ny = eu.y + (dy / norma) * passo;
      if (!bloqueado(template, eu.x, ny)) {
        moveu ||= ny !== eu.y;
        eu.y = ny;
      }
      eu.dir = direcaoDe(dx, dy, eu.dir);
    }
    eu.movendo = moveu;
    this.sala.eu = { x: eu.x, y: eu.y };

    // porta: dispara uma vez por entrada no tile
    const porta = portaEm(template, eu.x, eu.y);
    if (porta && !this.portaEnviada && this.ativo) {
      this.portaEnviada = true;
      this.enviar(eu); // o servidor confere a posição: ela precisa chegar antes da porta
      this.sala.porta();
    } else if (!porta) {
      this.portaEnviada = false;
    }

    // envio: a cada ENVIO_MS enquanto anda + uma vez ao parar (ou ao virar parado)
    this.msDesdeEnvio += delta;
    if (moveu) {
      this.enviouParado = false;
      if (this.msDesdeEnvio >= ENVIO_MS) this.enviar(eu);
    } else if (!this.enviouParado || eu.dir !== this.dirEnviada) {
      this.enviouParado = true;
      this.enviar(eu);
    }
  }

  private enviar(eu: Eu) {
    this.msDesdeEnvio = 0;
    this.dirEnviada = eu.dir;
    this.sala.mover({ x: eu.x, y: eu.y, dir: eu.dir, movendo: eu.movendo });
  }
}

function direcaoDe(dx: number, dy: number, atual: Direcao): Direcao {
  if (dy === 0) return dx > 0 ? "direita" : "esquerda";
  if (dx === 0) return dy > 0 ? "baixo" : "cima";
  // diagonal: mantém o eixo atual se ainda for um dos pedidos
  const horizontal = atual === "direita" || atual === "esquerda";
  if (horizontal) return dx > 0 ? "direita" : "esquerda";
  return dy > 0 ? "baixo" : "cima";
}
