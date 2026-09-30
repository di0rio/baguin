const porta = Number(process.env.PORT ?? 2567);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

export const env = {
  porta,
  webOrigin,
  authUrl: process.env.BETTER_AUTH_URL ?? webOrigin,
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-troque-em-producao-0123456789abcdef",
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
