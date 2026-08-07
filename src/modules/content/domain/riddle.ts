import type { ContentStatus } from '@/modules/content/domain/content-status';
import { InvalidRiddlePromptError } from '@/modules/content/domain/errors';

/** Charada vinculada a uma palavra (visão de domínio). */
export interface Riddle {
  readonly id: string;
  readonly wordId: string;
  readonly prompt: string;
  readonly status: ContentStatus;
}

/**
 * Valida o enunciado da charada (trim de extremidades para apresentação).
 * Lança `InvalidRiddlePromptError` se vazio após trim.
 */
export function validateRiddlePrompt(prompt: string): string {
  const display = prompt.trim();
  if (display.length === 0) {
    throw new InvalidRiddlePromptError();
  }
  return display;
}
