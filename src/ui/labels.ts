import type { Status, Urgency } from '../domain/types'

export const STATUS_LABEL: Record<Status, string> = {
  planejado: 'Planejado',
  em_execucao: 'Em execução',
  concluido: 'Concluído',
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

// Higher rank = more urgent.
export const URGENCY_RANK: Record<Urgency, number> = {
  critica: 3,
  alta: 2,
  media: 1,
  baixa: 0,
}
