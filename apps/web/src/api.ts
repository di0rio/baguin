import type {
  ConfigDto,
  ConviteInfoDto,
  EspacoDetalheDto,
  EspacoDto,
  ConviteDto,
  EuDto,
  IngressoDto,
  LivekitTokenDto,
  Papel,
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
  ingresso: (espacoId: string) =>
    chamar<IngressoDto>("POST", `/api/espacos/${encodeURIComponent(espacoId)}/ingresso`),

  livekitToken: (espacoId: string, lugarId: string) =>
    chamar<LivekitTokenDto>("POST", `/api/espacos/${encodeURIComponent(espacoId)}/livekit-token`, { lugarId }),

  convites: (espacoId: string) =>
    chamar<ConviteDto[]>("GET", `/api/espacos/${encodeURIComponent(espacoId)}/convites`),
  criarConvite: (espacoId: string, horas: number, usosMax: number) =>
    chamar<ConviteDto>("POST", `/api/espacos/${encodeURIComponent(espacoId)}/convites`, { horas, usosMax }),
  revogarConvite: (codigo: string) => chamar<void>("DELETE", `/api/convites/${encodeURIComponent(codigo)}`),

  bloqueios: () => chamar<{ contaIds: string[] }>("GET", "/api/bloqueios"),
  bloquear: (contaId: string) => chamar<void>("POST", `/api/bloqueios/${encodeURIComponent(contaId)}`),
  desbloquear: (contaId: string) => chamar<void>("DELETE", `/api/bloqueios/${encodeURIComponent(contaId)}`),

  // moderação
  definirPapel: (espacoId: string, contaId: string, papel: Exclude<Papel, "dono">) =>
    chamar<void>("POST", `${membroUrl(espacoId, contaId)}/papel`, { papel }),
  silenciar: (espacoId: string, contaId: string, minutos: number) =>
    chamar<{ silenciadoAte: string }>("POST", `${membroUrl(espacoId, contaId)}/silenciar`, { minutos }),
  remover: (espacoId: string, contaId: string) => chamar<void>("DELETE", membroUrl(espacoId, contaId)),
  banir: (espacoId: string, contaId: string) => chamar<void>("POST", `${membroUrl(espacoId, contaId)}/banir`),
};

const membroUrl = (espacoId: string, contaId: string) =>
  `/api/espacos/${encodeURIComponent(espacoId)}/membros/${encodeURIComponent(contaId)}`;
