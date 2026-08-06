import type { ReactElement } from 'react';

export interface ConstructionNoticeProps {
  /** Título principal exibido no aviso. */
  title: string;
}

/**
 * Componente de apresentação (sem estado, sem regra de negócio) que exibe um
 * aviso de "em construção". Isola a camada visual da página.
 */
export function ConstructionNotice({
  title,
}: ConstructionNoticeProps): ReactElement {
  return (
    <article className="cartao" aria-labelledby="titulo-principal">
      <h1 id="titulo-principal">{title}</h1>
      <p>
        Este projeto está <strong>em construção</strong>. Estamos preparando a
        fundação técnica antes de implementar as funcionalidades do jogo.
      </p>
      <p>
        Em breve as crianças poderão resolver charadas e encontrar tesouros pelo
        mundo real. Por enquanto, não há nada para jogar aqui.
      </p>
    </article>
  );
}
