-- Migration script for sales list and unit updates
-- This script handles existing data and adds new functionality

-- 1. Add project_id to existing units table if not exists
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS project_id uuid;

-- 2. Update existing units to get project_id from their unit_type
UPDATE public.units 
SET project_id = ut.project_id 
FROM public.unit_types ut 
WHERE public.units.unit_type_id = ut.id 
AND public.units.project_id IS NULL;

-- 3. Make project_id NOT NULL and add foreign key constraint
ALTER TABLE public.units ALTER COLUMN project_id SET NOT NULL;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'units_project_id_fkey') THEN
        ALTER TABLE public.units ADD CONSTRAINT units_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_units_project_id ON public.units(project_id);
DROP INDEX IF EXISTS uq_units_unit_number;
CREATE UNIQUE INDEX IF NOT EXISTS uq_units_project_unit_number ON public.units(project_id, unit_number);

-- 5. Create function to automatically create Master sales list for new projects
CREATE OR REPLACE FUNCTION create_master_sales_list()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a Master sales list for the new project
    INSERT INTO public.sales_lists (project_id, name, description, status)
    VALUES (NEW.id, 'Master', 'Automatically generated list showing all units in the project', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically create Master sales list for new projects
DROP TRIGGER IF EXISTS trigger_create_master_sales_list ON public.projects;
CREATE TRIGGER trigger_create_master_sales_list
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION create_master_sales_list();

-- 7. Create Master sales lists for existing projects that don't have one
INSERT INTO public.sales_lists (project_id, name, description, status)
SELECT p.id, 'Master', 'Automatically generated list showing all units in the project', 'active'
FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.sales_lists sl 
    WHERE sl.project_id = p.id AND sl.name = 'Master'
);

-- 8. Create function to automatically add units to Master sales list
CREATE OR REPLACE FUNCTION add_unit_to_master_sales_list()
RETURNS TRIGGER AS $$
DECLARE
    master_sales_list_id uuid;
BEGIN
    -- Find the Master sales list for this project
    SELECT id INTO master_sales_list_id
    FROM public.sales_lists
    WHERE project_id = NEW.project_id AND name = 'Master';
    
    -- Add the unit to the Master sales list if it exists
    IF master_sales_list_id IS NOT NULL THEN
        INSERT INTO public.sales_list_units (sales_list_id, unit_id, status)
        VALUES (master_sales_list_id, NEW.id, 'available')
        ON CONFLICT (sales_list_id, unit_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically add new units to Master sales list
DROP TRIGGER IF EXISTS trigger_add_unit_to_master ON public.units;
CREATE TRIGGER trigger_add_unit_to_master
    AFTER INSERT ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION add_unit_to_master_sales_list();

-- 10. Add existing units to their respective Master sales lists
INSERT INTO public.sales_list_units (sales_list_id, unit_id, status)
SELECT sl.id, u.id, 'available'
FROM public.units u
JOIN public.sales_lists sl ON sl.project_id = u.project_id AND sl.name = 'Master'
WHERE NOT EXISTS (
    SELECT 1 FROM public.sales_list_units slu
    WHERE slu.sales_list_id = sl.id AND slu.unit_id = u.id
);
