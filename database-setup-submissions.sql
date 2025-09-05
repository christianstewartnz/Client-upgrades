-- Create submissions table
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
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_token ON public.submissions(token);

-- Create index on unit_id for joins
CREATE INDEX IF NOT EXISTS idx_submissions_unit_id ON public.submissions(unit_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users (admins)
-- You may want to make this more restrictive based on your auth setup
CREATE POLICY "Allow all operations for authenticated users" ON public.submissions
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER handle_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at(); 