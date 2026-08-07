/**
 * Tipos do guard de banco descartável do seed (implementação em
 * `seed-guard.mjs`). Mantido à parte porque o projeto usa `allowJs: false`.
 */

/** Extrai apenas o nome do database do pathname de uma URL PostgreSQL. */
export function databaseNameFromUrl(rawUrl: string): string;

/**
 * Garante que a URL aponta para um database de teste/descartável; lança em
 * caso contrário. Retorna o nome do database em caso de sucesso.
 */
export function assertSeedDatabase(rawUrl?: string): string;
