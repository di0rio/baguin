import Phaser from "phaser";
import type { StatusAvatar } from "./indicador";
import { hashTexto } from "./pixel";

/**
 * Textos do mundo (etiquetas de nome, Balões, rótulos de Zona e de porta) desenhados em canvas com
 * Ubuntu, em resolução alta e filtro linear: ficam nítidos com o zoom inteiro da câmera e sem serrilhado.
 */

export const FONTE = 'Ubuntu, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const FONTE_EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Espera o Ubuntu (até 1,5 s) para não desenhar texto com a fonte reserva. */
export function fontesProntas(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.race([
    Promise.all([
      document.fonts.load("500 12px Ubuntu"),
      document.fonts.load("700 11px Ubuntu"),
    ]),
    new Promise((r) => setTimeout(r, 1500)),
  ])
    .then(() => undefined)
    .catch(() => undefined);
}

/** Fator de supersampling do texto: cobre o zoom da câmera e a densidade da tela. */
export const resolucaoTexto = (zoom: number) => Math.min(6, Math.max(2, Math.ceil(zoom * (window.devicePixelRatio || 1))));

/** Escala do texto no mundo: mantém etiquetas, Balões e rótulos com tamanho de tela estável (~13px) em qualquer zoom. */
export const escalaTexto = (zoom: number) => Math.min(1, 1.3 / zoom);

export type Textura = { chave: string; largura: number; altura: number };

type Desenho = (ctx: CanvasRenderingContext2D, largura: number, altura: number) => void;

function registrar(scene: Phaser.Scene, chave: string, largura: number, altura: number, res: number, desenhar: Desenho): Textura {
  if (!scene.textures.exists(chave)) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(largura * res);
    canvas.height = Math.ceil(altura * res);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(res, res);
    desenhar(ctx, largura, altura);
    const tex = scene.textures.addCanvas(chave, canvas);
    tex?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return { chave, largura, altura };
}

function caminhoRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fonte(ctx: CanvasRenderingContext2D, peso: number, px: number) {
  ctx.font = `${peso} ${px}px ${FONTE}`;
  ctx.textBaseline = "alphabetic";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
}

const medidor = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (peso: number, px: number) => {
    ctx ??= document.createElement("canvas").getContext("2d")!;
    fonte(ctx, peso, px);
    return ctx;
  };
})();

