import type { EspacoDetalheDto } from "@baguin/shared";
import Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSessao } from "../sessao";
import { Hud } from "./hud/Hud";
import { LugarScene, type Tela } from "./LugarScene";
import { MUNDO } from "./paleta";
import { Sala } from "./sala";
import { densidade, fontesProntas } from "./rotulos";
import { criarVoz, type Voz } from "./voz";

/** O mundo do Espaço: cena Phaser (canvas) + HUD React por cima. */
export function Mundo({ detalhe }: { detalhe: EspacoDetalheDto }) {
  const { eu } = useSessao();
  const nav = useNavigate();
  const palco = useRef<HTMLDivElement>(null);
  const [nucleo, setNucleo] = useState<{ sala: Sala; voz: Voz } | null>(null);
  const contaId = eu?.conta.id;
  const espacoId = detalhe.espaco.id;

  useEffect(() => {
    const el = palco.current;
    if (!contaId || !el) return;
    const sala = new Sala(espacoId, contaId, detalhe.lugares);
    const voz = criarVoz();
    voz.iniciar(sala.fonte());
    const saiu = sala.on("expulso", (tipo) =>
      nav("/", { replace: true, state: { aviso: tipo === "banido" ? "Você foi banido do Espaço." : "Você foi removido do Espaço." } }),
    );
    // Cenário em vetor: o canvas tem a densidade de pixels da tela (sem `pixelArt`, sem zoom inteiro) e o CSS o encolhe de volta.
    const tela: Tela = { dens: densidade() };
    const medir = () => ({ w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight) });
    const inicial = medir();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: el,
      backgroundColor: MUNDO.fora,
      scale: { mode: Phaser.Scale.NONE, width: Math.round(inicial.w * tela.dens), height: Math.round(inicial.h * tela.dens) },
      audio: { noAudio: true },
      disableContextMenu: true,
      scene: new LugarScene(sala, voz, tela),
    });
    const ajustar = () => {
      tela.dens = densidade();
      const { w, h } = medir();
      game.scale.resize(Math.round(w * tela.dens), Math.round(h * tela.dens));
      game.canvas.style.width = `${w}px`;
      game.canvas.style.height = `${h}px`;
    };
    game.canvas.style.width = `${inicial.w}px`;
    game.canvas.style.height = `${inicial.h}px`;
    const observador = new ResizeObserver(ajustar);
    observador.observe(el);
    let cancelado = false;
    void fontesProntas().then(() => {
      if (!cancelado) sala.iniciar();
    });
    if (import.meta.env.DEV) Object.assign(window, { __baguin: { sala, game, voz } }); // ajuda de depuração
    setNucleo({ sala, voz });

    return () => {
      cancelado = true;
      saiu();
      voz.parar();
      sala.dispose(); // sai da room (e cancela um join ainda em andamento)
      observador.disconnect();
      game.destroy(true);
      setNucleo(null);
    };
    // detalhe.lugares só muda com o Espaço
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contaId, espacoId, nav]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: MUNDO.fora }}>
      <div className="absolute inset-0 [&_canvas]:block" ref={palco} />
      {nucleo && <Hud sala={nucleo.sala} voz={nucleo.voz} detalhe={detalhe} />}
    </div>
  );
}
