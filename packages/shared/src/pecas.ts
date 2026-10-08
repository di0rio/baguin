import { z } from "zod";

export const CATALOGO = {
  alturas: ["baixo", "medio", "alto"],
  cabelos: ["espetado", "redondo", "longo", "chanel", "tigela", "coque", "moicano", "careca"],
  rostos: ["sono", "feliz", "bravo", "sorrisao", "desconfiado", "fofo"],
  acessorios: ["nenhum", "oculos", "bone", "fone", "touca"],
  /** Preenchimento liso: cabelo e calça. */
  lisos: ["papel", "tinta"],
  /** Preenchimento da roupa: liso ou estampa. */
  estampas: ["listra", "bolinha", "xadrez"],
} as const;

export type Altura = (typeof CATALOGO.alturas)[number];
export type Liso = (typeof CATALOGO.lisos)[number];
/** Como uma Peça é pintada: papel, tinta ou uma estampa feita das duas. */
export type Preenchimento = Liso | (typeof CATALOGO.estampas)[number];

const liso = z.enum(CATALOGO.lisos);

export const pecasSchema = z.object({
  altura: z.enum(CATALOGO.alturas),
  cabelo: z.object({ estilo: z.enum(CATALOGO.cabelos), preenchimento: liso }),
  /** O tronco tem uma forma só; a roupa escolhe só o Preenchimento. */
  roupa: z.object({ preenchimento: z.enum([...CATALOGO.lisos, ...CATALOGO.estampas]) }),
  calca: z.object({ preenchimento: liso }),
  rosto: z.enum(CATALOGO.rostos),
  acessorio: z.enum(CATALOGO.acessorios),
});

/** Peças do Avatar: formas e Preenchimentos. O rosto é sempre papel. */
export type Pecas = z.infer<typeof pecasSchema>;

/** Padrão da marca: cara de sono. */
export const PECAS_PADRAO: Pecas = {
  altura: "medio",
  cabelo: { estilo: "espetado", preenchimento: "tinta" },
  roupa: { preenchimento: "listra" },
  calca: { preenchimento: "tinta" },
  rosto: "sono",
  acessorio: "nenhum",
};

export function pecasValidas(v: unknown): v is Pecas {
  return pecasSchema.safeParse(v).success;
}

// ---------------------------------------------------------------- migração

/**
 * Formato antigo (pixel art, cor por índice de paleta), de antes da arte cartoon:
 * `{ pele, cabelo: { estilo, cor }, roupa: { estilo, cor }, calca, acessorio }`.
 */
const ESTILO_CABELO: Record<string, Pecas["cabelo"]["estilo"]> = {
  careca: "careca",
  curto: "tigela",
  moicano: "moicano",
  longo: "longo",
  rabo: "coque",
  blackpower: "redondo",
};
const ACESSORIO: Record<string, Pecas["acessorio"]> = { nenhum: "nenhum", oculos: "oculos", bone: "bone", fone: "fone", chapeu: "touca" };
// Cor antiga (índice na paleta) vira papel (clara) ou tinta (escura ou saturada).
const CABELO_COR: readonly Liso[] = ["tinta", "tinta", "tinta", "papel", "tinta", "papel", "tinta", "papel"];
const ROUPA_COR: readonly Preenchimento[] = ["tinta", "papel", "papel", "papel", "tinta", "tinta", "tinta", "papel", "papel", "tinta"];
const CALCA_COR: readonly Liso[] = ["tinta", "tinta", "tinta", "tinta", "papel", "tinta", "tinta", "papel"];

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Converte o formato antigo para o atual, de forma determinística: pele e estilo de roupa somem, a Altura vira
 * médio e o rosto vira a cara de sono. Já no formato atual, devolve o mesmo valor. Inválido: `null`.
 */
export function migrarPecas(v: unknown): Pecas | null {
  if (pecasValidas(v)) return v;
  if (!ehObjeto(v) || typeof v.pele !== "number" || !ehObjeto(v.cabelo) || !ehObjeto(v.roupa)) return null;
  const estilo = ESTILO_CABELO[String(v.cabelo.estilo)];
  const acessorio = ACESSORIO[String(v.acessorio)];
  const cabelo = CABELO_COR[Number(v.cabelo.cor)];
  const roupa = ROUPA_COR[Number(v.roupa.cor)];
  const calca = CALCA_COR[Number(v.calca)];
  if (!estilo || !acessorio || !cabelo || !roupa || !calca) return null;
  return { altura: "medio", cabelo: { estilo, preenchimento: cabelo }, roupa: { preenchimento: roupa }, calca: { preenchimento: calca }, rosto: "sono", acessorio };
}
