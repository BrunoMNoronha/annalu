import { InvalidAcceptedAnswerError } from '@/modules/content/domain/errors';

/** Resposta aceita para uma charada (visão de domínio). */
export interface AcceptedAnswer {
  readonly id: string;
  readonly riddleId: string;
  /** Texto original preservado integralmente (apresentação). */
  readonly text: string;
  /** Texto normalizado usado para comparação/unicidade. */
  readonly normalizedText: string;
}

/**
 * HIPÓTESE (provisória e reversível) de normalização de resposta — política
 * técnica até a decisão definitiva de RN-RES-002/003. NÃO é regra de produto.
 *
 * Passos: `trim` → colapsar whitespace interno para um único espaço → lowercase
 * (comportamento Unicode padrão da linguagem). Deliberadamente **não**:
 * remove acentos, translitera, altera pontuação, nem toca no texto original.
 *
 * Exemplos: "  Bola   Azul " → "bola azul"; "CASA" → "casa"; "Maçã" → "maçã";
 * "maca" → "maca" (logo "Maçã" ≠ "maca" nesta etapa).
 */
export function normalizeAnswerText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Garante que a resposta não é vazia após `trim`. Lança
 * `InvalidAcceptedAnswerError` caso contrário.
 */
export function assertNonEmptyAnswer(text: string): void {
  if (text.trim().length === 0) {
    throw new InvalidAcceptedAnswerError();
  }
}
