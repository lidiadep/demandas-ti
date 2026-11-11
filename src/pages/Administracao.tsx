import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Mail,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { AreaCadastro, Cliente, Profile, Role } from "../types/domain";

type AdminUser = Pick<
  Profile,
  | "id"
  | "user_id"
  | "nome"
  | "email"
  | "role"
  | "ativo"
  | "cargo"
  | "cliente_id"
  | "area_id"
>;

type AccessInvite = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  cargo: string | null;
  cliente_id: string | null;
  area_id: string | null;
  status: string;
  created_at: string;
};

type AccessForm = {
  nome: string;
  email: string;
  role: Role;
  cargo: string;
  clienteId: string;
  areaId: string;
};

const accessRoles: Role[] = ["DIRETOR", "GESTOR", "COLABORADOR"];
const editableRoles: Role[] = ["SUPERADMIN", "ADMIN", ...accessRoles];

const roleDescriptions: Record<Role, string> = {
  SUPERADMIN: "Admin master",
  ADMIN: "Admin",
  DIRETOR: "Diretoria",
  GESTOR: "Gestor",
  COLABORADOR: "Colaborador",
};

const emptyAccessForm: AccessForm = {
  nome: "",
  email: "",
  role: "GESTOR",
  cargo: "",
  clienteId: "",
  areaId: "",
};

