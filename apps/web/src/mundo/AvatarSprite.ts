import { BALAO_MS, type Direcao, type Pecas } from "@baguin/shared";
import Phaser from "phaser";
import { FRAME_A, FRAME_L, QUADROS_POR_DIRECAO, ORDEM_DIRECOES, quadro, renderizarSpritesheet } from "../avatar/renderizar";

/** Ciclo de caminhada: parado, passo A, parado, passo B. */
const CICLO = [0, 1, 0, 2];
const MS_POR_QUADRO = 140;
/** O ponto (x, y) do Avatar é o centro da caixa de colisão; os pés ficam 10px abaixo. */
const PES = 10;
/** Topo do sprite, relativo ao centro. */
const TOPO = PES - FRAME_A;
const FONTE_NOME = '"Pixelify Sans", ui-monospace, monospace';
const FONTE_EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const BALAO_LARGURA = 110;
/** Resolução das texturas de texto: alta o bastante para ficar nítida com zoom 2x. */
const RES_TEXTO = 4;

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

/** Cria (uma vez) a textura do spritesheet das Peças e devolve a chave. */
function garantirTextura(scene: Phaser.Scene, contaId: string, pecasJson: string): string {
  const chave = `avatar:${contaId}:${hash(pecasJson)}`;
  if (scene.textures.exists(chave)) return chave;
  const tex = scene.textures.addCanvas(chave, renderizarSpritesheet(JSON.parse(pecasJson) as Pecas));
  if (!tex) throw new Error("falha ao criar textura do Avatar");
  for (let i = 0; i < ORDEM_DIRECOES.length * QUADROS_POR_DIRECAO; i++) {
    tex.add(i, 0, (i % QUADROS_POR_DIRECAO) * FRAME_L, Math.floor(i / QUADROS_POR_DIRECAO) * FRAME_A, FRAME_L, FRAME_A);
  }
  return chave;
}

function texto(scene: Phaser.Scene, style: Phaser.Types.GameObjects.Text.TextStyle) {
  return scene.add.text(0, 0, "", style).setResolution(RES_TEXTO);
}

/** Um Avatar no mundo: sprite + nome (ordenados por y) e indicador + Balão (sempre por cima). */
export class AvatarSprite {
  private corpo: Phaser.GameObjects.Container;
  private topo: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private indicador: Phaser.GameObjects.Text;
  private balaoBg: Phaser.GameObjects.Graphics;
  private balaoTexto: Phaser.GameObjects.Text;
  private pecasJson = "";
  private chaveTextura = "";
  private balaoAte = 0;
  private emojiAtual = "";

  constructor(
    private scene: Phaser.Scene,
    readonly contaId: string,
    nome: string,
    ehEu: boolean,
  ) {
    this.sprite = scene.add.sprite(0, PES, "__DEFAULT").setOrigin(0.5, 1);
    const rotulo = texto(scene, {
      fontFamily: FONTE_NOME,
      fontSize: "9px",
      color: ehEu ? "#ffd166" : "#ffffff",
      stroke: "#1a1424",
      strokeThickness: 2,
      padding: { x: 2, y: 2 },
    })
      .setText(nome)
      .setOrigin(0.5, 0)
      .setPosition(0, PES + 1);
    this.corpo = scene.add.container(0, 0, [this.sprite, rotulo]);

    this.indicador = texto(scene, { fontFamily: FONTE_EMOJI, fontSize: "11px", padding: { x: 2, y: 2 } }).setOrigin(0.5, 1).setPosition(0, TOPO - 1);
    this.balaoBg = scene.add.graphics();
    this.balaoTexto = texto(scene, {
      fontFamily: FONTE_NOME,
      fontSize: "8px",
      color: "#2a1f33",
      align: "center",
      padding: { x: 1, y: 1 },
      wordWrap: { width: BALAO_LARGURA, useAdvancedWrap: true },
    }).setOrigin(0.5, 1);
    this.topo = scene.add.container(0, 0, [this.indicador, this.balaoBg, this.balaoTexto]).setDepth(1e6);
    this.balaoBg.setVisible(false);
    this.balaoTexto.setVisible(false);
  }

  definirPecas(pecasJson: string) {
    if (pecasJson === this.pecasJson) return;
    this.pecasJson = pecasJson;
    this.chaveTextura = garantirTextura(this.scene, this.contaId, pecasJson);
    this.sprite.setTexture(this.chaveTextura, 0);
  }

  /** Posição em px do mundo do centro da caixa de colisão. */
  atualizar(x: number, y: number, dir: Direcao, movendo: boolean, agora: number) {
    if (!this.chaveTextura) return;
    const rx = Math.round(x);
    const ry = Math.round(y);
    const f = movendo ? CICLO[Math.floor(agora / MS_POR_QUADRO) % CICLO.length] : 0;
    this.sprite.setFrame(quadro(dir, f));
    this.corpo.setPosition(rx, ry).setDepth(ry);
    this.topo.setPosition(rx, ry);
    if (this.balaoAte && agora > this.balaoAte) this.esconderBalao();
  }

  definirIndicador(emoji: string) {
    if (emoji === this.emojiAtual) return;
    this.emojiAtual = emoji;
    this.indicador.setText(emoji);
    this.reposicionarBalao();
  }

  mostrarBalao(textoBalao: string, agora: number) {
    this.balaoAte = agora + BALAO_MS;
    this.balaoTexto.setText(textoBalao);
    this.reposicionarBalao();
    this.balaoBg.setVisible(true);
    this.balaoTexto.setVisible(true);
  }

  private esconderBalao() {
    this.balaoAte = 0;
    this.balaoBg.setVisible(false).clear();
    this.balaoTexto.setVisible(false);
  }

  /** O Balão fica acima do Indicador quando há um. */
  private reposicionarBalao() {
    if (!this.balaoAte) return;
    const fundo = TOPO - 4 - (this.emojiAtual ? 12 : 0);
    const w = this.balaoTexto.width;
    const h = this.balaoTexto.height;
    this.balaoTexto.setPosition(0, fundo - 3);
    this.balaoBg.clear().fillStyle(0xfff8e8, 1).lineStyle(1, 0x2a1f33, 1);
    this.balaoBg.fillRoundedRect(-w / 2 - 4, fundo - h - 6, w + 8, h + 6, 3);
    this.balaoBg.strokeRoundedRect(-w / 2 - 4, fundo - h - 6, w + 8, h + 6, 3);
    this.balaoBg.fillTriangle(-3, fundo, 3, fundo, 0, fundo + 4);
  }

  destruir() {
    this.corpo.destroy();
    this.topo.destroy();
  }
}
