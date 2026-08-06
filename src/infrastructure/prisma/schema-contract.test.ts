import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * Testes de CONTRATO do schema (sem banco): inspecionam o DMMF do Prisma Client
 * para garantir invariantes de modelagem e privacidade. Não conectam ao banco.
 */
const models = Prisma.dmmf.datamodel.models;

function model(name: string) {
  return models.find((m) => m.name === name);
}

function fieldNames(name: string): string[] {
  return (model(name)?.fields ?? []).map((f) => f.name);
}

const REQUIRED_MODELS = [
  'Player',
  'Guardian',
  'AuthIdentity',
  'AdminUser',
  'ConsentRecord',
  'Word',
  'Riddle',
  'AcceptedAnswer',
  'GameConfiguration',
  'GameSession',
  'SessionChallenge',
  'PlayerAnswer',
  'SubmittedImage',
  'Evaluation',
  'EvaluationEvent',
  'ScoreTransaction',
  'AuditLog',
];

describe('contrato do schema Prisma', () => {
  it('define os 17 models obrigatórios', () => {
    for (const name of REQUIRED_MODELS) {
      expect(model(name), `model ausente: ${name}`).toBeDefined();
    }
  });

  it('não define uma tabela RankingEntry (ranking é projeção)', () => {
    expect(model('RankingEntry')).toBeUndefined();
  });

  it('Player não coleta e-mail, idade, nascimento, nome ou senha', () => {
    const fields = fieldNames('Player').map((f) => f.toLowerCase());
    for (const forbidden of [
      'email',
      'age',
      'idade',
      'birthdate',
      'birthDate',
      'datanascimento',
      'password',
      'passwordhash',
      'fullname',
      'document',
    ]) {
      expect(
        fields.includes(forbidden.toLowerCase()),
        `Player não pode ter campo "${forbidden}"`,
      ).toBe(false);
    }
  });

  it('Player possui accessCodeHash', () => {
    expect(fieldNames('Player')).toContain('accessCodeHash');
  });

  it('EvaluationEvent existe e ScoreTransaction referencia o evento', () => {
    expect(model('EvaluationEvent')).toBeDefined();
    const st = fieldNames('ScoreTransaction');
    expect(st).toContain('evaluationEventId');
    expect(st).toContain('evaluationEvent');
    // não usa evaluationId isolado como chave de idempotência
    expect(st).not.toContain('evaluationId');
  });

  it('Guardian não possui consentStatus (deriva de ConsentRecord)', () => {
    const fields = fieldNames('Guardian').map((f) => f.toLowerCase());
    expect(fields).not.toContain('consentstatus');
  });

  it('SubmittedImage não possui campo de URL pública', () => {
    const fields = fieldNames('SubmittedImage').map((f) => f.toLowerCase());
    for (const forbidden of ['url', 'publicurl', 'signedurl', 'publicUrl']) {
      expect(
        fields.includes(forbidden.toLowerCase()),
        `SubmittedImage não pode ter campo "${forbidden}"`,
      ).toBe(false);
    }
    // guarda apenas a chave privada de storage
    expect(fieldNames('SubmittedImage')).toContain('storageKey');
  });

  it('Evaluation possui currentResult e relação de eventos (0:N)', () => {
    const fields = fieldNames('Evaluation');
    expect(fields).toContain('currentResult');
    expect(fields).toContain('events');
  });
});
