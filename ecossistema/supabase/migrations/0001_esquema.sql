-- Ecossistema Martt · esquema do banco (Supabase / Postgres)
-- Rode este arquivo uma vez no SQL Editor do Supabase e depois o supabase/seed.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type nivel_acesso as enum ('direcao', 'time', 'leitura');
create type estado_demanda as enum ('a_fazer', 'em_producao', 'em_revisao', 'com_o_cliente', 'aprovado', 'publicado');
create type tipo_demanda as enum ('tarefa', 'conteudo');

-- ---------------------------------------------------------------------------
-- Tabelas de configuração
-- ---------------------------------------------------------------------------
create table papeis (
  id          text primary key check (id ~ '^[a-z0-9_-]+$'),
  nome        text not null,
  sigla       text not null default '',
  cor         text not null default '#8D8B82',
  cor_escura  text not null default '#A3A198',
  missao      text not null default '',
  entrega     text not null default '',
  recebe_de   text not null default '',
  passa_para  text not null default '',
  metrica     text not null default '',
  ordem       int  not null default 0
);

create table pessoas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users (id) on delete set null,
  nome       text not null,
  email      text,
  papel_id   text references papeis (id) on delete set null,
  nivel      nivel_acesso not null default 'time',
  ativo      boolean not null default true,
  criada_em  timestamptz not null default now()
);
create unique index pessoas_email_unico on pessoas (lower(email));

create table clientes (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null check (length(trim(nome)) > 0),
  ativo           boolean not null default true,
  segmento        text not null default '',
  perfil_canais   text not null default '',
  responsavel     text not null default '',
  objetivo_mes    text not null default '',
  publico         text not null default '',
  posicionamento  text not null default '',
  frequencia      text not null default '',
  gravacao        text not null default '',
  formatos        text not null default '',
  aprovador       text not null default '',
  prazo_resposta  text not null default '',
  pasta           text not null default '',
  quadro          text not null default '',
  canal           text not null default '',
  indicador       text not null default '',
  fonte_metrica   text not null default '',
  criado_em       timestamptz not null default now()
);

create table etapas (
  id             int primary key,
  ordem          int not null default 0,
  nome           text not null,
  descricao      text not null default '',
  responsaveis   text[] not null default '{}', -- ids de papeis
  quando         text not null default '',
  pronto_quando  text not null default ''
);

create table modelo_dias (
  dia     smallint primary key check (dia between 1 and 7), -- 1 = segunda
  nome    text not null,
  sigla   text not null,
  funcao  text not null default ''
);

