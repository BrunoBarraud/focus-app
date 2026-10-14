-- ==============================================================================
-- MIGRACIÓN: auditoría de seguridad + unificación del modelo de datos
-- ------------------------------------------------------------------------------
-- Ejecutar UNA vez en el SQL Editor de Supabase (o con `supabase db push`).
-- Es idempotente: se puede volver a correr sin romper nada.
--
-- Qué hace:
--   1. Rol de admin basado en app_metadata (no editable por el usuario).
--   2. Protege user_settings.role y agrega timezone.
--   3. Resetea TODAS las políticas RLS de las tablas de la app y las recrea.
--   4. Crea las tablas que faltaban: dreams, event_completions,
--      goal_milestones, notifications.
--   5. Migra la tabla legacy `tasks` a `calendar_events`.
--   6. Restricciones únicas para evitar duplicados (rueda de la vida, push).
--   7. Trigger de alta de usuario sin datos de desarrollo.
--   8. Función para reclamar notificaciones pendientes (outbox del cron).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADMIN VÍA app_metadata
-- ------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- Admin inicial (el dueño del proyecto). Para agregar otros admins, repetir
-- este UPDATE con su email desde el SQL Editor.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = 'brunobarraud15@gmail.com';

-- Limpiar el vector de escalada anterior: el rol en user_metadata ya no se usa.
update auth.users
set raw_user_meta_data = raw_user_meta_data - 'role'
where raw_user_meta_data ? 'role';

-- ------------------------------------------------------------------------------
-- 2. user_settings: rol protegido + zona horaria
-- ------------------------------------------------------------------------------
alter table public.user_settings
  add column if not exists timezone text not null default 'America/Argentina/Buenos_Aires';

create or replace function public.protect_user_settings_role()
returns trigger
language plpgsql
as $$
begin
  -- Solo las requests de usuarios finales están restringidas; el SQL Editor y
  -- la service role pueden cambiar el rol libremente.
  if coalesce(auth.role(), '') = 'authenticated' then
    if tg_op = 'INSERT' then
      new.role := 'user';
    elsif new.role is distinct from old.role then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_user_settings_role on public.user_settings;
create trigger protect_user_settings_role
  before insert or update on public.user_settings
  for each row execute function public.protect_user_settings_role();

-- ------------------------------------------------------------------------------
-- 3. TABLAS NUEVAS
-- ------------------------------------------------------------------------------

-- 3.1 Sueños (la tabla nunca se había creado en producción)
create table if not exists public.dreams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  category text not null default 'Experiencias'
    check (category in ('Viajes', 'Finanzas', 'Experiencias', 'Impacto', 'Creatividad')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  target_year int check (target_year between 1900 and 2200),
  created_at timestamptz not null default now()
);
create index if not exists dreams_user_idx on public.dreams (user_id, created_at desc);

-- 3.2 calendar_events: columnas que la app necesita
alter table public.calendar_events add column if not exists estimated_minutes int;
alter table public.calendar_events add column if not exists legacy_task_id uuid;
alter table public.calendar_events alter column is_recurring set default false;

-- Todo lo que se creó antes sin fecha era, de hecho, semanal.
update public.calendar_events
set is_recurring = true
where date is null and (is_recurring is null or is_recurring = false);

update public.calendar_events set is_recurring = false where is_recurring is null;

create unique index if not exists calendar_events_legacy_task_uidx
  on public.calendar_events (legacy_task_id) where legacy_task_id is not null;
create index if not exists calendar_events_user_idx on public.calendar_events (user_id);

-- 3.3 Completados por ocurrencia (una tarea semanal se completa por fecha,
--     no "para siempre").
create table if not exists public.event_completions (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (event_id, date)
);
create index if not exists event_completions_user_date_idx on public.event_completions (user_id, date);

-- Eventos puntuales que ya estaban completados -> completion en su fecha.
insert into public.event_completions (event_id, user_id, date)
select e.id, e.user_id, e.date
from public.calendar_events e
where e.status = 'completed' and e.date is not null
on conflict do nothing;

-- 3.4 Hitos reales de metas
create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  completed boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists goal_milestones_goal_idx on public.goal_milestones (goal_id, position);

-- Backfill: las metas existentes reciben los hitos que antes se "inventaban"
-- a partir del progreso, para que nadie vea su meta vaciarse.
insert into public.goal_milestones (goal_id, user_id, title, completed, position)
select g.id, g.user_id, m.title, coalesce(g.progress, 0) > m.threshold, m.position
from public.goals g
cross join (values
  ('Definir plan estratégico', 30, 0),
  ('Ejecutar fase intermedia', 70, 1),
  ('Consolidación final', 99.99, 2)
) as m(title, threshold, position)
where g.type in ('personal', 'profesional')
  and not exists (select 1 from public.goal_milestones gm where gm.goal_id = g.id);

