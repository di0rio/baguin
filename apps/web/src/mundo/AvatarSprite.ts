import { BALAO_MS, type Direcao, type Pecas } from "@baguin/shared";
import Phaser from "phaser";
import { FRAME_A, FRAME_L, QUADROS_POR_DIRECAO, ORDEM_DIRECOES, quadro, renderizarSpritesheet } from "../avatar/renderizar";
import type { StatusAvatar } from "./indicador";
import { balao, etiquetaNome, soltarBalao, type Textura, type TexturaBalao } from "./rotulos";

/** Ciclo de caminhada: parado, passo A, parado, passo B. */
const CICLO = [0, 1, 0, 2];
const MS_POR_QUADRO = 140;
/** O ponto (x, y) do Avatar é o centro da caixa de colisão; os pés ficam 10px abaixo. */
const PES = 10;
/** Topo do sprite, relativo ao centro. */
const TOPO = PES - FRAME_A;
/** A etiqueta de nome fica logo acima da cabeça; a pílula ocupa 18px dentro de uma textura de 22px. */
const ETIQUETA_BASE = TOPO;
const ETIQUETA_ALTURA_PILULA = 18;
const BALAO_ENTRADA_MS = 160;
const BALAO_SAIDA_MS = 120;
const reduzirMovimento = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

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

/** Um Avatar no mundo: sprite (ordenado por y) e, por cima de tudo, etiqueta de nome + Balão. */
export class AvatarSprite {
  private corpo: Phaser.GameObjects.Container;
  private topo: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private etiqueta: Phaser.GameObjects.Image;
  private balaoImg: Phaser.GameObjects.Image | null = null;
  private balaoTween: Phaser.Tweens.Tween | null = null;
  private balaoTexto = "";
  private balaoChave = "";
  private pecasJson = "";
  private chaveTextura = "";
  private balaoAte = 0;
  private icone = "";
  private status: StatusAvatar = "online";
  private res: number;

  constructor(
    private scene: Phaser.Scene,
    readonly contaId: string,
    private nome: string,
    private ehEu: boolean,
    res: number,
  ) {
    this.res = res;
    this.sprite = scene.add.sprite(0, PES, "__DEFAULT").setOrigin(0.5, 1);
    this.corpo = scene.add.container(0, 0, [this.sprite]);
    this.etiqueta = scene.add.image(0, ETIQUETA_BASE, "__DEFAULT").setOrigin(0.5, 1);
    this.topo = scene.add.container(0, 0, [this.etiqueta]).setDepth(1e6);
    this.refazerEtiqueta();
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

  /** Bolinha de status e Indicador de atividade (emoji, "" = nenhum) dentro da pílula do nome. */
  definirEstado(status: StatusAvatar, emoji: string) {
    if (status === this.status && emoji === this.icone) return;
    this.status = status;
    this.icone = emoji;
    this.refazerEtiqueta();
  }

  /** Muda a resolução das texturas de texto (o zoom da câmera mudou). */
  definirResolucao(res: number) {
    if (res === this.res) return;
    this.res = res;
    this.refazerEtiqueta();
    if (this.balaoImg) this.aplicarBalao(this.balaoTexto, false);
  }

  mostrarBalao(texto: string, agora: number) {
    this.balaoAte = agora + BALAO_MS;
    this.aplicarBalao(texto, true);
  }

  private refazerEtiqueta() {
    const t: Textura = etiquetaNome(this.scene, { nome: this.nome, status: this.status, icone: this.icone, ehEu: this.ehEu, res: this.res });
    this.etiqueta.setTexture(t.chave).setDisplaySize(t.largura, t.altura);
    this.reposicionarBalao();
  }

  /** Novo Balão substitui o anterior; entra com fade + escala 0.96 a partir da cauda. */
  private aplicarBalao(texto: string, animar: boolean) {
    this.balaoTween?.stop();
    this.balaoTween = null;
    this.descartarBalao();
    this.balaoTexto = texto;
    const t: TexturaBalao = balao(this.scene, texto, this.res);
    this.balaoChave = t.chave;
    this.balaoImg = this.scene.add
      .image(0, this.yBalao(), t.chave)
      .setOrigin(0.5, t.origemY / t.altura)
      .setDisplaySize(t.largura, t.altura);
    this.topo.add(this.balaoImg);
    if (!animar) return;
    const { scaleX, scaleY } = this.balaoImg;
    if (reduzirMovimento()) {
      this.balaoImg.setAlpha(0);
      this.balaoTween = this.scene.tweens.add({ targets: this.balaoImg, alpha: 1, duration: BALAO_ENTRADA_MS, ease: "Quint.easeOut" });
      return;
    }
    this.balaoImg.setAlpha(0).setScale(scaleX * 0.96, scaleY * 0.96);
    this.balaoTween = this.scene.tweens.add({
      targets: this.balaoImg,
      alpha: 1,
      scaleX,
      scaleY,
      duration: BALAO_ENTRADA_MS,
      ease: "Quint.easeOut", // ~ cubic-bezier(0.23, 1, 0.32, 1)
    });
  }

  private esconderBalao() {
    this.balaoAte = 0;
    const img = this.balaoImg;
    if (!img) return;
    const chave = this.balaoChave;
    this.balaoTween?.stop();
    this.balaoImg = null;
    this.balaoChave = "";
    this.balaoTween = this.scene.tweens.add({
      targets: img,
      alpha: 0,
      duration: BALAO_SAIDA_MS,
      ease: "Quad.easeOut",
      onComplete: () => {
        img.destroy();
        soltarBalao(this.scene, chave);
      },
    });
  }

  private descartarBalao() {
    if (!this.balaoImg) return;
    this.balaoImg.destroy();
    this.balaoImg = null;
    soltarBalao(this.scene, this.balaoChave);
    this.balaoChave = "";
  }

  /** Ponta da cauda do Balão: logo acima da pílula do nome. */
  private yBalao() {
    return ETIQUETA_BASE - (ETIQUETA_ALTURA_PILULA + 4) - 2;
  }

  private reposicionarBalao() {
    this.balaoImg?.setY(this.yBalao());
  }

  destruir() {
    this.balaoTween?.stop();
    this.descartarBalao();
    this.corpo.destroy();
    this.topo.destroy();
  }
}
