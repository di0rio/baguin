import { BALAO_MS, PES, type Direcao, type Pecas } from "@baguin/shared";
import Phaser from "phaser";
import { ESPESSURA_MUNDO, SOLA, SOLA_Y, TOPO_Y, UNIDADE, montarAvatar, poseDe, renderizarParte, vistaDe, type Desenho, type ParteId, type Vista } from "../avatar/renderizar";
import type { StatusAvatar } from "./indicador";
import { balao, etiquetaNome, soltarBalao, type Textura, type TexturaBalao } from "./rotulos";

// O ponto (x, y) do Avatar é o centro do corpo; os pés (sola) ficam PES px abaixo, e é aí que ele pisa.
/** Topo da cabeça mais alta, relativo ao centro. */
const TOPO = PES - SOLA_Y + TOPO_Y;
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

/** Px de textura por px lógico do mundo: dá para o zoom máximo (3) em tela 2x sem borrar. */
const RES_TEXTURA = 6;

type VistaMarionete = {
  raiz: Phaser.GameObjects.Container;
  superior: Phaser.GameObjects.Container;
  /** Posição de repouso de cada parte (px, relativa ao pai), para somar a pose. */
  partes: { img: Phaser.GameObjects.Image; id: ParteId; x: number; y: number }[];
  base: { x: number; y: number };
};