function truncar(texto: string, max: number, peso: number, px: number): string {
  const m = medidor(peso, px);
  if (m.measureText(texto).width <= max) return texto;
  let t = texto;
  while (t.length > 1 && m.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

// ---------------------------------------------------------------- etiqueta de nome

const COR_STATUS: Record<StatusAvatar, string> = { online: "#2FB67C", ausente: "#F5A524", naoPerturbe: "#E5484D" };

/** Pílula escura translúcida: bolinha de status, nome (Ubuntu 700) e, se houver, o Indicador de atividade. */
export function etiquetaNome(
  scene: Phaser.Scene,
  { nome, status, icone, ehEu, res }: { nome: string; status: StatusAvatar; icone: string; ehEu: boolean; res: number },
): Textura {
  const PX = 11;
  const H = 18;
  const texto = truncar(nome, 120, 700, PX);
  const larguraTexto = medidor(700, PX).measureText(texto).width;
  const larguraIcone = icone ? 14 : 0;
  const W = Math.ceil(8 + 6 + 5 + larguraTexto + (icone ? 4 + larguraIcone : 0) + 8);
  const chave = `etq:${hashTexto(`${texto}|${status}|${icone}|${ehEu}`).toString(36)}:${res}`;
  return registrar(scene, chave, W + 4, H + 4, res, (ctx) => {
    ctx.translate(2, 2);
    ctx.shadowColor = "rgba(20,20,40,0.28)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = "rgba(28,30,44,0.82)";
    caminhoRedondo(ctx, 0, 0, W, H, H / 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1;
    ctx.strokeStyle = ehEu ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)";
    caminhoRedondo(ctx, 0.5, 0.5, W - 1, H - 1, (H - 1) / 2);
    ctx.stroke();
    // bolinha de status
    ctx.fillStyle = COR_STATUS[status];
    ctx.beginPath();
    ctx.arc(11, H / 2, 3.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.75;
    ctx.stroke();
    // nome
    fonte(ctx, 700, PX);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(texto, 19, H / 2 + 3.9);
    if (icone) {
      ctx.font = `10px ${FONTE_EMOJI}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(icone, 19 + larguraTexto + 4, H / 2 + 3.6);
    }
  });
}

// ---------------------------------------------------------------- balão

export type TexturaBalao = Textura & { origemY: number };

/** Quantos Balões usam cada textura: ela só é removida quando ninguém mais a usa (mensagens não se acumulam na memória). */
const usoBalao = new Map<string, number>();

export function soltarBalao(scene: Phaser.Scene, chave: string) {
  const n = (usoBalao.get(chave) ?? 1) - 1;
  if (n > 0) {
    usoBalao.set(chave, n);
    return;
  }
  usoBalao.delete(chave);
  if (scene.textures.exists(chave)) scene.textures.remove(chave);
}

function quebrar(texto: string, max: number, peso: number, px: number): string[] {
  const m = medidor(peso, px);
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      // palavra maior que a linha: quebra no meio
      let resto = palavra;
      while (m.measureText(resto).width > max) {
        let n = resto.length;
        while (n > 1 && m.measureText(resto.slice(0, n)).width > max) n--;
        if (atual) {
          linhas.push(atual);
          atual = "";
        }
        linhas.push(resto.slice(0, n));
        resto = resto.slice(n);
      }
      const tenta = atual ? `${atual} ${resto}` : resto;
      if (m.measureText(tenta).width > max && atual) {
        linhas.push(atual);
        atual = resto;
      } else atual = tenta;
    }
    linhas.push(atual);
  }
  return linhas.slice(0, 8);
}

/** Bolha branca com cauda e sombra suave, texto Ubuntu 500 `#292D4C`, largura máxima ~200px. */
export function balao(scene: Phaser.Scene, texto: string, res: number): TexturaBalao {
  const PX = 12;
  const LINHA = 16;
  const PAD_X = 10;
  const PAD_Y = 7;
  const SOMBRA = 10;
  const CAUDA = 6;
  const linhas = quebrar(texto, 200 - PAD_X * 2, 500, PX);
  const m = medidor(500, PX);
  const larguraTexto = Math.max(...linhas.map((l) => m.measureText(l).width));
  const bw = Math.max(28, Math.ceil(larguraTexto + PAD_X * 2));
  const bh = linhas.length * LINHA + PAD_Y * 2 - 2;
  const W = bw + SOMBRA * 2;
  const H = bh + CAUDA + SOMBRA * 2;
  const chave = `bal:${hashTexto(texto).toString(36)}:${res}`;
  const tex = registrar(scene, chave, W, H, res, (ctx) => {
    ctx.translate(SOMBRA, SOMBRA);
    const corpo = () => {
      caminhoRedondo(ctx, 0, 0, bw, bh, 12);
      ctx.moveTo(bw / 2 - 6, bh - 0.5);
      ctx.lineTo(bw / 2, bh + CAUDA);
      ctx.lineTo(bw / 2 + 6, bh - 0.5);
      ctx.closePath();
    };
    ctx.shadowColor = "rgba(41,45,76,0.24)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#FFFFFF";
    corpo();
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#FFFFFF";
    corpo();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(41,45,76,0.07)";
    corpo();
    ctx.stroke();
    fonte(ctx, 500, PX);
    ctx.fillStyle = "#292D4C";
    linhas.forEach((l, i) => ctx.fillText(l, PAD_X, PAD_Y + 11 + i * LINHA - 1));
  });
  usoBalao.set(chave, (usoBalao.get(chave) ?? 0) + 1);
  return { ...tex, origemY: H - SOMBRA };
}

// ---------------------------------------------------------------- rótulos no chão

/** Pílula translúcida clara (Zona, porta): sobre o chão do mapa. */
export function pilulaClara(scene: Phaser.Scene, texto: string, res: number, opcoes: { forte?: boolean } = {}): Textura {
  const PX = 10;
  const H = 16;
  const t = truncar(texto, 160, 700, PX);
  const tw = medidor(700, PX).measureText(t).width;
  const W = Math.ceil(tw + 16);
  const chave = `pil:${hashTexto(`${t}|${opcoes.forte}`).toString(36)}:${res}`;
  return registrar(scene, chave, W + 4, H + 4, res, (ctx) => {
    ctx.translate(2, 2);
    ctx.shadowColor = "rgba(41,45,76,0.14)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = opcoes.forte ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.68)";
    caminhoRedondo(ctx, 0, 0, W, H, H / 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1;
    caminhoRedondo(ctx, 0.5, 0.5, W - 1, H - 1, (H - 1) / 2);
    ctx.stroke();
    fonte(ctx, 700, PX);
    ctx.fillStyle = "#4B4F73";
    ctx.fillText(t, 8, H / 2 + 3.4);
  });
}

/** Remove texturas de etiqueta/rótulo feitas para outra resolução (depois que tudo foi refeito na nova). */
export function podarTexturasDeTexto(scene: Phaser.Scene, res: number) {
  for (const chave of scene.textures.getTextureKeys()) {
    if (/^(etq|pil):/.test(chave) && !chave.endsWith(`:${res}`)) scene.textures.remove(chave);
  }
}
