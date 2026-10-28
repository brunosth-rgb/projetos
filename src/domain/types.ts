export type Status = 'planejado' | 'em_execucao' | 'concluido'
export type Urgency = 'baixa' | 'media' | 'alta' | 'critica'

export interface Step {
  id: string
  project_id: string
  title: string
  done: boolean
  position: number
  assignee_id: string | null
  created_at: string
}

export interface Project {
  id: string
  title: string
  description: string
  status: Status
  urgency: Urgency
  due_date: string | null
  position: number
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
  steps: Step[]
}

export interface Profile {
  id: string
  display_name: string
  email: string
}

export type NewProjectInput = {
  title: string
  description?: string
  urgency: Urgency
  due_date: string | null
  status: Status
  position: number
}
