import { describe, expect, it } from 'vitest';
import {
  assertNonEmptyAnswer,
  normalizeAnswerText,
} from '@/modules/content/domain/accepted-answer';
import { InvalidAcceptedAnswerError } from '@/modules/content/domain/errors';

describe('normalizeAnswerText (HIPÓTESE provisória)', () => {
  it('remove espaços das extremidades', () => {
    expect(normalizeAnswerText('  casa ')).toBe('casa');
  });

  it('colapsa whitespace interno para um único espaço', () => {
    expect(normalizeAnswerText('  Bola   Azul ')).toBe('bola azul');
    expect(normalizeAnswerText('a\t\tb\nc')).toBe('a b c');
  });

  it('converte para lowercase (Unicode padrão)', () => {
    expect(normalizeAnswerText('CASA')).toBe('casa');
  });

  it('preserva acentos (não remove nem translitera)', () => {
    expect(normalizeAnswerText('Maçã')).toBe('maçã');
    expect(normalizeAnswerText('maca')).toBe('maca');
    // Consequência: acentuada e sem acento permanecem distintas nesta etapa.
    expect(normalizeAnswerText('Maçã')).not.toBe(normalizeAnswerText('maca'));
  });

  it('preserva pontuação', () => {
    expect(normalizeAnswerText('O copo, cheio!')).toBe('o copo, cheio!');
  });

  it('é determinístico', () => {
    const input = '  Copo   DÁgua ';
    expect(normalizeAnswerText(input)).toBe(normalizeAnswerText(input));
  });

  it('texto só de espaços normaliza para vazio', () => {
    expect(normalizeAnswerText('    ')).toBe('');
  });
});

describe('assertNonEmptyAnswer', () => {
  it('aceita texto não vazio', () => {
    expect(() => assertNonEmptyAnswer('copo')).not.toThrow();
  });

  it('rejeita vazio', () => {
    expect(() => assertNonEmptyAnswer('')).toThrow(InvalidAcceptedAnswerError);
  });

  it('rejeita apenas whitespace', () => {
    expect(() => assertNonEmptyAnswer('   ')).toThrow(
      InvalidAcceptedAnswerError,
    );
  });
});
