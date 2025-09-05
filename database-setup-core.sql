-- Core schema for property development app
-- Safe to run multiple times (IF NOT EXISTS used wherever possible)

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    development_company text,
    address text,
    description text,
    logo_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- UNIT TYPES
CREATE TABLE IF NOT EXISTS public.unit_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    bedrooms int NOT NULL DEFAULT 0,
    bathrooms int NOT NULL DEFAULT 0,
    size_m2 numeric(10,2) NOT NULL DEFAULT 0,
    allowed_color_schemes text[] NOT NULL DEFAULT '{}',
    allowed_upgrades text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unit_types_project_id ON public.unit_types(project_id);

-- UNITS
CREATE TABLE IF NOT EXISTS public.units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_number text NOT NULL,
    unit_type_id uuid NOT NULL REFERENCES public.unit_types(id) ON DELETE RESTRICT,
    floor_plan_url text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    username text,
    password text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_units_unit_type_id ON public.units(unit_type_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_units_unit_number ON public.units(unit_number);

-- COLOR SCHEMES
CREATE TABLE IF NOT EXISTS public.color_schemes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    color_board_file text,
    materials jsonb NOT NULL DEFAULT '{}'::jsonb,
    allowed_unit_types text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_color_schemes_project_name ON public.color_schemes(project_id, name);
CREATE INDEX IF NOT EXISTS idx_color_schemes_project_id ON public.color_schemes(project_id);

-- UPGRADE OPTIONS
CREATE TABLE IF NOT EXISTS public.upgrade_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    price numeric(12,2) NOT NULL DEFAULT 0,
    max_quantity int NOT NULL DEFAULT 1,
    allowed_unit_types text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_upgrade_options_project_name ON public.upgrade_options(project_id, name);
CREATE INDEX IF NOT EXISTS idx_upgrade_options_project_id ON public.upgrade_options(project_id);

-- SUBMISSIONS (kept close to your existing file; included for completeness)
CREATE TABLE IF NOT EXISTS public.submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id uuid REFERENCES public.units(id),
    unit_number text NOT NULL,
    project_name text NOT NULL,
    client_name text NOT NULL,
    color_scheme text,
    upgrade_value numeric DEFAULT 0,
    status text CHECK (status IN ('draft', 'submitted')) DEFAULT 'draft',
    submitted_date date NOT NULL DEFAULT CURRENT_DATE,
    selected_upgrades jsonb DEFAULT '[]'::jsonb,
    floor_plan_data jsonb DEFAULT '{}'::jsonb,
    token text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_submissions_token ON public.submissions(token);
CREATE INDEX IF NOT EXISTS idx_submissions_unit_id ON public.submissions(unit_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at);

-- Updated-at trigger used by submissions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS handle_submissions_updated_at ON public.submissions;
CREATE TRIGGER handle_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at(); 