-- 3.5 Notificaciones (outbox + bandeja in-app)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.calendar_events(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  url text not null default '/dashboard',
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'expired')),
  attempts int not null default 0,
  locked_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (event_id, kind, scheduled_for)
);
create index if not exists notifications_due_idx
  on public.notifications (scheduled_for) where status in ('pending', 'sending');
create index if not exists notifications_user_idx
  on public.notifications (user_id, scheduled_for desc);

-- Los usuarios solo pueden marcar como leída (no tocar contenido ni estado).
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Realtime para la campana in-app.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ------------------------------------------------------------------------------
-- 4. MIGRAR `tasks` (legacy) -> `calendar_events`
-- ------------------------------------------------------------------------------
insert into public.calendars (user_id, name)
select distinct t.user_id, 'General'
from public.tasks t
where not exists (select 1 from public.calendars c where c.user_id = t.user_id);

insert into public.calendar_events (
  user_id, calendar_id, title, description, date, days_of_week, is_recurring,
  start_time, priority, tag, estimated_minutes, status, created_at, legacy_task_id
)
select
  t.user_id,
  (select c.id from public.calendars c where c.user_id = t.user_id order by c.created_at limit 1),
  t.title,
  nullif(trim(regexp_replace(coalesce(t.description, ''), '^@time:[^\n]*\n?', '')), ''),
  t.scheduled_date,
  array[coalesce(
    t.day_of_week,
    (array['D','L','M','X','J','V','S'])[extract(dow from t.scheduled_date)::int + 1]
  )],
  t.scheduled_date is null,
  substring(t.description from '^@time:\s*(\d{1,2}:\d{2})')::time,
  coalesce(t.priority, 'medium'),
  coalesce(t.tag, 'General'),
  t.estimated_minutes,
  'pending',
  t.created_at,
  t.id
from public.tasks t
where not exists (select 1 from public.calendar_events e where e.legacy_task_id = t.id);

insert into public.event_completions (event_id, user_id, date)
select e.id, e.user_id, t.scheduled_date
from public.tasks t
join public.calendar_events e on e.legacy_task_id = t.id
where t.status = 'completed' and t.scheduled_date is not null
on conflict do nothing;

-- La tabla `tasks` queda como respaldo. Cuando verifiques que todo migró bien:
--   drop table public.tasks;

-- ------------------------------------------------------------------------------
-- 5. RESTRICCIONES ÚNICAS
-- ------------------------------------------------------------------------------

-- 5.1 Rueda de la vida: borrar áreas duplicadas y evitar que vuelvan a aparecer.
delete from public.goals g
where g.type = 'rueda'
  and g.id not in (
    select distinct on (user_id, title) id
    from public.goals
    where type = 'rueda'
    order by user_id, title, created_at
  );
create unique index if not exists goals_rueda_unique_idx
  on public.goals (user_id, title) where type = 'rueda';

-- 5.2 Push: un endpoint pertenece a UN solo usuario (el último que lo registró).
delete from public.push_subscriptions p
where p.id not in (
  select distinct on (endpoint) id
  from public.push_subscriptions
  order by endpoint, created_at desc
);
alter table public.push_subscriptions add column if not exists last_seen_at timestamptz not null default now();
alter table public.push_subscriptions drop constraint if exists push_subscriptions_user_id_endpoint_key;
do $$
begin
  alter table public.push_subscriptions add constraint push_subscriptions_endpoint_key unique (endpoint);
exception when duplicate_table or duplicate_object then null;
end $$;

-- Registrar este navegador para el usuario actual. Si otra cuenta lo había
-- registrado antes (dispositivo compartido), la fila pasa al usuario actual:
-- con RLS un upsert común no puede tocar la fila ajena, por eso es SECURITY
-- DEFINER y opera siempre sobre auth.uid().
create or replace function public.register_push_subscription(
  p_endpoint text,
  p_auth_key text,
  p_p256dh_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, auth_key, p256dh_key, last_seen_at)
  values (auth.uid(), p_endpoint, p_auth_key, p_p256dh_key, now())
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        auth_key = excluded.auth_key,
        p256dh_key = excluded.p256dh_key,
        last_seen_at = now();
end;
$$;

revoke execute on function public.register_push_subscription(text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 6. RLS: RESET COMPLETO + POLÍTICAS CORRECTAS
-- ------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'user_settings', 'habits', 'habit_logs', 'tasks', 'goals', 'goal_milestones',
        'dreams', 'calendars', 'calendar_events', 'event_completions',
        'push_subscriptions', 'support_feedback', 'notifications'
      )
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.user_settings      enable row level security;
alter table public.habits             enable row level security;
alter table public.habit_logs         enable row level security;
alter table public.tasks              enable row level security;
alter table public.goals              enable row level security;
alter table public.goal_milestones    enable row level security;
alter table public.dreams             enable row level security;
alter table public.calendars          enable row level security;
alter table public.calendar_events    enable row level security;
alter table public.event_completions  enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.support_feedback   enable row level security;
alter table public.notifications      enable row level security;