export function Administracao() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [areas, setAreas] = useState<AreaCadastro[]>([]);
  const [invites, setInvites] = useState<AccessInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingInvite, setSavingInvite] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [newAccessOpen, setNewAccessOpen] = useState(false);
  const [newAccessForm, setNewAccessForm] = useState<AccessForm>(emptyAccessForm);

  const clientesMap = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente.nome])),
    [clientes]
  );
  const areasMap = useMemo(
    () => new Map(areas.map((area) => [area.id, area.nome])),
    [areas]
  );

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) =>
      [user.nome, user.email, user.cargo, roleDescriptions[user.role]]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term))
    );
  }, [searchTerm, users]);

  const activeUsers = users.filter((user) => user.ativo).length;
  const managementUsers = users.filter((user) =>
    ["DIRETOR", "GESTOR", "ADMIN", "SUPERADMIN"].includes(user.role)
  ).length;
  const pendingInvites = invites.filter(
    (invite) => invite.status === "pendente"
  ).length;

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const [usersRes, clientesRes, areasRes, invitesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,user_id,nome,email,role,ativo,cargo,cliente_id,area_id")
        .order("nome", { ascending: true }),
      supabase
        .from("clientes")
        .select("id,nome,documento,segmento,ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("areas")
        .select("id,nome,slug,cor,ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("convites_acesso")
        .select("id,nome,email,role,cargo,cliente_id,area_id,status,created_at")
        .order("created_at", { ascending: false }),
    ]);

    const firstError = usersRes.error || clientesRes.error || areasRes.error;

    if (firstError) {
      setErrorMessage(
        `Não foi possível carregar a administração: ${firstError.message}`
      );
      setLoading(false);
      return;
    }

    setUsers((usersRes.data as AdminUser[]) ?? []);
    setClientes((clientesRes.data as Cliente[]) ?? []);
    setAreas((areasRes.data as AreaCadastro[]) ?? []);
    setInvites(invitesRes.error ? [] : ((invitesRes.data as AccessInvite[]) ?? []));
    setLoading(false);
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  function updateUser(userId: string, patch: Partial<AdminUser>) {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userId ? { ...user, ...patch } : user
      )
    );
  }

  async function salvarUsuario(user: AdminUser) {
    setSavingUserId(user.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        role: user.role,
        cargo: user.cargo?.trim() || null,
        cliente_id: user.cliente_id || null,
        area_id: user.area_id || null,
        ativo: user.ativo,
      })
      .eq("id", user.id);

    if (error) {
      setErrorMessage(`Não foi possível atualizar o usuário: ${error.message}`);
      setSavingUserId(null);
      return;
    }

    if (user.cliente_id) {
      const { error: vinculoError } = await supabase
        .from("profile_clientes")
        .upsert(
          {
            profile_id: user.id,
            cliente_id: user.cliente_id,
            papel: roleDescriptions[user.role],
            cliente_principal: true,
            ativo: true,
          },
          { onConflict: "profile_id,cliente_id" }
        );

      if (vinculoError) {
        setErrorMessage(
          `Usuário atualizado, mas o vínculo com cliente falhou: ${vinculoError.message}`
        );
        setSavingUserId(null);
        return;
      }
    }

    setMessage("Acesso atualizado com sucesso.");
    setSavingUserId(null);
  }

  async function salvarNovoAcesso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingInvite(true);
    setMessage("");
    setErrorMessage("");

    const email = newAccessForm.email.trim().toLowerCase();
    const existingUser = users.find(
      (user) => user.email.trim().toLowerCase() === email
    );

    if (
      !newAccessForm.nome.trim() ||
      !email ||
      !newAccessForm.role ||
      !newAccessForm.clienteId
    ) {
      setErrorMessage("Preencha nome, e-mail, perfil e cliente.");
      setSavingInvite(false);
      return;
    }

    if (existingUser) {
      const updatedUser: AdminUser = {
        ...existingUser,
        nome: newAccessForm.nome.trim(),
        role: newAccessForm.role,
        cargo: newAccessForm.cargo.trim() || null,
        cliente_id: newAccessForm.clienteId,
        area_id: newAccessForm.areaId || null,
        ativo: true,
      };

      updateUser(existingUser.id, updatedUser);
      await salvarUsuario(updatedUser);
      setNewAccessForm(emptyAccessForm);
      setNewAccessOpen(false);
      setSavingInvite(false);
      return;
    }

    const invitePayload = {
      nome: newAccessForm.nome.trim(),
      email,
      role: newAccessForm.role,
      cargo: newAccessForm.cargo.trim() || null,
      cliente_id: newAccessForm.clienteId,
      area_id: newAccessForm.areaId || null,
      status: "pendente",
    };

    const { error: functionError } = await supabase.functions.invoke(
      "admin-access-invite",
      {
        body: {
          ...invitePayload,
          redirectTo: window.location.origin,
        },
      }
    );

    if (!functionError) {
      setMessage("Convite enviado por e-mail e registrado com sucesso.");
      setNewAccessForm(emptyAccessForm);
      setNewAccessOpen(false);
      setSavingInvite(false);
      await carregarDados();
      return;
    }

    const { error } = await supabase.from("convites_acesso").upsert(
      invitePayload,
      { onConflict: "email" }
    );

    if (error) {
      setErrorMessage(
        `Não foi possível registrar o convite. Verifique se a migração de Administração já foi rodada no Supabase. Detalhe: ${error.message}`
      );
      setSavingInvite(false);
      return;
    }

    setMessage(
      "Convite pendente registrado. O envio automático por e-mail será ativado pela função segura do Supabase."
    );
    setNewAccessForm(emptyAccessForm);
    setNewAccessOpen(false);
    setSavingInvite(false);
    await carregarDados();
  }

  if (loading) {
    return <p className="text-sm font-medium text-slate-500">Carregando administração...</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Administração
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Usuários e acessos
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
            Gerencie diretoria, gestores e colaboradores vinculados aos clientes
            da plataforma.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewAccessOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
        >
          <UserPlus size={18} />
          Novo acesso
        </button>
      </header>

      {(message || errorMessage) && (
        <div
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            errorMessage
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {errorMessage ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{errorMessage || message}</span>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          icon={<Users size={20} />}
          label="Usuários ativos"
          value={activeUsers.toString()}
          helper={`${users.length} cadastro(s) no total`}
        />
        <MetricCard
          icon={<ShieldCheck size={20} />}
          label="Perfis de gestão"
          value={managementUsers.toString()}
          helper="Diretoria, gestores e admins"
        />
        <MetricCard
          icon={<Mail size={20} />}
          label="Convites pendentes"
          value={pendingInvites.toString()}
          helper="Aguardando ativação de acesso"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Acessos cadastrados</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Altere perfil, cliente, setor e status dos usuários existentes.
            </p>
          </div>
          <label className="relative w-full lg:w-80">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome, e-mail ou perfil"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Perfil</th>
                <th className="px-5 py-3">Cargo</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Setor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-950">{user.nome}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {user.email}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <Select
                      value={user.role}
                      onChange={(value) =>
                        updateUser(user.id, { role: value as Role })
                      }
                      options={editableRoles.map((role) => ({
                        value: role,
                        label: roleDescriptions[role],
                      }))}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <Input
                      value={user.cargo ?? ""}
                      placeholder="Cargo"
                      onChange={(value) => updateUser(user.id, { cargo: value })}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <Select
                      value={user.cliente_id ?? ""}
                      onChange={(value) =>
                        updateUser(user.id, { cliente_id: value || null })
                      }
                      options={[
                        { value: "", label: "Sem cliente" },
                        ...clientes.map((cliente) => ({
                          value: cliente.id,
                          label: cliente.nome,
                        })),
                      ]}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <Select
                      value={user.area_id ?? ""}
                      onChange={(value) =>
                        updateUser(user.id, { area_id: value || null })
                      }
                      options={[
                        { value: "", label: "Sem setor" },
                        ...areas.map((area) => ({
                          value: area.id,
                          label: area.nome,
                        })),
                      ]}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <label className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={user.ativo}
                        onChange={(event) =>
                          updateUser(user.id, { ativo: event.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      {user.ativo ? "Ativo" : "Inativo"}
                    </label>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => void salvarUsuario(user)}
                      disabled={savingUserId === user.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={15} />
                      {savingUserId === user.id ? "Salvando..." : "Salvar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {invites.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Convites pendentes</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="font-bold text-slate-950">{invite.nome}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {invite.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                    {roleDescriptions[invite.role]}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                    {invite.status}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  {clientesMap.get(invite.cliente_id ?? "") ?? "Cliente não definido"}{" "}
                  · {areasMap.get(invite.area_id ?? "") ?? "Setor não definido"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {newAccessOpen && (
        <NewAccessModal
          form={newAccessForm}
          clientes={clientes}
          areas={areas}
          saving={savingInvite}
          onChange={setNewAccessForm}
          onClose={() => setNewAccessOpen(false)}
          onSubmit={salvarNovoAcesso}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-4 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-3 text-sm font-medium text-slate-500">{helper}</p>
        </div>
        <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">{icon}</span>
      </div>
    </div>
  );
}

function NewAccessModal({
  form,
  clientes,
  areas,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  form: AccessForm;
  clientes: Cliente[];
  areas: AreaCadastro[];
  saving: boolean;
  onChange: (form: AccessForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">Novo acesso</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Cadastre gestores, diretoria ou colaboradores e deixe o convite
            pendente para ativação.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome" required>
              <Input
                value={form.nome}
                placeholder="Nome completo"
                onChange={(value) => onChange({ ...form, nome: value })}
              />
            </Field>
            <Field label="E-mail" required>
              <Input
                value={form.email}
                placeholder="email@empresa.com.br"
                onChange={(value) => onChange({ ...form, email: value })}
              />
            </Field>
            <Field label="Perfil de acesso" required>
              <Select
                value={form.role}
                onChange={(value) => onChange({ ...form, role: value as Role })}
                options={accessRoles.map((role) => ({
                  value: role,
                  label: roleDescriptions[role],
                }))}
              />
            </Field>
            <Field label="Cargo">
              <Input
                value={form.cargo}
                placeholder="Ex.: Gestora Contábil"
                onChange={(value) => onChange({ ...form, cargo: value })}
              />
            </Field>
            <Field label="Cliente" required>
              <Select
                value={form.clienteId}
                onChange={(value) => onChange({ ...form, clienteId: value })}
                options={[
                  { value: "", label: "Selecione" },
                  ...clientes.map((cliente) => ({
                    value: cliente.id,
                    label: cliente.nome,
                  })),
                ]}
              />
            </Field>
            <Field label="Setor">
              <Select
                value={form.areaId}
                onChange={(value) => onChange({ ...form, areaId: value })}
                options={[
                  { value: "", label: "Sem setor" },
                  ...areas.map((area) => ({
                    value: area.id,
                    label: area.nome,
                  })),
                ]}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-800 md:grid-cols-2">
            <InfoItem
              icon={<Building2 size={17} />}
              text="Se o e-mail já existir, o acesso será atualizado."
            />
            <InfoItem
              icon={<Mail size={17} />}
              text="Se for novo, ficará como convite pendente."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar acesso"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label} {required && <span className="text-blue-600">*</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Input({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function InfoItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-2">
      {icon}
      {text}
    </span>
  );
}
