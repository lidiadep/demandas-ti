export type Role = "COLABORADOR" | "GESTOR";

export type DemandStatus =
  | "pendente"
  | "em andamento"
  | "bloqueado"
  | "concluido"
  | "cancelado";

export type ProjectStatus =
  | "ATIVO"
  | "INATIVO"
  | "CONCLUIDO"
  | "planejado"
  | "em andamento"
  | "bloqueado"
  | "concluido";

export type Area =
  | "produto"
  | "marketing"
  | "desenvolvimento"
  | "qa"
  | "suporte";

export type Priority = "baixa" | "media" | "alta";

export type Profile = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  cargo?: string | null;
  avatar_url?: string | null;
  cliente_id?: string | null;
  area_id?: string | null;
};

export type Cliente = {
  id: string;
  nome: string;
  documento?: string | null;
  segmento?: string | null;
  ativo?: boolean;
};

export type AreaCadastro = {
  id: string;
  nome: string;
  slug: Area | string;
  cor: string | null;
  ativo: boolean;
};

export type TipoTrabalho = {
  id: string;
  nome: string;
  slug: string;
  cor: string | null;
  ativo: boolean;
};

export type PrioridadeCadastro = {
  id: string;
  nome: string;
  slug: Priority | string;
  peso: number;
  cor: string | null;
  ordem: number;
  ativo: boolean;
};

export type Projeto = {
  id: string;
  cliente_id: string;
  nome: string;
  descricao: string | null;
  status: ProjectStatus | string;
  codigo?: string | null;
  area_id?: string | null;
  responsavel_id?: string | null;
  prioridade_id?: string | null;
  horas_estimadas?: number | string | null;
  data_inicio?: string | null;
  prazo_final?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Demanda = {
  id: string;
  projeto_id: string;
  colaborador_id: string;
  titulo: string;
  descricao: string | null;
  area: Area | string | null;
  prioridade: Priority | string | null;
  status: DemandStatus | string;
  prazo_finalizacao: string | null;
  area_id?: string | null;
  tipo_trabalho_id?: string | null;
  prioridade_id?: string | null;
  bloqueio_motivo?: string | null;
  horas_estimadas?: number | string | null;
  horas_realizadas?: number | string | null;
  data_inicio?: string | null;
  ultima_atualizacao_em?: string | null;
  origem?: "colaborador" | "gestor" | string | null;
  criada_por_profile_id?: string | null;
  visualizada_em?: string | null;
  created_at: string;
  updated_at?: string;
};

export type ProjetoMembro = {
  id: string;
  projeto_id: string;
  profile_id: string;
  papel: string;
  alocacao_percentual: number;
  ativo: boolean;
};

export type ProfileCliente = {
  id: string;
  profile_id: string;
  cliente_id: string;
  papel: string;
  cliente_principal: boolean;
  ativo: boolean;
};

export type DemandaAtualizacaoSemanal = {
  id: string;
  demanda_id: string;
  profile_id: string;
  status: DemandStatus | string;
  horas_trabalhadas: number;
  comentario: string;
  semana_inicio: string;
  semana_fim: string;
  created_at: string;
};
