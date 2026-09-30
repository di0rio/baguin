const porta = Number(process.env.PORT ?? 2567);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const SECRET_DEV = "dev-secret-troque-em-producao-0123456789abcdef";
const secret = process.env.BETTER_AUTH_SECRET ?? SECRET_DEV;
const authUrl = process.env.BETTER_AUTH_URL ?? webOrigin;

// Produção (NODE_ENV ou URL pública https): segredo forte obrigatório, senão assina sessões com chave conhecida.
if ((process.env.NODE_ENV === "production" || authUrl.startsWith("https")) && (secret === SECRET_DEV || secret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET ausente, padrão ou com menos de 32 caracteres (gere com: openssl rand -base64 32)");
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
    apiKey: process.env.LIVEKIT_API_KEY ?? "devkey",
    apiSecret: process.env.LIVEKIT_API_SECRET ?? "secret",
  },
};
