-- ==============================================================================
-- MIGRACIÓN: calendario completo (Fase 1)
-- ------------------------------------------------------------------------------
-- Ejecutar UNA vez en el SQL Editor de Supabase. Es idempotente y no borra
-- datos: convierte las tareas, clases y calendarios que ya existen al modelo
-- nuevo. Incluye lo de 20261103150000_horario_por_bloques.sql por si no se
-- corrió todavía.
--
-- Modelo nuevo de calendar_events:
--   kind         'task' (se tilda) | 'event' (tiene inicio y fin)
--   all_day      todo el día (sin hora)
--   start_date   fecha de la (primera) ocurrencia
--   end_date     último día de un evento de varios días (null = mismo día)
--   recurrence   null = no se repite; si no:
--                {"freq":"daily|weekly|monthly|yearly","interval":1,
--                 "byWeekday":["L","X"],"monthlyMode":"day|nth",
--                 "until":"2026-11-28","count":10}
--   reminders    minutos antes para avisar; null = los del calendario
--   location, url, color
-- Las columnas viejas (date, days_of_week, is_recurring) quedan sin uso y se
-- pueden borrar más adelante.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Calendarios
-- ------------------------------------------------------------------------------
alter table public.calendars add column if not exists slot_start time not null default '07:30';
alter table public.calendars add column if not exists slot_minutes int not null default 55;
alter table public.calendars add column if not exists slot_gap_minutes int not null default 5;
alter table public.calendars add column if not exists day_end time not null default '21:25';
alter table public.calendars add column if not exists icon text;
alter table public.calendars add column if not exists hidden boolean not null default false;
alter table public.calendars add column if not exists position int not null default 0;
alter table public.calendars add column if not exists default_reminders int[] not null default '{15}';
alter table public.calendars add column if not exists use_slots boolean not null default false;

do $$
begin
  alter table public.calendars
    add constraint calendars_slots_check
    check (slot_minutes between 10 and 240 and slot_gap_minutes between 0 and 60 and day_end > slot_start);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.calendars
    add constraint calendars_fields_check
    check (
      char_length(name) between 1 and 60
      and (icon is null or char_length(icon) <= 8)
      and cardinality(default_reminders) <= 6
      and 0 <= all(default_reminders) and 40320 >= all(default_reminders)
    );
exception when duplicate_object then null;
end $$;

-- Colores: de clases de Tailwind ("bg-violet-500 text-white") a una clave ("violet").
update public.calendars
set color = substring(color from 'bg-([a-z]+)-')
where color like 'bg-%';

-- Calendarios existentes: mismos avisos que antes (30, 15 y 5 minutos).
-- Solo se toca la primera vez (cuando todavía tienen el valor por defecto).
update public.calendars set default_reminders = '{30,15,5}'
where default_reminders = '{15}' and created_at < '2026-11-18';

-- Los calendarios de facultad/horarios arrancan con la grilla de bloques.
update public.calendars set use_slots = true
where use_slots = false and name ~* '(facu|horario|clase|cursada)';

-- Orden inicial: por fecha de creación.
with ordered as (
  select id, row_number() over (partition by user_id order by created_at) - 1 as pos
  from public.calendars
)
update public.calendars c set position = o.pos
from ordered o
where c.id = o.id and c.position = 0;

-- ------------------------------------------------------------------------------
-- 2. Eventos
-- ------------------------------------------------------------------------------
alter table public.calendar_events add column if not exists color text;
alter table public.calendar_events add column if not exists kind text not null default 'task';
alter table public.calendar_events add column if not exists all_day boolean not null default false;
alter table public.calendar_events add column if not exists start_date date;
alter table public.calendar_events add column if not exists end_date date;
alter table public.calendar_events add column if not exists recurrence jsonb;
alter table public.calendar_events add column if not exists reminders int[];
alter table public.calendar_events add column if not exists location text;
alter table public.calendar_events add column if not exists url text;

-- Conversión de los datos existentes (solo filas sin convertir).
-- Puntuales: start_date = date.
update public.calendar_events
set start_date = date
where start_date is null and coalesce(is_recurring, false) = false and date is not null;

-- Semanales: se repiten desde el día en que se crearon, en sus días de semana.
update public.calendar_events
set start_date = (created_at at time zone 'America/Argentina/Buenos_Aires')::date,
    recurrence = jsonb_build_object(
      'freq', 'weekly',
      'interval', 1,
      'byWeekday', to_jsonb(coalesce(days_of_week, '{}'::text[]))
    )
where start_date is null and is_recurring = true;

-- Cualquier resto sin fecha (no debería haber) queda en el día de creación.
update public.calendar_events
set start_date = (created_at at time zone 'America/Argentina/Buenos_Aires')::date
where start_date is null;

-- Lo que ya existía con hora de inicio y de fin es un evento (una clase); el
-- resto, tarea. Solo filas anteriores a esta migración, para que correrla de
-- nuevo no cambie lo creado después.
update public.calendar_events
set kind = 'event'
where kind = 'task' and start_time is not null and end_time is not null
  and created_at < '2026-11-19';

-- Clases sin color en calendarios con bloques: un color fijo por materia
-- (todas las clases de la misma materia salen iguales).
update public.calendar_events e
set color = (array['teal','emerald','violet','blue','sky','amber','rose','slate'])[
  1 + (('x' || substr(md5(lower(trim(e.title))), 1, 7))::bit(28)::int % 8)
]
from public.calendars c
where e.calendar_id = c.id and c.use_slots and e.color is null;

alter table public.calendar_events alter column start_date set not null;

do $$
begin
  alter table public.calendar_events
    add constraint calendar_events_v2_check
    check (
      kind in ('task', 'event')
      and (end_date is null or end_date >= start_date)
      and (color is null or color ~ '^[a-z]{3,12}$')
      and (reminders is null or (cardinality(reminders) <= 6
           and 0 <= all(reminders) and 40320 >= all(reminders)))
      and (location is null or char_length(location) <= 200)
      and (url is null or char_length(url) <= 500)
      and (recurrence is null or (recurrence ->> 'freq') in ('daily', 'weekly', 'monthly', 'yearly'))
    );
exception when duplicate_object then null;
end $$;

-- El cron busca eventos con hora o con recordatorios.
create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, start_date);
