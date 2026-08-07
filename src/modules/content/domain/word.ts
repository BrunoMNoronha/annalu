import type { ContentStatus } from '@/modules/content/domain/content-status';
import { InvalidWordTextError } from '@/modules/content/domain/errors';

/** Palavra do acervo (visão de domínio; sem acoplamento ao Prisma). */
export interface Word {
  readonly id: string;
  readonly text: string;
  readonly status: ContentStatus;
  readonly createdByAdminUserId: string;
}

/**
 * Valida e normaliza (apenas trim de extremidades — apresentação) o texto de
 * exibição de uma palavra. Lança `InvalidWordTextError` se vazio após trim.
 */
export function validateWordText(text: string): string {
  const display = text.trim();
  if (display.length === 0) {
    throw new InvalidWordTextError();
  }
  return display;
}
