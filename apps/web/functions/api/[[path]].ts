// Cloudflare Pages Function: faz /api/* ser same-origin em produção (cookies de sessão ficam no domínio do Pages)
// e repassa tudo para o servidor (API_ORIGIN, ex.: https://api.exemplo.com). Sem @cloudflare/workers-types de propósito.
type Contexto = { request: Request; env: { API_ORIGIN?: string } };

export const onRequest = async ({ request, env }: Contexto): Promise<Response> => {
  if (!env.API_ORIGIN) return new Response("API_ORIGIN não configurada", { status: 500 });

  const entrada = new URL(request.url);
  const destino = new URL(entrada.pathname + entrada.search, env.API_ORIGIN);

  // Request novo a partir do original preserva método, headers (cookie, origin) e corpo em streaming.
  // redirect "manual": redirects do OAuth voltam ao navegador em vez de serem seguidos aqui.
  const resposta = await fetch(new Request(destino, request), { redirect: "manual" });

  // Response vinda de fetch tem headers imutáveis; cópia mantém todos os Set-Cookie.
  return new Response(resposta.body, resposta);
};
