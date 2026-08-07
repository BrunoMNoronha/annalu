import { describe, expect, it } from 'vitest';
import {
  InvalidRiddlePromptError,
  InvalidWordTextError,
} from '@/modules/content/domain/errors';
import { validateRiddlePrompt } from '@/modules/content/domain/riddle';
import { validateWordText } from '@/modules/content/domain/word';

describe('validateWordText', () => {
  it('retorna o texto com trim de extremidades', () => {
    expect(validateWordText('  copo ')).toBe('copo');
  });

  it('rejeita texto vazio', () => {
    expect(() => validateWordText('')).toThrow(InvalidWordTextError);
  });

  it('rejeita apenas whitespace', () => {
    expect(() => validateWordText('   ')).toThrow(InvalidWordTextError);
  });
});

describe('validateRiddlePrompt', () => {
  it('retorna o prompt com trim de extremidades', () => {
    expect(validateRiddlePrompt('  Qual é? ')).toBe('Qual é?');
  });

  it('rejeita prompt vazio', () => {
    expect(() => validateRiddlePrompt('')).toThrow(InvalidRiddlePromptError);
  });

  it('rejeita apenas whitespace', () => {
    expect(() => validateRiddlePrompt('  \t ')).toThrow(
      InvalidRiddlePromptError,
    );
  });
});
