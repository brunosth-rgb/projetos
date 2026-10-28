// Dev-only sample data for the UI preview. Dates are relative to the local "today" (no UTC math).
import type { Profile, Project, Status, Urgency } from '../src/domain/types'

export const PEOPLE: Profile[] = [
  { id: '6f1c2a3e-1b7d-4c55-9a0e-0b5a4d1e2f01', display_name: 'Bruno', email: 'bruno@exemplo.com.br' },
  { id: '0c9e8d7b-2a41-4f3c-8b6e-5d4c3b2a1f02', display_name: 'Marina', email: 'marina@exemplo.com.br' },
  { id: 'a7b6c5d4-3e2f-4a1b-9c8d-7e6f5a4b3c03', display_name: 'Rafael', email: 'rafael@exemplo.com.br' },
]
const [BRUNO, MARINA, RAFAEL] = PEOPLE.map(p => p.id)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Local YYYY-MM-DD for today + offset days. */
export function dayFromToday(offset: number, now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ISO timestamp some days in the past (only for created/updated/completed fields). */
function stampDaysAgo(daysAgo: number, hour = 10): string {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() - daysAgo, hour).toISOString()
}

type StepSeed = [title: string, done: boolean, assignee: string | null]

interface Seed {
  title: string
  description: string
  status: Status
  urgency: Urgency
  due: number | null
  createdDaysAgo: number
  steps: StepSeed[]
}

