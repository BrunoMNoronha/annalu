-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionChallengeState" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETE', 'SUBMITTED', 'SKIPPED', 'EXPIRED_INCOMPLETE');

-- CreateEnum
CREATE TYPE "PlayerAnswerState" AS ENUM ('DRAFT', 'COMPLETE', 'SUBMITTED', 'PRESERVED_AFTER_EXPIRATION', 'IN_EVALUATION');

-- CreateEnum
CREATE TYPE "ImageLifecycleState" AS ENUM ('RESERVED', 'UPLOADING', 'CONFIRMED', 'ASSOCIATED', 'ORPHAN_EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "ImageDeletionState" AS ENUM ('NOT_DELETED', 'DELETED');

-- CreateEnum
CREATE TYPE "EvaluationResult" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvaluationAppliedResult" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvaluationEventType" AS ENUM ('INITIAL_DECISION', 'REVISION', 'CORRECTION');

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "public_tag" TEXT,
    "access_code_hash" TEXT NOT NULL,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "guardian_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" UUID NOT NULL,
    "contact_email" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "external_identifier" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "guardian_id" UUID,
    "admin_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "term_version" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "guardian_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "recorded_by_auth_identity_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_admin_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riddles" (
    "id" UUID NOT NULL,
    "word_id" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "riddles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accepted_answers" (
    "id" UUID NOT NULL,
    "riddle_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "normalized_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accepted_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_configurations" (
    "id" UUID NOT NULL,
    "points_per_approval" INTEGER NOT NULL DEFAULT 10,
    "upload_grace_seconds" INTEGER NOT NULL DEFAULT 60,
    "challenges_per_round" INTEGER NOT NULL,
    "time_limit_seconds" INTEGER NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "game_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" UUID NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'CREATED',
    "player_id" UUID NOT NULL,
    "configuration_id" UUID NOT NULL,
    "points_per_approval_snapshot" INTEGER NOT NULL,
    "upload_grace_seconds_snapshot" INTEGER NOT NULL,
    "challenges_count_snapshot" INTEGER NOT NULL,
    "time_limit_seconds_snapshot" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_challenges" (
    "id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "session_id" UUID NOT NULL,
    "riddle_id" UUID NOT NULL,
    "state" "SessionChallengeState" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "session_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_answers" (
    "id" UUID NOT NULL,
    "session_challenge_id" UUID NOT NULL,
    "answer_text" TEXT NOT NULL DEFAULT '',
    "state" "PlayerAnswerState" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "player_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submitted_images" (
    "id" UUID NOT NULL,
    "player_answer_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT,
    "size_bytes" INTEGER,
    "lifecycle_state" "ImageLifecycleState" NOT NULL DEFAULT 'RESERVED',
    "exif_stripped" BOOLEAN NOT NULL DEFAULT false,
    "reserved_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "retention_until" TIMESTAMPTZ(6),
    "deletion_state" "ImageDeletionState" NOT NULL DEFAULT 'NOT_DELETED',
    "deleted_at" TIMESTAMPTZ(6),
    "deletion_reason" TEXT,
    "object_deletion_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "purge_attempts" INTEGER NOT NULL DEFAULT 0,
    "purge_last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "submitted_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL,
    "player_answer_id" UUID NOT NULL,
    "current_result" "EvaluationResult" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_events" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "applied_result" "EvaluationAppliedResult" NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "event_type" "EvaluationEventType" NOT NULL,
    "reason" TEXT,
    "previous_event_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_transactions" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "evaluation_event_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_public_tag_key" ON "players"("public_tag");

-- CreateIndex
CREATE INDEX "players_guardian_id_idx" ON "players"("guardian_id");

-- CreateIndex
CREATE INDEX "auth_identities_guardian_id_idx" ON "auth_identities"("guardian_id");

-- CreateIndex
CREATE INDEX "auth_identities_admin_user_id_idx" ON "auth_identities"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_external_identifier_key" ON "auth_identities"("provider", "external_identifier");

-- CreateIndex
CREATE INDEX "consent_records_player_id_created_at_idx" ON "consent_records"("player_id", "created_at");

-- CreateIndex
CREATE INDEX "consent_records_guardian_id_created_at_idx" ON "consent_records"("guardian_id", "created_at");

-- CreateIndex
CREATE INDEX "words_status_idx" ON "words"("status");

-- CreateIndex
CREATE INDEX "riddles_word_id_idx" ON "riddles"("word_id");

-- CreateIndex
CREATE UNIQUE INDEX "accepted_answers_riddle_id_normalized_text_key" ON "accepted_answers"("riddle_id", "normalized_text");

-- CreateIndex
CREATE INDEX "game_sessions_player_id_status_idx" ON "game_sessions"("player_id", "status");

-- CreateIndex
CREATE INDEX "game_sessions_status_expires_at_idx" ON "game_sessions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "game_sessions_configuration_id_idx" ON "game_sessions"("configuration_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_challenges_session_id_position_key" ON "session_challenges"("session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "session_challenges_session_id_riddle_id_key" ON "session_challenges"("session_id", "riddle_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_answers_session_challenge_id_key" ON "player_answers"("session_challenge_id");

-- CreateIndex
CREATE UNIQUE INDEX "submitted_images_player_answer_id_key" ON "submitted_images"("player_answer_id");

-- CreateIndex
CREATE UNIQUE INDEX "submitted_images_storage_key_key" ON "submitted_images"("storage_key");

-- CreateIndex
CREATE INDEX "submitted_images_lifecycle_state_idx" ON "submitted_images"("lifecycle_state");

-- CreateIndex
CREATE INDEX "submitted_images_retention_until_idx" ON "submitted_images"("retention_until");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_player_answer_id_key" ON "evaluations"("player_answer_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_events_previous_event_id_key" ON "evaluation_events"("previous_event_id");

-- CreateIndex
CREATE INDEX "evaluation_events_evaluation_id_created_at_idx" ON "evaluation_events"("evaluation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "score_transactions_evaluation_event_id_key" ON "score_transactions"("evaluation_event_id");

-- CreateIndex
CREATE INDEX "score_transactions_player_id_created_at_idx" ON "score_transactions"("player_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_admin_user_id_created_at_idx" ON "audit_logs"("admin_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_recorded_by_auth_identity_id_fkey" FOREIGN KEY ("recorded_by_auth_identity_id") REFERENCES "auth_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_created_by_admin_user_id_fkey" FOREIGN KEY ("created_by_admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riddles" ADD CONSTRAINT "riddles_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accepted_answers" ADD CONSTRAINT "accepted_answers_riddle_id_fkey" FOREIGN KEY ("riddle_id") REFERENCES "riddles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "game_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_challenges" ADD CONSTRAINT "session_challenges_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_challenges" ADD CONSTRAINT "session_challenges_riddle_id_fkey" FOREIGN KEY ("riddle_id") REFERENCES "riddles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_session_challenge_id_fkey" FOREIGN KEY ("session_challenge_id") REFERENCES "session_challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submitted_images" ADD CONSTRAINT "submitted_images_player_answer_id_fkey" FOREIGN KEY ("player_answer_id") REFERENCES "player_answers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_player_answer_id_fkey" FOREIGN KEY ("player_answer_id") REFERENCES "player_answers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_events" ADD CONSTRAINT "evaluation_events_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_events" ADD CONSTRAINT "evaluation_events_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_events" ADD CONSTRAINT "evaluation_events_previous_event_id_fkey" FOREIGN KEY ("previous_event_id") REFERENCES "evaluation_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_transactions" ADD CONSTRAINT "score_transactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_transactions" ADD CONSTRAINT "score_transactions_evaluation_event_id_fkey" FOREIGN KEY ("evaluation_event_id") REFERENCES "evaluation_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =====================================================================
-- Constraints e índices adicionais (não expressáveis no schema Prisma).
-- Ver docs/14-modelo-fisico-prisma.md.
-- =====================================================================

-- AuthIdentity: exatamente um proprietário (Guardian XOR AdminUser).
ALTER TABLE "auth_identities"
  ADD CONSTRAINT "auth_identities_exactly_one_owner"
  CHECK (num_nonnulls("guardian_id", "admin_user_id") = 1);

-- AuthIdentity: no máximo um provedor por perfil adulto (índices parciais).
CREATE UNIQUE INDEX "auth_identities_guardian_provider_key"
  ON "auth_identities" ("guardian_id", "provider")
  WHERE "guardian_id" IS NOT NULL;

CREATE UNIQUE INDEX "auth_identities_admin_provider_key"
  ON "auth_identities" ("admin_user_id", "provider")
  WHERE "admin_user_id" IS NOT NULL;

-- GameConfiguration: valores positivos e tolerância não negativa.
ALTER TABLE "game_configurations"
  ADD CONSTRAINT "game_configurations_points_positive" CHECK ("points_per_approval" > 0),
  ADD CONSTRAINT "game_configurations_grace_non_negative" CHECK ("upload_grace_seconds" >= 0),
  ADD CONSTRAINT "game_configurations_challenges_positive" CHECK ("challenges_per_round" > 0),
  ADD CONSTRAINT "game_configurations_time_positive" CHECK ("time_limit_seconds" > 0);

-- GameConfiguration: no máximo UMA configuração atual (índice único parcial).
CREATE UNIQUE INDEX "game_configurations_single_current_key"
  ON "game_configurations" ("is_current")
  WHERE "is_current" = true;

-- GameSession: snapshots com os mesmos limites da configuração.
ALTER TABLE "game_sessions"
  ADD CONSTRAINT "game_sessions_points_snapshot_positive" CHECK ("points_per_approval_snapshot" > 0),
  ADD CONSTRAINT "game_sessions_grace_snapshot_non_negative" CHECK ("upload_grace_seconds_snapshot" >= 0),
  ADD CONSTRAINT "game_sessions_challenges_snapshot_positive" CHECK ("challenges_count_snapshot" > 0),
  ADD CONSTRAINT "game_sessions_time_snapshot_positive" CHECK ("time_limit_seconds_snapshot" > 0);

-- SessionChallenge: posição maior que zero.
ALTER TABLE "session_challenges"
  ADD CONSTRAINT "session_challenges_position_positive" CHECK ("position" > 0);

-- SubmittedImage: tamanho positivo quando presente; tentativas não negativas.
ALTER TABLE "submitted_images"
  ADD CONSTRAINT "submitted_images_size_positive" CHECK ("size_bytes" IS NULL OR "size_bytes" > 0),
  ADD CONSTRAINT "submitted_images_purge_attempts_non_negative" CHECK ("purge_attempts" >= 0);

-- EvaluationEvent: não pode referenciar a si próprio.
ALTER TABLE "evaluation_events"
  ADD CONSTRAINT "evaluation_events_no_self_reference"
  CHECK ("previous_event_id" IS NULL OR "previous_event_id" <> "id");

-- ScoreTransaction: pontos nunca podem ser zero.
ALTER TABLE "score_transactions"
  ADD CONSTRAINT "score_transactions_points_not_zero" CHECK ("points" <> 0);
