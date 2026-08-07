import type {
  ContentCatalogRepository,
  GameConfigurationRepository,
} from '@/modules/content/application/ports';
import type { ActiveContent } from '@/modules/content/domain/active-content';
import type { CurrentGameConfiguration } from '@/modules/content/domain/game-configuration';

/**
 * Conteúdo elegível para a futura seleção de rodada: palavras ativas com
 * charadas ativas e respostas aceitas. Sem seleção aleatória (fora de escopo).
 */
export function listActiveContent(
  repository: ContentCatalogRepository,
): Promise<ActiveContent[]> {
  return repository.listActiveContent();
}

/**
 * Configuração vigente do jogo, ou `null` quando não há nenhuma atual. Não cria
 * nem altera configuração.
 */
export function getCurrentConfiguration(
  repository: GameConfigurationRepository,
): Promise<CurrentGameConfiguration | null> {
  return repository.getCurrent();
}
