import { PlayerAnswerNotDraftError } from '@/modules/round/domain/errors';
import type { GameSessionStatus } from '@/modules/round/domain/game-session';
import type { PlayerAnswerState } from '@/modules/round/domain/player-answer-state';

/**
 * Resposta textual da criança para um `SessionChallenge` (visão de domínio; sem
 * acoplamento ao Prisma). Nesta fatia só existe em `DRAFT`. O `answerText` é
 * preservado **literalmente** (sem `trim`/lowercase/normalização) e pode ser
 * vazio (`""`), o que representa a criança limpando o campo.
 */
export interface PlayerAnswer {
  readonly id: string;
  readonly sessionChallengeId: string;
  readonly answerText: string;
  readonly state: PlayerAnswerState;
  readonly submittedAt: Date | null;
}

/**
 * Classificação (pura) da editabilidade do rascunho para um dado `now`
 * (autoridade temporal do servidor). Distingue a rodada **vencida embora
 * persistida `IN_PROGRESS`** (`EXPIRED_DUE` — deve disparar a expiração) dos
 * demais estados não editáveis (`NOT_EDITABLE`). Boundary **inclusivo**:
 * `now == expiresAt` já está vencido.
 */
export type DraftEditability =
  | { readonly editable: true }
  | {
      readonly editable: false;
      readonly reason: 'EXPIRED_DUE' | 'NOT_EDITABLE';
    };

export function classifyDraftEditability(
  status: GameSessionStatus,
  expiresAt: Date | null,
  now: Date,
): DraftEditability {
  if (status !== 'IN_PROGRESS' || expiresAt === null) {
    return { editable: false, reason: 'NOT_EDITABLE' };
  }
  if (now.getTime() >= expiresAt.getTime()) {
    return { editable: false, reason: 'EXPIRED_DUE' };
  }
  return { editable: true };
}

/**
 * Garante que a resposta existente pode receber rascunho: apenas `DRAFT` é
 * editável nesta fatia. Lança `PlayerAnswerNotDraftError` caso contrário (sem
 * sobrescrever estados posteriores).
 */
export function assertPlayerAnswerDraft(state: PlayerAnswerState): void {
  if (state !== 'DRAFT') {
    throw new PlayerAnswerNotDraftError(state);
  }
}
