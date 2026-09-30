import { schema, t, type SchemaType } from "@colyseus/schema";

export const AvatarEstado = schema(
  {
    contaId: t.string(),
    nome: t.string(),
    /** JSON de `Pecas` */
    pecas: t.string(),
    x: t.number(),
    y: t.number(),
    dir: t.string(),
    movendo: t.boolean(),
    atividade: t.string(),
    naoPerturbe: t.boolean(),
    /** epoch ms; 0 = não silenciado */
    silenciadoAte: t.number(),
  },
  "Avatar",
);
export type AvatarEstado = SchemaType<typeof AvatarEstado>;

export const LugarEstado = schema({ avatares: t.map(AvatarEstado) }, "LugarEstado");
export type LugarEstado = SchemaType<typeof LugarEstado>;
