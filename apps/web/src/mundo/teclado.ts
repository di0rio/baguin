const CIMA = ["ArrowUp", "KeyW"];
const BAIXO = ["ArrowDown", "KeyS"];
const ESQUERDA = ["ArrowLeft", "KeyA"];
const DIREITA = ["ArrowRight", "KeyD"];
const MOVIMENTO = new Set([...CIMA, ...BAIXO, ...ESQUERDA, ...DIREITA]);

const emCampoDeTexto = (alvo: EventTarget | null) =>
  alvo instanceof HTMLElement && (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName));

/**
 * Teclas de movimento (setas/WASD). Ignora eventos vindos de campos de texto e solta tudo ao
 * focar um campo ou perder o foco da janela, para o Avatar não ficar "andando sozinho".
 */
export class Teclado {
  private presas = new Set<string>();
  private limpar: () => void;

  constructor() {
    const baixo = (e: KeyboardEvent) => {
      if (emCampoDeTexto(e.target) || e.ctrlKey || e.metaKey || e.altKey || !MOVIMENTO.has(e.code)) return;
      e.preventDefault();
      this.presas.add(e.code);
    };
    const cima = (e: KeyboardEvent) => void this.presas.delete(e.code);
    const soltarTudo = () => this.presas.clear();
    window.addEventListener("keydown", baixo);
    window.addEventListener("keyup", cima);
    window.addEventListener("blur", soltarTudo);
    window.addEventListener("focusin", soltarTudo);
    this.limpar = () => {
      window.removeEventListener("keydown", baixo);
      window.removeEventListener("keyup", cima);
      window.removeEventListener("blur", soltarTudo);
      window.removeEventListener("focusin", soltarTudo);
    };
  }

  /** Direção pedida, cada eixo em -1, 0 ou 1. */
  eixos(): { dx: number; dy: number } {
    const algum = (teclas: string[]) => teclas.some((t) => this.presas.has(t));
    return {
      dx: (algum(DIREITA) ? 1 : 0) - (algum(ESQUERDA) ? 1 : 0),
      dy: (algum(BAIXO) ? 1 : 0) - (algum(CIMA) ? 1 : 0),
    };
  }

  soltar() {
    this.presas.clear();
  }

  destruir() {
    this.limpar();
  }
}
