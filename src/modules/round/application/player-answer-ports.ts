import type { PlayerAnswer } from '@/modules/round/domain/player-answer';

/**
 * Port de escrita do rascunho de resposta. A aplicação depende SOMENTE desta
 * abstração — nunca do `PrismaClient`. A implementação de infraestrutura garante
 * a **atomicidade sob lock da linha da `GameSession`** (a validação de
 * editabilidade e o `upsert` ocorrem na mesma transação), coordenando a corrida
 * com a expiração `IN_PROGRESS → EXPIRED`.
 */
export interface SaveAnswerDraftInput {
  readonly sessionId: string;
  readonly challengeId: string;
  /** Texto literal digitado (preservado sem normalização; `""` é válido). */
  readonly answerText: string;
  /** Instante autoritativo (servidor) já capturado pelo chamador. */
  readonly now: Date;
}

export interface PlayerAnswerDraftRepository {
  /**
   * Cria/atualiza atomicamente o `PlayerAnswer` em `DRAFT` do desafio, se a
   * sessão estiver editável (`IN_PROGRESS` e `now < expiresAt`) sob lock da
   * linha da sessão. Se estiver `IN_PROGRESS` porém vencida, aplica a expiração
   * e rejeita. Lança os erros de domínio para sessão/desafio inexistentes,
   * desafio de outra sessão, sessão não editável e resposta não-`DRAFT`.
   */
  saveDraft(input: SaveAnswerDraftInput): Promise<PlayerAnswer>;
}
