import type {
  ConfigDto,
  ConviteInfoDto,
  EspacoDetalheDto,
  EspacoDto,
  EuDto,
  Pecas,
} from "@baguin/shared";

export class ApiErro extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

async function chamar<T>(metodo: string, url: string, corpo?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: metodo,
    credentials: "same-origin",
    headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (r.status === 204) return undefined as T;
  const json: unknown = await r.json().catch(() => null);
  if (!r.ok) {
    const erro = json && typeof json === "object" && "erro" in json ? String(json.erro) : `erro ${r.status}`;
    throw new ApiErro(r.status, erro);
  }
  return json as T;
}

export const api = {
  config: () => chamar<ConfigDto>("GET", "/api/config"),
  /** null quando não há sessão. */
  eu: () =>
    chamar<EuDto>("GET", "/api/eu").catch((e: unknown) => {
      if (e instanceof ApiErro && e.status === 401) return null;
      throw e;
    }),
  salvarAvatar: (pecas: Pecas) => chamar<void>("PUT", "/api/eu/avatar", pecas),
  espacos: () => chamar<EspacoDto[]>("GET", "/api/espacos"),
  criarEspaco: (nome: string) => chamar<EspacoDetalheDto>("POST", "/api/espacos", { nome }),
  espaco: (id: string) => chamar<EspacoDetalheDto>("GET", `/api/espacos/${encodeURIComponent(id)}`),
  convite: (codigo: string) => chamar<ConviteInfoDto>("GET", `/api/convites/${encodeURIComponent(codigo)}`),
  aceitarConvite: (codigo: string) =>
    chamar<{ espacoId: string }>("POST", `/api/convites/${encodeURIComponent(codigo)}/aceitar`),
};
