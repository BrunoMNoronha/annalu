import type { ReactElement } from 'react';
import { ConstructionNotice } from '@/components/construction-notice';

/**
 * Página inicial: mensagem simples de "em construção".
 * Mobile first, semântica e acessível. Não simula funcionalidades do jogo.
 */
export default function HomePage(): ReactElement {
  return (
    <main className="container">
      <ConstructionNotice title="Annalú e os Tesouros Escondidos" />
    </main>
  );
}
