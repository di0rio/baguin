import { z } from "zod";

export const CATALOGO = {
  pele: 6,
  cabeloEstilos: ["careca", "curto", "moicano", "longo", "rabo", "blackpower"],
  cabeloCores: 8,
  roupaEstilos: ["camiseta", "moletom", "regata"],
  roupaCores: 10,
  calcaCores: 8,
  acessorios: ["nenhum", "oculos", "bone", "fone", "chapeu"],
} as const;

const indice = (n: number) => z.number().int().min(0).max(n - 1);

export const pecasSchema = z.object({
  pele: indice(CATALOGO.pele),
  cabelo: z.object({
    estilo: z.enum(CATALOGO.cabeloEstilos),
    cor: indice(CATALOGO.cabeloCores),
  }),
  roupa: z.object({
    estilo: z.enum(CATALOGO.roupaEstilos),
    cor: indice(CATALOGO.roupaCores),
  }),
  calca: indice(CATALOGO.calcaCores),
  acessorio: z.enum(CATALOGO.acessorios),
});

/** Cores são índices em paletas mantidas pelo renderizador do web. */
export type Pecas = z.infer<typeof pecasSchema>;

export const PECAS_PADRAO: Pecas = {
  pele: 2,
  cabelo: { estilo: "curto", cor: 1 },
  roupa: { estilo: "camiseta", cor: 0 },
  calca: 0,
  acessorio: "nenhum",
};

export function pecasValidas(v: unknown): v is Pecas {
  return pecasSchema.safeParse(v).success;
}
