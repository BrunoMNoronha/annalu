/**
 * Logger estruturado mínimo (JSON), sem dependências externas nem telemetria.
 *
 * Diretrizes de privacidade (ver docs/08-seguranca-e-privacidade.md):
 * - Não registrar dados pessoais nem conteúdo de variáveis de ambiente.
 * - Campos com chaves sensíveis conhecidas são redigidos automaticamente como
 *   camada extra de proteção; ainda assim, o chamador não deve enviar PII.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, string | number | boolean | null>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Chaves cujo valor nunca deve ser registrado. */
const REDACTED_KEYS = new Set([
  'password',
  'senha',
  'token',
  'secret',
  'authorization',
  'databaseurl',
  'database_url',
  's3_secret_access_key',
  's3_access_key_id',
  'email',
  'cpf',
]);

const REDACTED = '[redacted]';

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

function redact(fields: LogFields): LogFields {
  const safe: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = REDACTED_KEYS.has(key.toLowerCase()) ? REDACTED : value;
  }
  return safe;
}

export interface CreateLoggerOptions {
  level?: LogLevel;
  /** Destino da escrita (padrão: console). Injetável para testes. */
  sink?: (line: string) => void;
  /** Fonte de horário (injetável para testes determinísticos). */
  now?: () => Date;
}

/**
 * Cria um logger estruturado. Cada entrada é uma linha JSON com nível,
 * timestamp ISO, mensagem e campos redigidos.
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const minLevel = LEVEL_ORDER[options.level ?? 'info'];
  const sink = options.sink ?? ((line: string) => console.log(line));
  const now = options.now ?? (() => new Date());

  function write(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_ORDER[level] < minLevel) return;
    const entry = {
      level,
      time: now().toISOString(),
      message,
      ...(fields ? redact(fields) : {}),
    };
    sink(JSON.stringify(entry));
  }

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}
