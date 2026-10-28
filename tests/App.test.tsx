import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../src/App'

describe('App', () => {
  it('renderiza o título', () => {
    render(<App />)
    expect(screen.getByText('Gerenciador de Projetos')).toBeInTheDocument()
  })
})
