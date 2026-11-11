import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type InvitePayload = {
  nome?: string;
  email?: string;
  role?: string;
  cargo?: string | null;
  cliente_id?: string | null;
  area_id?: string | null;
  redirectTo?: string;
};

const allowedRoles = new Set([
  "COLABORADOR",
  "GESTOR",
  "DIRETOR",
  "ADMIN",
  "SUPERADMIN",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: "Configuração administrativa do Supabase ausente." },
      500
    );
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return jsonResponse({ error: "Sessão não informada." }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(authorization.replace("Bearer ", ""));

  if (userError || !user) {
    return jsonResponse({ error: "Sessão inválida." }, 401);
  }

  const { data: callerProfile, error: callerError } = await supabaseAdmin
    .from("profiles")
    .select("id,role")
    .eq("user_id", user.id)
    .single();

  if (
    callerError ||
    !callerProfile ||
    !["ADMIN", "SUPERADMIN"].includes(callerProfile.role)
  ) {
    return jsonResponse({ error: "Acesso administrativo necessário." }, 403);
  }

  const payload = (await req.json()) as InvitePayload;
  const nome = payload.nome?.trim();
  const email = payload.email?.trim().toLowerCase();
  const role = payload.role?.trim().toUpperCase() ?? "COLABORADOR";

  if (!nome || !email || !allowedRoles.has(role)) {
    return jsonResponse({ error: "Dados de convite inválidos." }, 400);
  }

  const inviteRecord = {
    nome,
    email,
    role,
    cargo: payload.cargo?.trim() || null,
    cliente_id: payload.cliente_id || null,
    area_id: payload.area_id || null,
    status: "pendente",
    invited_by_profile_id: callerProfile.id,
  };

  const { error: inviteError } = await supabaseAdmin
    .from("convites_acesso")
    .upsert(inviteRecord, { onConflict: "email" });

  if (inviteError) {
    return jsonResponse({ error: inviteError.message }, 500);
  }

  const { error: authError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nome,
        role,
        cargo: inviteRecord.cargo,
        cliente_id: inviteRecord.cliente_id,
        area_id: inviteRecord.area_id,
      },
      redirectTo: payload.redirectTo || Deno.env.get("SITE_URL") || undefined,
    });

  if (authError) {
    return jsonResponse({ error: authError.message }, 500);
  }

  return jsonResponse({ ok: true });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
