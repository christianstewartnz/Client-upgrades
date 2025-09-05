-- Sales management schema extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- SALES LISTS (per project)
CREATE TABLE IF NOT EXISTS public.sales_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_lists_project_name ON public.sales_lists(project_id, name);
CREATE INDEX IF NOT EXISTS idx_sales_lists_project_id ON public.sales_lists(project_id);

-- SALES LIST UNITS (which units are available in which sales list)
CREATE TABLE IF NOT EXISTS public.sales_list_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_list_id uuid NOT NULL REFERENCES public.sales_lists(id) ON DELETE CASCADE,
    unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    list_price numeric(12,2),
    status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','sold','withdrawn')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_list_units_unique ON public.sales_list_units(sales_list_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_sales_list_units_sales_list ON public.sales_list_units(sales_list_id);
CREATE INDEX IF NOT EXISTS idx_sales_list_units_unit ON public.sales_list_units(unit_id);

-- Extend unit_clients to include sales context
ALTER TABLE public.unit_clients ADD COLUMN IF NOT EXISTS sales_list_id uuid REFERENCES public.sales_lists(id) ON DELETE SET NULL;
ALTER TABLE public.unit_clients ADD COLUMN IF NOT EXISTS purchase_price numeric(12,2);
ALTER TABLE public.unit_clients ADD COLUMN IF NOT EXISTS reservation_date timestamptz;

-- Add updated_at trigger for sales tables
CREATE TRIGGER handle_sales_lists_updated_at
    BEFORE UPDATE ON public.sales_lists
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_sales_list_units_updated_at
    BEFORE UPDATE ON public.sales_list_units
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_unit_clients_sales_list ON public.unit_clients(sales_list_id); 