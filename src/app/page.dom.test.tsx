import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renderiza o título principal como cabeçalho acessível', () => {
    render(<HomePage />);
    const titulo = screen.getByRole('heading', { level: 1 });
    expect(titulo).toHaveTextContent('Annalú e os Tesouros Escondidos');
  });

  it('informa que o projeto está em construção', () => {
    render(<HomePage />);
    expect(screen.getByText(/em construção/i)).toBeInTheDocument();
  });
});
