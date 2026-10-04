import { describe, expect, it } from "vitest";
import { assinarIngresso, consumirIngresso } from "./ingresso.js";

const payload = { contaId: "c", espacoId: "e", lugarId: "l", x: 1, y: 2 };

describe("ingresso", () => {
  it("é de uso único", async () => {
    const token = await assinarIngresso(payload);
    expect(await consumirIngresso(token)).toEqual(payload);
    expect(await consumirIngresso(token)).toBeNull();
  });

  it("recusa token inválido ou de outro tipo", async () => {
    expect(await consumirIngresso("lixo")).toBeNull();
    expect(await consumirIngresso(undefined)).toBeNull();
  });
});
