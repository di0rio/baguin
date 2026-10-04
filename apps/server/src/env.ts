const porta = Number(process.env.PORT ?? 2567);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const SECRET_DEV = "dev-secret-troque-em-producao-0123456789abcdef";
const secret = process.env.BETTER_AUTH_SECRET ?? SECRET_DEV;
const authUrl = process.env.BETTER_AUTH_URL ?? webOrigin;

// Produção (NODE_ENV ou URL pública https): segredo forte obrigatório, senão assina sessões com chave conhecida.
const producao = process.env.NODE_ENV === "production" || authUrl.startsWith("https");
const livekitKey = process.env.LIVEKIT_API_KEY ?? "devkey";
const livekitSecret = process.env.LIVEKIT_API_SECRET ?? "secret";
if (producao) {
  if (secret === SECRET_DEV || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET ausente, padrão ou com menos de 32 caracteres (gere com: openssl rand -base64 32)");
  }
  // as chaves de dev do LiveKit são públicas: qualquer um forjaria token de voz
  if (livekitKey === "devkey" || livekitSecret === "secret") {
    throw new Error("LIVEKIT_API_KEY/LIVEKIT_API_SECRET ausentes ou com os valores de desenvolvimento");
  }
  if (process.env.AUTH_DEV_LOGIN === "true") {
    throw new Error("AUTH_DEV_LOGIN=true não é permitido em produção (cadastro por e-mail e senha sem verificação)");
  }
}

export const env = {
  porta,
  webOrigin,
  authUrl,
  secret,
  devLogin: process.env.AUTH_DEV_LOGIN === "true",
  databaseUrl: process.env.DATABASE_URL || undefined,
  discord:
    process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ? { clientId: process.env.DISCORD_CLIENT_ID, clientSecret: process.env.DISCORD_CLIENT_SECRET }
      : undefined,
  google:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
      : undefined,
  livekit: {
    url: process.env.LIVEKIT_URL ?? "ws://localhost:7880",
    apiKey: livekitKey,
    apiSecret: livekitSecret,
  },
};
