/**
 * Limitador de janela fixa em memória. Vale por instância do servidor (contadores não são
 * compartilhados entre processos): com mais de uma instância o limite efetivo é multiplicado.
 */
export function criarLimitador(max: number, janelaMs: number, agora: () => number = Date.now) {
  const contagens = new Map<string, { n: number; expira: number }>();
  /** `true` se a chave ainda pode agir nesta janela (e conta a ação). */
  return (chave: string): boolean => {
    const t = agora();
    for (const [k, c] of contagens) if (c.expira <= t) contagens.delete(k);
    const c = contagens.get(chave);
    if (!c) {
      contagens.set(chave, { n: 1, expira: t + janelaMs });
      return true;
    }
    return ++c.n <= max;
  };
}
