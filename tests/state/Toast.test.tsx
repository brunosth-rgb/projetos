import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../../src/ui/Toast'

function Trigger({ retry }: { retry?: () => void }) {
  const { pushToast } = useToast()
  return <button onClick={() => pushToast({ message: 'Falhou', retry })}>go</button>
}

describe('Toast', () => {
  it('mostra o aviso e executa o retry', async () => {
    const retry = vi.fn()
    render(<ToastProvider><Trigger retry={retry} /></ToastProvider>)
    await userEvent.click(screen.getByText('go'))
    expect(screen.getByText('Falhou')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Falhou')).not.toBeInTheDocument()
  })

  it('sem retry não mostra o botão e pode ser fechado', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>)
    await userEvent.click(screen.getByText('go'))
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(screen.queryByText('Falhou')).not.toBeInTheDocument()
  })
})
