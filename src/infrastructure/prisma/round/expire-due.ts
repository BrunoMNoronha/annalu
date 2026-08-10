import type { Prisma, PrismaClient } from '@prisma/client';

/** Executor Prisma que aceita SQL cru — o cliente base ou uma transação. */
type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

/**
 * Compare-and-set atômico de expiração `IN_PROGRESS → EXPIRED`, **compartilhado**
 * entre `expireIfDue` e a gravação de rascunho (para não duplicar a regra
 * temporal). Grava `ended_at = expires_at` (nunca o relógio de detecção) e só
 * aplica quando vencida (`expires_at <= now`). SQL cru porque `SET col = col`
 * não é expressável pelo `updateMany` do Prisma. Retorna o número de linhas
 * afetadas (0 = não venceu / já transicionada). Aceita um executor de transação
 * para participar do mesmo lock da linha da sessão.
 */
export function expireDueSql(
  db: PrismaExecutor,
  sessionId: string,
  now: Date,
): Promise<number> {
  return db.$executeRaw`
    UPDATE "game_sessions"
    SET "status" = 'EXPIRED'::"GameSessionStatus",
        "ended_at" = "expires_at",
        "updated_at" = now()
    WHERE "id" = ${sessionId}::uuid
      AND "status" = 'IN_PROGRESS'::"GameSessionStatus"
      AND "expires_at" <= ${now}
  `;
}
