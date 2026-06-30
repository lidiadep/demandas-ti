export type Role = "COLABORADOR" | "GESTOR";

export type DemandStatus =
  | "pendente"
  | "em andamento"
  | "concluido"
  | "cancelado";

export type ProjectStatus = "ATIVO" | "INATIVO" | "CONCLUIDO";

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
};

export type Cliente = {
  id: string;
  nome: string;
};

export type Projeto = {
  id: string;
  cliente_id: string;
  nome: string;
  descricao: string | null;
  status: ProjectStatus | string;
};

export type Demanda = {
  id: string;
  projeto_id: string;
  colaborador_id: string;
  titulo: string;
  descricao: string | null;
  area: Area | string;
  prioridade: Priority | string;
  status: DemandStatus | string;
  prazo_finalizacao: string | null;
  created_at: string;
};
