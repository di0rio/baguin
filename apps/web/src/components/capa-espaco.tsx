import { AvatarCanvas } from "../avatar/AvatarCanvas";
import { galeraDe } from "../avatar/aleatorio";
import { MUNDO } from "../mundo/paleta";
import { cn } from "../lib/utils";

/** Posições (esquerda %, base %) e escala dos três Avatares da capa: fundo e frente dão profundidade. */
const LUGARES = [
  { x: 22, base: 14, escala: 4 },
  { x: 50, base: 6, escala: 4 },
  { x: 78, base: 16, escala: 4 },
] as const;

const hashDe = (texto: string) => {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Mini cômodo em 3/4, no traço do mundo: parede clara, chão creme, tapete e uns poucos móveis, tudo em tinta e papel. */
function Comodo({ variante }: { variante: number }) {
  const { tinta, papel, parede, chao, meio } = MUNDO;
  const espelhar = variante % 2 === 1;
  const tapete = (variante >> 1) % 3;
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" fill="none" stroke={tinta} strokeLinecap="round" strokeLinejoin="round">
      <g transform={espelhar ? "translate(320 0) scale(-1 1)" : undefined}>
        <rect width="320" height="180" fill={chao} stroke="none" />
        {/* parede, rodapé e linha do chão */}
        <rect width="320" height="62" fill={parede} stroke="none" />
        <rect y="50" width="320" height="12" fill={meio} stroke="none" />
        <path d="M0 50.5H320" strokeWidth="1.5" />
        <path d="M0 62H320" strokeWidth="3" />
        {/* janela */}
        <rect x="38" y="12" width="64" height="30" rx="4" fill={papel} strokeWidth="2.5" />
        <rect x="43" y="17" width="54" height="20" rx="2" fill={meio} strokeWidth="1.25" />
        <path d="M70 17V37M43 27H97" strokeWidth="2.5" />
        <rect x="35" y="41" width="70" height="5" rx="2" fill={papel} strokeWidth="2" />
        {/* relógio */}
        <circle cx="214" cy="26" r="12" fill={papel} strokeWidth="2.5" />
        <path d="M214 26V19M214 26H219" strokeWidth="1.75" />
        {/* tapete */}
        <rect x="58" y="98" width="204" height="66" rx="12" fill={meio} strokeWidth="2.5" />
        <rect x="65" y="105" width="190" height="52" rx="8" strokeWidth="1.25" />
        {tapete === 0 &&
          [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <circle key={i} cx={85 + i * 19} cy="105" r="1.4" fill={tinta} stroke="none" />)}
        {tapete === 1 && [0, 1, 2].map((i) => <path key={i} d={`M${80 + i * 5} 112V150M${240 - i * 5} 112V150`} strokeWidth="1" />)}
        {tapete === 2 && <path d="M80 157l8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5" strokeWidth="1" />}
        {/* três riscos de tábua, só em dois pontos */}
        <path d="M24 84H46M28 88H52M24 92H42M266 78H286M270 82H296M266 86H282" strokeWidth="1" />
        {/* luminária de chão e planta */}
        <ellipse cx="22" cy="104" rx="9" ry="3" fill={tinta} />
        <path d="M22 104V76" strokeWidth="2.5" />
        <path d="M13 54h18l4 22H9z" fill={papel} strokeWidth="2.5" />
        <path d="M290 100l-3 22h24l-3-22z" fill={meio} strokeWidth="2.5" />
        <path d="M299 100c-12-6-14-22-6-30 6 4 10 16 6 30zM299 100c8-8 20-10 24-2-6 6-16 6-24 2zM299 100c-1-16 4-28 12-32 2 12-2 24-12 32z" fill={papel} strokeWidth="2" />
      </g>
    </svg>
  );
}

/**
 * Capa gerada de um Espaço, sem imagem: um mini cômodo em 3/4, no mesmo traço do mundo (tinta e papel, sem matiz),
 * com três Avatares de exemplo em pé. O contorno grosso de tinta combina com o `tom-alto` do card que a envolve;
 * o id só escolhe o espelhamento e o tapete. Quem tem a moldura é a capa; o texto fica solto embaixo.
 */
export function CapaEspaco({ id, className }: { id: string; className?: string }) {
  const galera = galeraDe(id, LUGARES.length);
  return (
    <div aria-hidden className={cn("relative isolate aspect-[16/9] overflow-hidden rounded-xl border-2 border-tinta", className)} style={{ backgroundColor: MUNDO.chao }}>
      <Comodo variante={hashDe(id)} />
      {galera.map((pecas, i) => (
        <div key={i} className="absolute -translate-x-1/2" style={{ left: `${LUGARES[i].x}%`, bottom: `${LUGARES[i].base}%` }}>
          <div className="absolute inset-x-1 -bottom-px h-2.5 rounded-[50%]" style={{ backgroundColor: MUNDO.sombra }} />
          <AvatarCanvas pecas={pecas} dir="baixo" escala={LUGARES[i].escala} className="relative transition-transform duration-base ease-out group-hover:-translate-y-1" />
        </div>
      ))}
    </div>
  );
}
