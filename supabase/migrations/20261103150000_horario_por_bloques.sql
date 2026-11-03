-- ==============================================================================
-- MIGRACIÓN: horario semanal por bloques (estilo grilla de facultad)
-- ------------------------------------------------------------------------------
-- Ejecutar después de 20261102140000_racha_y_aviso_inactividad.sql. Es idempotente.
--
-- Qué hace:
--   1. Cada calendario define sus bloques horarios: a qué hora empieza el
--      primero, cuánto dura cada uno, el descanso entre bloques y a qué hora
--      termina el día. Por defecto: 07:30, 55 min, 5 min de corte, hasta 21:25
--      (07:30–08:25, 08:30–09:25, …, 20:30–21:25).
--   2. Cada evento puede tener un color propio (para la grilla de horario).
-- ==============================================================================

alter table public.calendars add column if not exists slot_start time not null default '07:30';
alter table public.calendars add column if not exists slot_minutes int not null default 55;
alter table public.calendars add column if not exists slot_gap_minutes int not null default 5;
alter table public.calendars add column if not exists day_end time not null default '21:25';

do $$
begin
  alter table public.calendars
    add constraint calendars_slots_check
    check (
      slot_minutes between 10 and 240
      and slot_gap_minutes between 0 and 60
      and day_end > slot_start
    );
exception when duplicate_object then null;
end $$;

alter table public.calendar_events add column if not exists color text;

do $$
begin
  alter table public.calendar_events
    add constraint calendar_events_color_check
    check (color is null or color ~ '^[a-z]{3,12}$');
exception when duplicate_object then null;
end $$;
