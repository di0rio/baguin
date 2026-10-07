import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { galeraDe } from "../avatar/aleatorio";
import { estiloMatiz } from "./avatar-mini";
import { cn } from "../lib/utils";

/** Posições (esquerda %, base %) e escala dos três Avatares da capa: fundo e frente dão profundidade. */
const LUGARES = [
  { x: 22, base: 14, escala: 4 },
  { x: 50, base: 6, escala: 4 },
  { x: 78, base: 16, escala: 4 },
] as const;

/**
 * Capa gerada de um Espaço, sem imagem: um mini cômodo em 3/4 (parede, piso quadriculado, tapete) tingido por um matiz
 * estável do id, com três Avatares de exemplo em pé. Quem tem a moldura é a capa; o texto fica solto embaixo.
 */
export function CapaEspaco({ id, className }: { id: string; className?: string }) {
  const galera = galeraDe(id, LUGARES.length);
  return (
    <div
      aria-hidden
      style={estiloMatiz(id)}
      className={cn(
        "relative isolate aspect-[16/9] overflow-hidden rounded-xl border bg-[oklch(0.955_0.03_var(--matiz))] dark:bg-[oklch(0.25_0.025_var(--matiz))]",
        className,
      )}
    >
      {/* parede */}
      <div className="absolute inset-x-0 top-0 h-[34%] border-b border-black/5 bg-[oklch(0.9_0.05_var(--matiz))] dark:border-white/5 dark:bg-[oklch(0.3_0.04_var(--matiz))]">
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/4 dark:bg-white/4" />
      </div>
      {/* piso */}
      <div className="absolute inset-x-0 top-[34%] bottom-0 [background-image:linear-gradient(to_right,oklch(0_0_0/0.045)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0_0_0/0.045)_1px,transparent_1px)] [background-size:26px_26px] dark:[background-image:linear-gradient(to_right,oklch(1_0_0/0.04)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.04)_1px,transparent_1px)]" />
      {/* tapete */}
      <div className="absolute top-[50%] left-1/2 h-[38%] w-[70%] -translate-x-1/2 rounded-[18px] bg-[oklch(0.9_0.04_calc(var(--matiz)+40))] shadow-[inset_0_0_0_3px_oklch(1_0_0/0.35)] dark:bg-[oklch(0.32_0.05_calc(var(--matiz)+40))] dark:shadow-[inset_0_0_0_3px_oklch(1_0_0/0.08)]" />
      {galera.map((pecas, i) => (
        <div key={i} className="absolute -translate-x-1/2" style={{ left: `${LUGARES[i].x}%`, bottom: `${LUGARES[i].base}%` }}>
          <div className="absolute inset-x-1 -bottom-1 h-2.5 rounded-[50%] bg-black/15 blur-[2px] dark:bg-black/30" />
          <AvatarCanvas pecas={pecas} dir="baixo" escala={LUGARES[i].escala} className="relative transition-transform duration-200 ease-smooth group-hover:-translate-y-1" />
        </div>
      ))}
    </div>
  );
}
