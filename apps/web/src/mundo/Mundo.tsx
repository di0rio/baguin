import type { EspacoDetalheDto } from "@baguin/shared";
import Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSessao } from "../sessao";
import { Hud } from "./hud/Hud";
import { LugarScene } from "./LugarScene";
import { Sala } from "./sala";
import { criarVoz, type Voz } from "./voz";
import "./mundo.css";

/** Espera a fonte dos rótulos (até 1,5 s) para o Phaser não desenhar texto com fonte reserva. */
const fontesProntas = () =>
  Promise.race([
    Promise.all([document.fonts.load("500 12px Inter"), document.fonts.load("600 12px Inter")]),
    new Promise((r) => setTimeout(r, 1500)),
  ]).catch(() => {});

/** O mundo do Espaço: cena Phaser (canvas) + HUD React por cima. */
export function Mundo({ detalhe }: { detalhe: EspacoDetalheDto }) {
  const { eu } = useSessao();
  const nav = useNavigate();
  const palco = useRef<HTMLDivElement>(null);
  const [nucleo, setNucleo] = useState<{ sala: Sala; voz: Voz } | null>(null);
  const contaId = eu?.conta.id;
  const espacoId = detalhe.espaco.id;

  useEffect(() => {
    if (!contaId || !palco.current) return;
    const sala = new Sala(espacoId, contaId, detalhe.lugares);
    const voz = criarVoz();
    voz.iniciar(sala.fonte());
    const saiu = sala.on("expulso", (tipo) =>
      nav("/", { replace: true, state: { aviso: tipo === "banido" ? "Você foi banido do Espaço." : "Você foi removido do Espaço." } }),
    );
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: palco.current,
      pixelArt: true,
      backgroundColor: "#16121e",
      scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
      audio: { noAudio: true },
      disableContextMenu: true,
      scene: new LugarScene(sala, voz),
    });
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
      game.destroy(true);
      setNucleo(null);
    };
    // detalhe.lugares só muda com o Espaço
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contaId, espacoId, nav]);

  return (
    <div className="mundo">
      <div className="mundo-palco" ref={palco} />
      {nucleo && <Hud sala={nucleo.sala} voz={nucleo.voz} detalhe={detalhe} />}
    </div>
  );
}
