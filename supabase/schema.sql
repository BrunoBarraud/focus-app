-- ==============================================================================
-- ESQUEMA BASE DE "FOCUS" (SUPABASE)
-- ------------------------------------------------------------------------------
-- Para una base NUEVA:
--   1. Ejecutar este archivo en el SQL Editor.
--   2. Ejecutar, en orden, los archivos de supabase/migrations/.
-- La migración agrega las tablas nuevas, las políticas RLS definitivas, los
-- triggers y las funciones. Este archivo solo crea las tablas base.
--
-- Para la base de producción existente: NO ejecutar este archivo; solo las
-- migraciones pendientes.
-- ==============================================================================

-- 1. Preferencias del usuario
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    birth_date DATE NOT NULL,
    target_age INT DEFAULT 80,
    daily_mission TEXT,
    daily_pillar TEXT,
    daily_frog TEXT,
    energy_level TEXT DEFAULT 'high',
    preferences JSONB DEFAULT '{"theme": "dark", "sound": true}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Catálogo de hábitos
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'mente' CHECK (category IN ('mente', 'cuerpo', 'trabajo', 'espiritu')),
    monthly_target_days INT DEFAULT 25,
    color TEXT DEFAULT '#10b981',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Registro diario de hábitos
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_habit_date UNIQUE (habit_id, date)
);

-- 4. Tareas (LEGACY: reemplazada por calendar_events; la migración copia sus datos)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE,
    day_of_week VARCHAR(2) CHECK (day_of_week IN ('L', 'M', 'X', 'J', 'V', 'S', 'D')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    estimated_minutes INT DEFAULT 30,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    tag TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Metas y Rueda de la Vida (type = 'rueda')
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('personal', 'profesional', 'rueda')),
    title TEXT NOT NULL,
    description TEXT,
    progress NUMERIC(5, 2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    score NUMERIC(4, 2) DEFAULT 7 CHECK (score >= 0 AND score <= 10),
    target_date DATE,
    timeframe TEXT DEFAULT 'Q3',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Calendarios del planificador
CREATE TABLE IF NOT EXISTS public.calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'bg-violet-500 text-white',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Eventos / tareas del planificador
--    Puntual: is_recurring = false y `date`. Semanal: is_recurring = true y `days_of_week`.
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    date DATE,
    days_of_week TEXT[],
    is_recurring BOOLEAN DEFAULT FALSE,
    start_time TIME,
    end_time TIME,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    tag TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Suscripciones Web Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Soporte y feedback
CREATE TABLE IF NOT EXISTS public.support_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'suggestion' CHECK (type IN ('suggestion', 'improvement', 'bug', 'question', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed')),
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS, políticas, triggers, funciones y tablas nuevas (dreams, event_completions,
-- goal_milestones, notifications): ver supabase/migrations/.
