import type { GameSessionStatus } from '@/modules/round/domain/game-session';
import type { PlayerAnswerState } from '@/modules/round/domain/player-answer-state';
import type { SessionChallengeState } from '@/modules/round/domain/session-challenge-state';

/**
 * Port de **consulta** (read model) da rodada — separado do agregado de escrita
 * (`GameSessionRepository`) para não inflar o modelo de domínio nem acoplar a
 * escrita à leitura. Direção: `application → query port`;
 * `infrastructure → query port`.
 *
 * **Minimização de dados:** a projeção destinada ao jogador expõe apenas o
 * necessário para a experiência da rodada. NUNCA inclui palavra-alvo
 * (`Word.text`), respostas aceitas (`AcceptedAnswer`), PII do jogador/responsável
 * nem credenciais. O adapter deve fazer um `select` mínimo (não carregar esses
 * dados "só porque estão no relacionamento").
 */

/**
 * Rascunho da resposta da criança, para **restaurar** o texto (reload/retomada).
 * `answerText` é literal e pode ser `""`. Distingue-se de "sem resposta"
 * (`answer = null`).
 */
export interface RoundStateAnswerView {
  readonly answerId: string;
  readonly answerText: string;
  readonly state: PlayerAnswerState;
}

/** Desafio da rodada visível ao jogador (apenas o enunciado, sem a solução). */
export interface RoundStateChallengeView {
  readonly challengeId: string;
  readonly position: number;
  readonly state: SessionChallengeState;
  readonly prompt: string;
  /** Rascunho persistido, ou `null` quando ainda não há resposta. */
  readonly answer: RoundStateAnswerView | null;
}

/**
 * Projeção persistida da rodada (sem cálculos temporais). Reflete exatamente os
 * `SessionChallenge` gravados na criação — a leitura **não** reexecuta sorteio
 * nem filtra por status atual do catálogo. `challenges` já vem ordenado por
 * `position` ASC.
 */
export interface RoundStateProjection {
  readonly sessionId: string;
  readonly status: GameSessionStatus;
  readonly startedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly endedAt: Date | null;
  readonly challenges: readonly RoundStateChallengeView[];
}

export interface RoundStateQueryRepository {
  /**
   * Carrega a projeção mínima da rodada (sessão + desafios com `Riddle.prompt`,
   * ordenados por `position`). Retorna `null` se a sessão não existir. NÃO
   * seleciona palavra-alvo nem respostas aceitas.
   */
  loadRoundState(sessionId: string): Promise<RoundStateProjection | null>;
}
