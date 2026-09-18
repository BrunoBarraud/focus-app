-- ==============================================================================
-- SCHEMA DEFINITION FOR "FOCUS" PRODUCTIVITY APP (SUPABASE)
-- Ejecutar en el SQL Editor de tu proyecto en Supabase
-- ==============================================================================

-- 1. Tabla de Preferencias y Memento Mori (user_settings)
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

-- Migración para proyectos existentes:
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- 2. Tabla de Catálogo de Hábitos (habits)
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'mente' CHECK (category IN ('mente', 'cuerpo', 'trabajo', 'espiritu')),
    monthly_target_days INT DEFAULT 25,
    color TEXT DEFAULT '#10b981',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabla para Registro Diario de Hábitos (habit_logs)
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_habit_date UNIQUE (habit_id, date)
);

-- 4. Tabla de Tareas del Planificador Semanal (tasks)
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

-- 5. Tabla de Objetivos y Rueda de la Vida (goals)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('personal', 'profesional', 'rueda')),
    title TEXT NOT NULL,
    description TEXT,
    progress NUMERIC(5, 2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    score NUMERIC(4, 2) DEFAULT 7 CHECK (score >= 0 AND score <= 10), -- Para Rueda de la Vida
    target_date DATE,
    timeframe TEXT DEFAULT 'Q3',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Tabla de Sueños por Cumplir (dreams)
CREATE TABLE IF NOT EXISTS public.dreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Experiencias',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    target_year INT DEFAULT 2028,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Cada usuario sólo puede leer, crear, actualizar y borrar sus propios datos.
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their dreams" ON public.dreams
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- 2. Políticas para habits
CREATE POLICY "Users can view their own habits"
    ON public.habits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
    ON public.habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
    ON public.habits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
    ON public.habits FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Políticas para habit_logs (a través de habits.user_id)
CREATE POLICY "Users can view their own habit logs"
    ON public.habit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.habits
            WHERE public.habits.id = public.habit_logs.habit_id
            AND public.habits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own habit logs"
    ON public.habit_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.habits
            WHERE public.habits.id = public.habit_logs.habit_id
            AND public.habits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own habit logs"
    ON public.habit_logs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.habits
            WHERE public.habits.id = public.habit_logs.habit_id
            AND public.habits.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own habit logs"
    ON public.habit_logs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.habits
            WHERE public.habits.id = public.habit_logs.habit_id
            AND public.habits.user_id = auth.uid()
        )
    );

-- 4. Políticas para tasks
CREATE POLICY "Users can view their own tasks"
    ON public.tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON public.tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON public.tasks FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Políticas para goals
CREATE POLICY "Users can view their own goals"
    ON public.goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
    ON public.goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
    ON public.goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
    ON public.goals FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- TRIGGER PARA CREAR AUTOMÁTICAMENTE USER_SETTINGS AL REGISTRARSE UN USUARIO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id, email, role, birth_date, target_age, daily_mission, daily_pillar, daily_frog)
    VALUES (
        NEW.id,
        NEW.email,
        'user',
        '1992-05-15', -- Fecha por defecto personalizable (aprox 34 años)
        80,
        'Diseñar y desplegar la arquitectura completa de Focus con máxima presencia.',
        'Disciplina profunda & Claridad mental',
        'Finalizar el refactor del motor de persistencia'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. TABLA DE SOPORTE & FEEDBACK (support_feedback)
-- ==============================================================================
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

ALTER TABLE public.support_feedback ENABLE ROW LEVEL SECURITY;

-- Los usuarios autenticados pueden ver sus propios feedbacks
CREATE POLICY "Users can view their own feedbacks"
    ON public.support_feedback FOR SELECT
    USING (auth.uid() = user_id OR (auth.jwt()->'user_metadata'->>'role') = 'admin');

-- Cualquier usuario autenticado puede enviar feedback
CREATE POLICY "Users can insert feedback"
    ON public.support_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Los administradores pueden actualizar el estado y responder
CREATE POLICY "Admins can update feedbacks"
    ON public.support_feedback FOR UPDATE
    USING ((auth.jwt()->'user_metadata'->>'role') = 'admin' OR auth.uid() = user_id);

