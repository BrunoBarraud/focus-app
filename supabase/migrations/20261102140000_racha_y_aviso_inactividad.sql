-- ==============================================================================
-- MIGRACIÓN: racha de uso + aviso cuando no se usa la app
-- ------------------------------------------------------------------------------
-- Ejecutar después de 20261102120000_sin_datos_de_ejemplo.sql. Es idempotente.
--
-- Qué hace:
--   1. user_settings guarda la última actividad, la racha de días seguidos
--      usando la app y cada cuántas horas avisar si no se usa (1, 2, 5, 7, 12).
--   2. La racha y la última actividad solo se escriben con touch_activity():
--      el usuario ya no puede editar cualquier columna de user_settings.
--   3. notifications.dedupe_key: evita avisos duplicados que no dependen de
--      un evento del planificador (los de inactividad).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Columnas nuevas
-- ------------------------------------------------------------------------------
alter table public.user_settings add column if not exists last_seen_at timestamptz;
alter table public.user_settings add column if not exists inactivity_reminder_hours int;
alter table public.user_settings add column if not exists streak_current int not null default 0;
alter table public.user_settings add column if not exists streak_best int not null default 0;
alter table public.user_settings add column if not exists streak_last_day date;

do $$
begin
  alter table public.user_settings
    add constraint user_settings_inactivity_hours_check
    check (inactivity_reminder_hours is null or inactivity_reminder_hours in (1, 2, 5, 7, 12));
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------------------------
-- 2. Qué columnas puede actualizar el usuario directamente
-- ------------------------------------------------------------------------------
-- Antes cualquier columna propia era editable desde el navegador (con la anon
-- key). Ahora la racha y la última actividad solo cambian vía touch_activity().
revoke update on public.user_settings from anon, authenticated;
grant update (
  daily_mission, daily_pillar, daily_frog, energy_level, preferences,
  timezone, birth_date, target_age, inactivity_reminder_hours, updated_at
) on public.user_settings to authenticated;

-- ------------------------------------------------------------------------------
-- 3. Registrar actividad y calcular la racha (día local del usuario)
-- ------------------------------------------------------------------------------
create or replace function public.touch_activity()
returns table (current_streak int, best_streak int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.user_settings%rowtype;
  v_today date;
  v_current int;
  v_best int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_settings from public.user_settings where user_id = auth.uid() for update;
  if not found then
    return;
  end if;

  begin
    v_today := (now() at time zone v_settings.timezone)::date;
  exception when others then
    v_today := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  end;

  v_current := case
    when v_settings.streak_last_day = v_today then greatest(v_settings.streak_current, 1)
    when v_settings.streak_last_day = v_today - 1 then v_settings.streak_current + 1
    else 1
  end;
  v_best := greatest(v_settings.streak_best, v_current);

  update public.user_settings
  set last_seen_at = now(),
      streak_current = v_current,
      streak_best = v_best,
      streak_last_day = v_today
  where user_id = auth.uid();

  return query select v_current, v_best;
end;
$$;

revoke execute on function public.touch_activity() from public, anon;
grant execute on function public.touch_activity() to authenticated;

-- ------------------------------------------------------------------------------
-- 4. Deduplicación de notificaciones sin evento
-- ------------------------------------------------------------------------------
alter table public.notifications add column if not exists dedupe_key text;
-- Índice único común (no parcial) para que sirva de ON CONFLICT. Los NULL de
-- los recordatorios de eventos no chocan entre sí.
create unique index if not exists notifications_dedupe_key_uidx on public.notifications (dedupe_key);

create index if not exists user_settings_inactivity_idx
  on public.user_settings (last_seen_at)
  where inactivity_reminder_hours is not null;
