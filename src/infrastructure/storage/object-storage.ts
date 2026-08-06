/**
 * Abstração interna de armazenamento de objetos (compatível com S3).
 *
 * A escolha por uma interface isola o provedor concreto (DEC-013 permanece
 * parcialmente pendente — ver docs/12-decisoes-pendentes.md) e permite trocar a
 * implementação sem afetar o domínio.
 *
 * IMPORTANTE (segurança — docs/08):
 * - Buckets/objetos devem ser PRIVADOS.
 * - O acesso deve ocorrer via URL assinada/autorizada, nunca pública permanente.
 * - Nesta fase de fundação, NÃO há upload real de imagens.
 */
export interface StoredObjectRef {
  /** Chave interna do objeto no armazenamento (não é uma URL pública). */
  key: string;
}

export interface ObjectStorage {
  /** Indica se uma chave existe no armazenamento. */
  exists(key: string): Promise<boolean>;
}

/**
 * Implementação em memória para desenvolvimento e testes.
 * Não persiste nada fora do processo e não acessa serviços externos.
 */
export class InMemoryObjectStorage implements ObjectStorage {
  private readonly keys: Set<string>;

  constructor(initialKeys: readonly string[] = []) {
    this.keys = new Set(initialKeys);
  }

  exists(key: string): Promise<boolean> {
    return Promise.resolve(this.keys.has(key));
  }
}
