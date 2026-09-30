/** Emissor de eventos tipado, mínimo. `M` mapeia nome do evento → tipo do payload. */
export class Emissor<M extends Record<string, unknown>> {
  private ouvintes = new Map<keyof M, Set<(v: never) => void>>();

  on<K extends keyof M>(evento: K, fn: (v: M[K]) => void): () => void {
    let set = this.ouvintes.get(evento);
    if (!set) this.ouvintes.set(evento, (set = new Set()));
    set.add(fn as (v: never) => void);
    return () => set.delete(fn as (v: never) => void);
  }

  protected emitir<K extends keyof M>(evento: K, valor: M[K]) {
    for (const fn of [...(this.ouvintes.get(evento) ?? [])]) (fn as (v: M[K]) => void)(valor);
  }
}
