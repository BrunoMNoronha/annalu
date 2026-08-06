import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('responde 200 com estado e horário', async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: string;
      timestamp: string;
    };
    expect(body.status).toBe('ok');
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });

  it('não expõe versões nem variáveis de ambiente', async () => {
    const response = GET();
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['status', 'timestamp']);
    expect(body).not.toHaveProperty('version');
    expect(body).not.toHaveProperty('env');
  });
});