-- Tablas "dueño = auth.uid()"
create policy "own_select" on public.user_settings for select using (auth.uid() = user_id);
create policy "own_insert" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "own_update" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_all" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_all" on public.tasks  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_all" on public.goals  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_all" on public.dreams for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_all" on public.calendars for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_all" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- habit_logs: la propiedad se valida a través del hábito
create policy "own_via_habit" on public.habit_logs for all
  using (exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from public.habits h where h.id = habit_logs.habit_id and h.user_id = auth.uid()));

-- calendar_events: además, el calendario tiene que ser del usuario
create policy "own_all" on public.calendar_events for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.calendars c where c.id = calendar_events.calendar_id and c.user_id = auth.uid())
  );

create policy "own_all" on public.event_completions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.calendar_events e where e.id = event_completions.event_id and e.user_id = auth.uid())
  );

create policy "own_all" on public.goal_milestones for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.goals g where g.id = goal_milestones.goal_id and g.user_id = auth.uid())
  );

-- notifications: lectura y "marcar leída" propias; la escritura la hace el cron
create policy "own_select" on public.notifications for select using (auth.uid() = user_id);
create policy "own_mark_read" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- support_feedback
create policy "feedback_select" on public.support_feedback for select
  using (auth.uid() = user_id or public.is_admin());
create policy "feedback_insert" on public.support_feedback for insert
  with check (auth.uid() = user_id and status = 'pending' and admin_response is null);
create policy "feedback_update_admin" on public.support_feedback for update
  using (public.is_admin()) with check (public.is_admin());
create policy "feedback_delete_admin" on public.support_feedback for delete
  using (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. ALTA DE USUARIO (sin datos de desarrollo, con seed real)
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birth date;
  v_tz text;
begin
  begin
    v_birth := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;

  v_tz := coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'America/Argentina/Buenos_Aires');
  begin
    perform now() at time zone v_tz;
  exception when others then
    v_tz := 'America/Argentina/Buenos_Aires';
  end;

  insert into public.user_settings (
    user_id, email, role, birth_date, target_age,
    daily_mission, daily_pillar, daily_frog, energy_level, timezone
  ) values (
    new.id, new.email, 'user', coalesce(v_birth, date '1995-01-01'), 80,
    'Definí la misión principal de hoy.',
    'Disciplina & Presencia',
    'Elegí la tarea más importante del día.',
    'high', v_tz
  )
  on conflict (user_id) do update set email = excluded.email;

  if not exists (select 1 from public.habits where user_id = new.id) then
    insert into public.habits (user_id, title, category, monthly_target_days, color) values
      (new.id, 'Deep Work (2 horas sin distracciones)', 'trabajo', 22, '#10b981'),
      (new.id, 'Ejercicio físico o caminata', 'cuerpo', 20, '#f97316'),
      (new.id, 'Lectura o aprendizaje (20m)', 'mente', 25, '#8b5cf6');
  end if;

  if not exists (select 1 from public.calendars where user_id = new.id) then
    insert into public.calendars (user_id, name) values (new.id, 'General');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 8. OUTBOX DE NOTIFICACIONES
-- ------------------------------------------------------------------------------
-- Reclama atómicamente un lote de notificaciones vencidas. Dos ejecuciones
-- concurrentes del cron nunca reciben la misma fila (FOR UPDATE SKIP LOCKED).
-- Las que quedaron en 'sending' por un crash se reintentan a los 5 minutos.
create or replace function public.claim_due_notifications(
  batch_size int default 100,
  max_age interval default interval '20 minutes'
)
returns setof public.notifications
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No tiene sentido avisar "empieza en 5 minutos" una hora tarde.
  update public.notifications
  set status = 'expired', locked_at = null
  where status in ('pending', 'sending')
    and scheduled_for < now() - max_age;

  return query
  update public.notifications n
  set status = 'sending', attempts = n.attempts + 1, locked_at = now()
  where n.id in (
    select id from public.notifications
    where scheduled_for <= now()
      and (status = 'pending' or (status = 'sending' and locked_at < now() - interval '5 minutes'))
      and attempts < 5
    order by scheduled_for
    limit batch_size
    for update skip locked
  )
  returning n.*;
end;
$$;

revoke execute on function public.claim_due_notifications(int, interval) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(int, interval) to service_role;

-- ------------------------------------------------------------------------------
-- 9. DISPARAR EL CRON CADA MINUTO (opcional, recomendado)
-- ------------------------------------------------------------------------------
-- Vercel Hobby solo permite crons diarios. Para recordatorios reales hay que
-- llamar a /api/cron cada minuto. Con pg_cron + pg_net de Supabase:
--
--   1. Database > Extensions: habilitar pg_cron y pg_net.
--   2. Reemplazar TU-DOMINIO y TU-CRON-SECRET y ejecutar:
--
-- select cron.schedule(
--   'focus-notifications',
--   '* * * * *',
--   $cron$
--     select net.http_get(
--       url := 'https://TU-DOMINIO.vercel.app/api/cron',
--       headers := jsonb_build_object('Authorization', 'Bearer TU-CRON-SECRET')
--     );
--   $cron$
-- );