/** Marionete de uma vista: uma textura por parte, em contêineres que o Phaser move e gira a cada quadro. */
function montarVista(scene: Phaser.Scene, base: string, desenho: Desenho): VistaMarionete {
  const q = desenho.quadril;
  const raiz = scene.add.container(0, PES);
  const superior = scene.add.container((q.x - SOLA.x) / UNIDADE, (q.y - SOLA.y) / UNIDADE);
  const partes: VistaMarionete["partes"] = [];
  let superiorNoLugar = false;
  for (const parte of desenho.partes) {
    const chave = `${base}:${desenho.vista}:${parte.id}`;
    if (!scene.textures.exists(chave)) {
      const tex = scene.textures.addCanvas(chave, renderizarParte(parte, RES_TEXTURA / UNIDADE, ESPESSURA_MUNDO));
      tex?.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const { x0, y0, x1, y1 } = parte.caixa;
    const pai = parte.grupo === "superior" ? q : SOLA;
    const x = (parte.pivo.x - pai.x) / UNIDADE;
    const y = (parte.pivo.y - pai.y) / UNIDADE;
    const img = scene.add
      .image(x, y, chave)
      .setOrigin((parte.pivo.x - x0) / (x1 - x0), (parte.pivo.y - y0) / (y1 - y0))
      .setScale(1 / RES_TEXTURA);
    if (parte.grupo === "superior") {
      if (!superiorNoLugar) raiz.add(superior);
      superiorNoLugar = true;
      superior.add(img);
    } else {
      raiz.add(img);
    }
    partes.push({ img, id: parte.id, x, y });
  }
  return { raiz, superior, partes, base: { x: superior.x, y: superior.y } };
}

/** Um Avatar no mundo: marionete (ordenada por y) e, por cima de tudo, etiqueta de nome + Balão. */
export class AvatarSprite {
  private corpo: Phaser.GameObjects.Container;
  private topo: Phaser.GameObjects.Container;
  private etiqueta: Phaser.GameObjects.Image;
  private balaoImg: Phaser.GameObjects.Image | null = null;
  private balaoTween: Phaser.Tweens.Tween | null = null;
  private balaoTexto = "";
  private balaoChave = "";
  private pecasJson = "";
  private pecas: Pecas | null = null;
  private vistas = new Map<Vista, VistaMarionete>();
  private balaoAte = 0;
  private icone = "";
  private status: StatusAvatar = "online";
  private res: number;
  private escala = 1;

  constructor(
    private scene: Phaser.Scene,
    readonly contaId: string,
    private nome: string,
    private ehEu: boolean,
    res: number,
    escala: number,
  ) {
    this.res = res;
    this.escala = escala;
    this.corpo = scene.add.container(0, 0);
    this.etiqueta = scene.add.image(0, ETIQUETA_BASE, "__DEFAULT").setOrigin(0.5, 1);
    this.topo = scene.add.container(0, 0, [this.etiqueta]).setDepth(1e6);
    this.refazerEtiqueta();
  }

  definirPecas(pecasJson: string) {
    if (pecasJson === this.pecasJson) return;
    this.limparVistas();
    this.pecasJson = pecasJson;
    this.pecas = JSON.parse(pecasJson) as Pecas;
  }

  /** Posição em px do mundo do centro do corpo (os pés ficam `PES` abaixo). */
  atualizar(x: number, y: number, dir: Direcao, movendo: boolean, agora: number) {
    if (!this.pecas) return;
    const ry = Math.round(y);
    const { vista, espelhar } = vistaDe(dir);
    let v = this.vistas.get(vista);
    if (!v) {
      v = montarVista(this.scene, `avatar:${this.contaId}:${hash(this.pecasJson)}`, montarAvatar(this.pecas, vista));
      this.corpo.add(v.raiz);
      this.vistas.set(vista, v);
    }
    for (const [k, o] of this.vistas) o.raiz.setVisible(k === vista);
    v.raiz.setScale(espelhar ? -1 : 1, 1);
    const pose = poseDe(movendo ? "andando" : "parado", agora, vista, reduzirMovimento());
    v.superior.setPosition(v.base.x + pose.superior.dx / UNIDADE, v.base.y + pose.superior.dy / UNIDADE).setRotation(pose.superior.rot);
    for (const p of v.partes) {
      const t = pose.partes[p.id];
      p.img.setPosition(p.x + (t?.dx ?? 0) / UNIDADE, p.y + (t?.dy ?? 0) / UNIDADE).setRotation(t?.rot ?? 0);
    }
    this.corpo.setPosition(x, y).setDepth(ry + PES); // profundidade pela sola, como os Móveis (pela base)
    this.topo.setPosition(Math.round(x), ry);
    if (this.balaoAte && agora > this.balaoAte) this.esconderBalao();
  }

  /** Solta as vistas e as texturas das Peças anteriores. */
  private limparVistas() {
    for (const v of this.vistas.values()) v.raiz.destroy();
    this.vistas.clear();
    const prefixo = `avatar:${this.contaId}:${hash(this.pecasJson)}:`;
    for (const k of this.scene.textures.getTextureKeys()) if (this.pecasJson && k.startsWith(prefixo)) this.scene.textures.remove(k);
  }

  /** Bolinha de status e Indicador de atividade (emoji, "" = nenhum) dentro da pílula do nome. */
  definirEstado(status: StatusAvatar, emoji: string) {
    if (status === this.status && emoji === this.icone) return;
    this.status = status;
    this.icone = emoji;
    this.refazerEtiqueta();
  }

  /** Muda resolução e escala do texto (o zoom da câmera mudou). */
  definirResolucao(res: number, escala: number) {
    if (res === this.res && escala === this.escala) return;
    this.res = res;
    this.escala = escala;
    this.refazerEtiqueta();
    if (this.balaoImg) this.aplicarBalao(this.balaoTexto, false);
  }

  mostrarBalao(texto: string, agora: number) {
    this.balaoAte = agora + BALAO_MS;
    this.aplicarBalao(texto, true);
  }

  private refazerEtiqueta() {
    const t: Textura = etiquetaNome(this.scene, { nome: this.nome, status: this.status, icone: this.icone, ehEu: this.ehEu, res: this.res });
    this.etiqueta.setTexture(t.chave).setDisplaySize(t.largura * this.escala, t.altura * this.escala);
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
      .setDisplaySize(t.largura * this.escala, t.altura * this.escala);
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
    return ETIQUETA_BASE - (ETIQUETA_ALTURA_PILULA + 4) * this.escala - 2;
  }

  private reposicionarBalao() {
    this.balaoImg?.setY(this.yBalao());
  }

  destruir() {
    this.balaoTween?.stop();
    this.descartarBalao();
    this.limparVistas();
    this.corpo.destroy();
    this.topo.destroy();
  }
}
