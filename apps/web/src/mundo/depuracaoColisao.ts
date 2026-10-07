import { TEMPLATES_LUGAR, TILE, caixaPes, type Template } from "@baguin/shared";
import Phaser from "phaser";
import { zonasDoMapa } from "./mapa";

/**
 * Só em dev (F2): mostra o que a colisão enxerga. Vermelho = sólido (paredes e bases dos Móveis),
 * azul = Zona, verde = porta, amarelo = faixa dos pés dos Avatares (a do próprio, em destaque).
 * Quem usa precisa proteger com `import.meta.env.DEV` para o bundle de produção não levar isto.
 */
const PROF = 2_000_000;

export class DepuracaoColisao {
  private fixo: Phaser.GameObjects.Graphics;
  private pes: Phaser.GameObjects.Graphics;
  private ligado = false;
  private aoTecla = (e: KeyboardEvent) => {
    if (e.code !== "F2" || e.repeat) return;
    e.preventDefault();
    this.alternar();
  };

  constructor(private cena: Phaser.Scene) {
    this.fixo = cena.add.graphics().setDepth(PROF).setVisible(false);
    this.pes = cena.add.graphics().setDepth(PROF).setVisible(false);
    window.addEventListener("keydown", this.aoTecla);
  }

  get visivel() {
    return this.ligado;
  }

  alternar() {
    this.ligado = !this.ligado;
    this.fixo.setVisible(this.ligado);
    this.pes.setVisible(this.ligado);
  }

  /** Redesenha a parte fixa (paredes, Móveis, Zonas, portas) do Lugar. */
  montar(template: Template) {
    const t = TEMPLATES_LUGAR[template];
    const g = this.fixo.clear();
    g.fillStyle(0xff2d2d, 0.38);
    t.mapa.forEach((linha, lin) =>
      [...linha].forEach((c, col) => c === "#" && g.fillRect(col * TILE, lin * TILE, TILE, TILE)),
    );
    for (const r of t.solidos) g.fillRect(r.x, r.y, r.larg, r.alt);
    g.lineStyle(1, 0xff2d2d, 0.9);
    for (const r of t.solidos) g.strokeRect(r.x + 0.5, r.y + 0.5, r.larg - 1, r.alt - 1);
    g.lineStyle(2, 0x2d7bff, 1);
    for (const z of zonasDoMapa(template))
      g.strokeRect(z.col0 * TILE + 1, z.lin0 * TILE + 1, (z.col1 - z.col0 + 1) * TILE - 2, (z.lin1 - z.lin0 + 1) * TILE - 2);
    g.fillStyle(0x2dd45a, 0.5);
    t.mapa.forEach((linha, lin) =>
      [...linha].forEach((c, col) => c >= "1" && c <= "9" && g.fillRect(col * TILE, lin * TILE, TILE, TILE)),
    );
  }

  /** Faixa dos pés de cada Avatar (pontos x, y do corpo). O primeiro é o próprio. */
  atualizar(corpos: readonly { x: number; y: number }[]) {
    if (!this.ligado) return;
    const g = this.pes.clear();
    corpos.forEach((c, i) => {
      const b = caixaPes(c.x, c.y);
      g.fillStyle(0xffe14d, i === 0 ? 0.65 : 0.4).fillRect(b.x, b.y, b.larg, b.alt);
      g.lineStyle(1, 0x000000, 0.9).strokeRect(b.x + 0.5, b.y + 0.5, b.larg - 1, b.alt - 1);
    });
  }

  destruir() {
    window.removeEventListener("keydown", this.aoTecla);
    this.fixo.destroy();
    this.pes.destroy();
  }
}