const SEEDS: Seed[] = [
  {
    title: 'Declaração do imposto de renda',
    description: 'Reunir informes de rendimentos e recibos médicos antes de enviar.',
    status: 'em_execucao', urgency: 'critica', due: -4, createdDaysAgo: 40,
    steps: [
      ['Baixar informes dos bancos', true, BRUNO],
      ['Separar recibos médicos e de educação', true, MARINA],
      ['Conferir carnê-leão', false, BRUNO],
      ['Preencher o programa da Receita', false, BRUNO],
      ['Transmitir e salvar o recibo', false, null],
    ],
  },
  {
    title: 'Lançamento do site',
    description: 'Nova versão do site institucional com portfólio e formulário de contato.',
    status: 'em_execucao', urgency: 'alta', due: 2, createdDaysAgo: 30,
    steps: [
      ['Fechar textos da página inicial', true, MARINA],
      ['Fotos do portfólio', true, RAFAEL],
      ['Formulário de contato', true, BRUNO],
      ['Testar no celular', false, RAFAEL],
      ['Apontar o domínio', false, BRUNO],
      ['Avisar os clientes por e-mail', false, MARINA],
    ],
  },
  {
    title: 'Migração do e-mail para o novo domínio',
    description: 'Trocar as caixas de e-mail para o domínio novo sem perder mensagens.',
    status: 'em_execucao', urgency: 'media', due: -1, createdDaysAgo: 21,
    steps: [
      ['Criar as contas no novo provedor', true, BRUNO],
      ['Configurar registros MX', false, BRUNO],
      ['Importar caixas antigas', false, RAFAEL],
      ['Atualizar assinaturas', false, MARINA],
    ],
  },
  {
    title: 'Reforma do escritório',
    description: 'Pintura, troca do piso da sala de reunião e nova iluminação.',
    status: 'em_execucao', urgency: 'alta', due: 12, createdDaysAgo: 55,
    steps: [
      ['Pedir três orçamentos', true, MARINA],
      ['Escolher o piso', true, MARINA],
      ['Contratar o pintor', true, RAFAEL],
      ['Comprar luminárias', false, RAFAEL],
      ['Liberar a sala no fim de semana', false, BRUNO],
      ['Instalar a iluminação', false, null],
      ['Vistoria final', false, MARINA],
    ],
  },
  {
    title: 'Renovação do seguro do carro',
    description: 'A apólice atual vence esta semana; comparar com duas seguradoras.',
    status: 'planejado', urgency: 'alta', due: 0, createdDaysAgo: 9,
    steps: [
      ['Pedir cotação na corretora', true, BRUNO],
      ['Comparar coberturas', false, BRUNO],
      ['Assinar a nova apólice', false, null],
    ],
  },
  {
    title: 'Orçamento de 2027',
    description: 'Planilha de custos fixos, investimentos previstos e reserva.',
    status: 'planejado', urgency: 'alta', due: 3, createdDaysAgo: 14,
    steps: [
      ['Levantar gastos de 2026', true, MARINA],
      ['Estimar reajustes de contratos', false, MARINA],
      ['Definir investimentos', false, BRUNO],
      ['Revisar com todos', false, null],
    ],
  },
  {
    title: 'Contratação de designer freelancer',
    description: 'Apoio para materiais de divulgação no primeiro trimestre.',
    status: 'planejado', urgency: 'media', due: null, createdDaysAgo: 12,
    steps: [
      ['Escrever a descrição do trabalho', false, RAFAEL],
      ['Separar três portfólios', false, RAFAEL],
      ['Entrevistas', false, MARINA],
    ],
  },
  {
    title: 'Viagem para a conferência em Lisboa',
    description: 'Passagens, hotel perto do centro de convenções e seguro-viagem.',
    status: 'planejado', urgency: 'baixa', due: 34, createdDaysAgo: 6,
    steps: [
      ['Confirmar inscrição', true, BRUNO],
      ['Comprar passagens', false, BRUNO],
      ['Reservar hotel', false, MARINA],
      ['Contratar seguro-viagem', false, null],
      ['Preparar a apresentação', false, BRUNO],
    ],
  },
  {
    title: 'Revisão do contrato de aluguel',
    description: '',
    status: 'planejado', urgency: 'baixa', due: null, createdDaysAgo: 3,
    steps: [
      ['Ler as cláusulas de reajuste', false, MARINA],
      ['Marcar conversa com a imobiliária', false, null],
    ],
  },
  {
    title: 'Nova identidade visual',
    description: 'Logotipo, paleta e modelos de apresentação.',
    status: 'concluido', urgency: 'alta', due: -3, createdDaysAgo: 70,
    steps: [
      ['Briefing', true, MARINA],
      ['Primeiras propostas', true, RAFAEL],
      ['Ajustes finais', true, RAFAEL],
      ['Entregar arquivos', true, MARINA],
    ],
  },
  {
    title: 'Inventário dos equipamentos',
    description: 'Lista de notebooks, monitores e licenças com número de série.',
    status: 'concluido', urgency: 'baixa', due: -10, createdDaysAgo: 45,
    steps: [
      ['Planilha de equipamentos', true, RAFAEL],
      ['Conferir licenças', true, BRUNO],
    ],
  },
  {
    title: 'Manutenção do ar-condicionado',
    description: '',
    status: 'concluido', urgency: 'media', due: null, createdDaysAgo: 25,
    steps: [
      ['Agendar técnico', true, BRUNO],
      ['Limpeza dos filtros', true, null],
    ],
  },
]

/** Builds a fresh copy of the sample projects (ids are stable across reloads). */
export function sampleProjects(): Project[] {
  const nextPos: Record<Status, number> = { planejado: 0, em_execucao: 0, concluido: 0 }
  return SEEDS.map((s, i) => {
    nextPos[s.status] += 1000
    const n = String(i + 1).padStart(4, '0')
    const id = `00000000-0000-4000-8000-00000000${n}`
    const created = stampDaysAgo(s.createdDaysAgo)
    return {
      id,
      title: s.title,
      description: s.description,
      status: s.status,
      urgency: s.urgency,
      due_date: s.due === null ? null : dayFromToday(s.due),
      position: nextPos[s.status],
      created_by: PEOPLE[i % PEOPLE.length].id,
      created_at: created,
      updated_at: created,
      completed_at: s.status === 'concluido' ? stampDaysAgo(Math.max(0, -(s.due ?? -2)), 17) : null,
      steps: s.steps.map(([title, done, assignee], j) => ({
        id: `00000000-0000-4000-9000-${n}${String(j + 1).padStart(8, '0')}`,
        project_id: id,
        title,
        done,
        position: (j + 1) * 1000,
        assignee_id: assignee,
        created_at: created,
      })),
    }
  })
}