create table modelo_demandas (
  id        uuid primary key default gen_random_uuid(),
  dia       smallint not null references modelo_dias (dia) on delete cascade,
  horario   text check (horario is null or horario ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  titulo    text not null check (length(trim(titulo)) > 0),
  local     text not null default '',
  tipo      tipo_demanda not null default 'tarefa',
  etapa_id  int references etapas (id) on delete set null,
  papeis    text[] not null default '{}', -- ids de papeis
  clientes  uuid[] not null default '{}', -- ids de clientes
  ordem     int not null default 0
);

create table rituais (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  quando        text not null default '',
  duracao       text not null default '',
  participantes text not null default '',
  saida         text not null default '',
  ordem         int not null default 0
);

create table regras (
  id      uuid primary key default gen_random_uuid(),
  grupo   text not null check (grupo in ('comunicacao', 'padroes', 'primeira_semana', 'metodo', 'cliente', 'martt')),
  texto   text not null,
  detalhe text not null default '',
  ordem   int not null default 0
);

-- ---------------------------------------------------------------------------
-- Demandas
-- ---------------------------------------------------------------------------
create table demandas (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (length(trim(titulo)) > 0),
  data          date not null,
  horario       text check (horario is null or horario ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  local         text not null default '',
  tipo          tipo_demanda not null default 'tarefa',
  estado        estado_demanda not null default 'a_fazer',
  etapa_id      int references etapas (id) on delete set null,
  concluida_em  timestamptz,
  criada_por    uuid references pessoas (id) on delete set null,
  ordem         int not null default 0,
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index demandas_data on demandas (data);

create table demanda_responsaveis (
  id         uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references demandas (id) on delete cascade,
  papel_id   text references papeis (id) on delete cascade,
  pessoa_id  uuid references pessoas (id) on delete cascade,
  check (papel_id is not null or pessoa_id is not null)
);
create index demanda_responsaveis_demanda on demanda_responsaveis (demanda_id);

create table demanda_clientes (
  demanda_id uuid not null references demandas (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  primary key (demanda_id, cliente_id)
);
create index demanda_clientes_cliente on demanda_clientes (cliente_id);

-- Fase 2 (kanban com histórico): cada mudança de estado fica registrada aqui.
create table demanda_historico (
  id         bigint generated always as identity primary key,
  demanda_id uuid not null references demandas (id) on delete cascade,
  estado     estado_demanda not null,
  pessoa_id  uuid references pessoas (id) on delete set null,
  em         timestamptz not null default now()
);
create index demanda_historico_demanda on demanda_historico (demanda_id);

-- ---------------------------------------------------------------------------
-- Quem sou eu (usadas pelas políticas de acesso)
-- ---------------------------------------------------------------------------
create function minha_pessoa_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from pessoas where user_id = auth.uid() and ativo
$$;

create function meu_nivel() returns nivel_acesso
language sql stable security definer set search_path = public as $$
  select nivel from pessoas where user_id = auth.uid() and ativo
$$;

create function meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel_id from pessoas where user_id = auth.uid() and ativo
$$;

create function sou_membro() returns boolean
language sql stable as $$ select meu_nivel() is not null $$;

create function sou_direcao() returns boolean
language sql stable as $$ select coalesce(meu_nivel() = 'direcao', false) $$;

-- Direção edita tudo. Time edita o que criou ou onde é responsável (por pessoa ou pelo papel).
create function pode_editar_demanda(d uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select sou_direcao() or (
    meu_nivel() = 'time' and exists (
      select 1 from demandas x
      where x.id = d and (
        x.criada_por = minha_pessoa_id()
        or exists (
          select 1 from demanda_responsaveis r
          where r.demanda_id = x.id
            and (r.pessoa_id = minha_pessoa_id() or r.papel_id = meu_papel())
        )
      )
    )
  )
$$;

-- ---------------------------------------------------------------------------
-- Regra do "concluído"
--   Tarefa: o check da tela Semana encerra a demanda (concluida_em).
--   Conteúdo: concluída = estado Publicado. Marcar o check publica;
--   desmarcar volta para Aprovado; mudar o estado para fora de Publicado desmarca.
-- ---------------------------------------------------------------------------
create function demandas_antes_de_gravar() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.tipo = 'conteudo' then
      if new.estado = 'publicado' then
        new.concluida_em := coalesce(new.concluida_em, now());
      elsif new.concluida_em is not null then
        new.estado := 'publicado';
      end if;
    end if;
    return new;
  end if;

  if new.tipo = 'conteudo' then
    if new.concluida_em is distinct from old.concluida_em then
      if new.concluida_em is not null then
        new.estado := 'publicado';
      elsif new.estado = 'publicado' then
        new.estado := 'aprovado';
      end if;
    elsif new.estado is distinct from old.estado then
      new.concluida_em := case when new.estado = 'publicado' then now() end;
    elsif new.estado = 'publicado' and new.concluida_em is null then
      new.concluida_em := now();
    elsif new.estado <> 'publicado' and new.concluida_em is not null then
      new.estado := 'publicado';
    end if;
  end if;
  new.atualizada_em := now();
  return new;
end $$;

create trigger demandas_antes_de_gravar
before insert or update on demandas
for each row execute function demandas_antes_de_gravar();

create function demandas_registrar_estado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into demanda_historico (demanda_id, estado, pessoa_id)
    values (new.id, new.estado, minha_pessoa_id());
  end if;
  return null;
end $$;

create trigger demandas_registrar_estado
after insert or update of estado on demandas
for each row execute function demandas_registrar_estado();

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------------

-- Cria ou salva uma demanda com responsáveis e clientes, numa transação só.
create function salvar_demanda(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if v_id is null then
    if not (sou_direcao() or meu_nivel() = 'time') then
      raise exception 'Sem permissão para criar demandas' using errcode = '42501';
    end if;
    insert into demandas (titulo, data, horario, local, tipo, estado, etapa_id, concluida_em, ordem, criada_por)
    values (
      p ->> 'titulo',
      (p ->> 'data')::date,
      nullif(p ->> 'horario', ''),
      coalesce(p ->> 'local', ''),
      coalesce(nullif(p ->> 'tipo', ''), 'tarefa')::tipo_demanda,
      coalesce(nullif(p ->> 'estado', ''), 'a_fazer')::estado_demanda,
      nullif(p ->> 'etapa_id', '')::int,
      nullif(p ->> 'concluida_em', '')::timestamptz,
      coalesce(nullif(p ->> 'ordem', '')::int, 0),
      minha_pessoa_id()
    )
    returning id into v_id;
  else
    if not pode_editar_demanda(v_id) then
      raise exception 'Sem permissão para editar esta demanda' using errcode = '42501';
    end if;
    update demandas set
      titulo       = p ->> 'titulo',
      data         = (p ->> 'data')::date,
      horario      = nullif(p ->> 'horario', ''),
      local        = coalesce(p ->> 'local', ''),
      tipo         = coalesce(nullif(p ->> 'tipo', ''), 'tarefa')::tipo_demanda,
      estado       = coalesce(nullif(p ->> 'estado', ''), 'a_fazer')::estado_demanda,
      etapa_id     = nullif(p ->> 'etapa_id', '')::int,
      concluida_em = nullif(p ->> 'concluida_em', '')::timestamptz,
      ordem        = coalesce(nullif(p ->> 'ordem', '')::int, 0)
    where id = v_id;
  end if;

  delete from demanda_responsaveis where demanda_id = v_id;
  insert into demanda_responsaveis (demanda_id, papel_id, pessoa_id)
  select v_id, nullif(r ->> 'papel_id', ''), nullif(r ->> 'pessoa_id', '')::uuid
  from jsonb_array_elements(coalesce(p -> 'responsaveis', '[]'::jsonb)) r
  where nullif(r ->> 'papel_id', '') is not null or nullif(r ->> 'pessoa_id', '') is not null;

  delete from demanda_clientes where demanda_id = v_id;
  insert into demanda_clientes (demanda_id, cliente_id)
  select distinct v_id, c::uuid
  from jsonb_array_elements_text(coalesce(p -> 'clientes', '[]'::jsonb)) c;

  return v_id;
end $$;

-- Cria várias demandas de uma vez (gerar a semana a partir do modelo).
create function gerar_semana(itens jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  n int := 0;
begin
  if not sou_direcao() then
    raise exception 'Só a Direção gera a semana' using errcode = '42501';
  end if;
  for item in select * from jsonb_array_elements(itens) loop
    perform salvar_demanda(item - 'id');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Ligação entre login (auth.users) e pessoa do time
--   1. Se existe pessoa com o mesmo e-mail, liga.
--   2. Se ainda não há ninguém da Direção com login, o primeiro usuário vira a Direção
--      (assume a pessoa "Marcio" do seed).
--   3. Caso contrário, o login fica sem acesso até a Direção cadastrar o e-mail.
-- ---------------------------------------------------------------------------
create function vincular_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v uuid;
begin
  update pessoas set user_id = new.id
  where user_id is null and lower(email) = lower(new.email)
  returning id into v;

  if v is null and not exists (select 1 from pessoas where user_id is not null and nivel = 'direcao') then
    update pessoas set user_id = new.id, email = coalesce(email, new.email)
    where id = (
      select id from pessoas
      where user_id is null and nivel = 'direcao' and ativo
      order by criada_em limit 1
    )
    returning id into v;

    if v is null then
      insert into pessoas (user_id, nome, email, nivel, papel_id)
      values (new.id, split_part(new.email, '@', 1), new.email, 'direcao', null);
    end if;
  end if;
  return new;
end $$;

create trigger vincular_usuario
after insert on auth.users
for each row execute function vincular_usuario();

-- Quando a Direção cadastra uma pessoa com e-mail de um login que já existe, liga na hora.
create function pessoas_ligar_login() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null and new.email is not null then
    select u.id into new.user_id
    from auth.users u
    where lower(u.email) = lower(new.email)
      and not exists (select 1 from pessoas p where p.user_id = u.id and p.id <> new.id)
    limit 1;
  end if;
  return new;
end $$;

create trigger pessoas_ligar_login
before insert or update of email on pessoas
for each row execute function pessoas_ligar_login();

-- ---------------------------------------------------------------------------
-- Acesso (RLS)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['papeis', 'pessoas', 'clientes', 'etapas', 'modelo_dias', 'modelo_demandas', 'rituais', 'regras'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "membros leem" on %I for select to authenticated using (sou_membro())', t);
    execute format('create policy "direcao insere" on %I for insert to authenticated with check (sou_direcao())', t);
    execute format('create policy "direcao edita" on %I for update to authenticated using (sou_direcao()) with check (sou_direcao())', t);
    execute format('create policy "direcao exclui" on %I for delete to authenticated using (sou_direcao())', t);
  end loop;
end $$;

-- Cada pessoa sempre enxerga o próprio cadastro (para saber se tem acesso).
create policy "eu me leio" on pessoas for select to authenticated using (user_id = auth.uid());

alter table demandas enable row level security;
create policy "membros leem" on demandas for select to authenticated using (sou_membro());
create policy "time cria" on demandas for insert to authenticated
  with check (sou_direcao() or (meu_nivel() = 'time' and criada_por = minha_pessoa_id()));
create policy "quem pode edita" on demandas for update to authenticated
  using (pode_editar_demanda(id)) with check (sou_direcao() or meu_nivel() = 'time');
create policy "quem pode exclui" on demandas for delete to authenticated using (pode_editar_demanda(id));

alter table demanda_responsaveis enable row level security;
create policy "membros leem" on demanda_responsaveis for select to authenticated using (sou_membro());
create policy "quem pode grava" on demanda_responsaveis for all to authenticated
  using (pode_editar_demanda(demanda_id)) with check (pode_editar_demanda(demanda_id));

alter table demanda_clientes enable row level security;
create policy "membros leem" on demanda_clientes for select to authenticated using (sou_membro());
create policy "quem pode grava" on demanda_clientes for all to authenticated
  using (pode_editar_demanda(demanda_id)) with check (pode_editar_demanda(demanda_id));

alter table demanda_historico enable row level security;
create policy "membros leem" on demanda_historico for select to authenticated using (sou_membro());

revoke execute on function salvar_demanda(jsonb), gerar_semana(jsonb) from public;
grant execute on function salvar_demanda(jsonb), gerar_semana(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Tempo real: o app escuta mudanças nestas tabelas e atualiza a tela.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      papeis, pessoas, clientes, etapas, modelo_dias, modelo_demandas, rituais, regras,
      demandas, demanda_responsaveis, demanda_clientes;
  end if;
end $$;
