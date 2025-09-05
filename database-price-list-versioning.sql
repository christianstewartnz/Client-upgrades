-- Price List Versioning Schema
-- This creates version history for sales lists with pricing data

-- SALES LIST VERSIONS (snapshots of sales list state)
CREATE TABLE IF NOT EXISTS public.sales_list_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_list_id uuid NOT NULL REFERENCES public.sales_lists(id) ON DELETE CASCADE,
    version_number int NOT NULL,
    version_name text, -- Optional name for the version (e.g., "January 2024 Pricing", "Pre-launch", etc.)
    description text, -- Optional description of changes
    created_by text, -- User who created this version
    created_at timestamptz NOT NULL DEFAULT now(),
    is_current boolean NOT NULL DEFAULT false, -- Only one version can be current per sales list
    
    -- Metadata about the version
    total_units int NOT NULL DEFAULT 0,
    units_with_prices int NOT NULL DEFAULT 0,
    average_list_price numeric(12,2),
    total_list_value numeric(12,2)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_list_versions_sales_list_id ON public.sales_list_versions(sales_list_id);
CREATE INDEX IF NOT EXISTS idx_sales_list_versions_created_at ON public.sales_list_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_list_versions_current ON public.sales_list_versions(sales_list_id, is_current);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_list_versions_current ON public.sales_list_versions(sales_list_id) WHERE is_current = true;

-- SALES LIST VERSION UNITS (pricing data for each unit in a version)
CREATE TABLE IF NOT EXISTS public.sales_list_version_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id uuid NOT NULL REFERENCES public.sales_list_versions(id) ON DELETE CASCADE,
    unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    list_price numeric(12,2),
    sold_price numeric(12,2),
    status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','sold','withdrawn')),
    notes text,
    
    -- Snapshot of unit details at time of version creation
    unit_number text NOT NULL,
    unit_type_name text,
    unit_type_details jsonb DEFAULT '{}'::jsonb, -- bedrooms, bathrooms, size_m2, etc.
    
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_list_version_units_version_id ON public.sales_list_version_units(version_id);
CREATE INDEX IF NOT EXISTS idx_sales_list_version_units_unit_id ON public.sales_list_version_units(unit_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_list_version_units_unique ON public.sales_list_version_units(version_id, unit_id);

-- Function to create a new version from current sales list state
CREATE OR REPLACE FUNCTION create_sales_list_version(
    p_sales_list_id uuid,
    p_version_name text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_created_by text DEFAULT 'system'
)
RETURNS uuid AS $$
DECLARE
    v_version_id uuid;
    v_version_number int;
    v_total_units int := 0;
    v_units_with_prices int := 0;
    v_total_list_value numeric(12,2) := 0;
    v_average_list_price numeric(12,2) := 0;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
    FROM public.sales_list_versions
    WHERE sales_list_id = p_sales_list_id;
    
    -- Mark all previous versions as not current
    UPDATE public.sales_list_versions
    SET is_current = false
    WHERE sales_list_id = p_sales_list_id;
    
    -- Create new version record
    INSERT INTO public.sales_list_versions (
        sales_list_id,
        version_number,
        version_name,
        description,
        created_by,
        is_current
    ) VALUES (
        p_sales_list_id,
        v_version_number,
        p_version_name,
        p_description,
        p_created_by,
        true
    ) RETURNING id INTO v_version_id;
    
    -- Copy current sales list unit data to version
    INSERT INTO public.sales_list_version_units (
        version_id,
        unit_id,
        list_price,
        sold_price,
        status,
        notes,
        unit_number,
        unit_type_name,
        unit_type_details
    )
    SELECT 
        v_version_id,
        slu.unit_id,
        slu.list_price,
        slu.sold_price,
        slu.status,
        slu.notes,
        u.unit_number,
        ut.name,
        jsonb_build_object(
            'bedrooms', ut.bedrooms,
            'bathrooms', ut.bathrooms,
            'size_m2', ut.size_m2,
            'description', ut.description
        )
    FROM public.sales_list_units slu
    JOIN public.units u ON u.id = slu.unit_id
    JOIN public.unit_types ut ON ut.id = u.unit_type_id
    WHERE slu.sales_list_id = p_sales_list_id;
    
    -- Calculate version statistics
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN list_price IS NOT NULL THEN 1 END),
        COALESCE(SUM(list_price), 0),
        COALESCE(AVG(list_price), 0)
    INTO v_total_units, v_units_with_prices, v_total_list_value, v_average_list_price
    FROM public.sales_list_version_units
    WHERE version_id = v_version_id;
    
    -- Update version with statistics
    UPDATE public.sales_list_versions
    SET 
        total_units = v_total_units,
        units_with_prices = v_units_with_prices,
        total_list_value = v_total_list_value,
        average_list_price = v_average_list_price
    WHERE id = v_version_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to restore a sales list from a version
CREATE OR REPLACE FUNCTION restore_sales_list_from_version(
    p_version_id uuid,
    p_created_by text DEFAULT 'system'
)
RETURNS boolean AS $$
DECLARE
    v_sales_list_id uuid;
    v_version_name text;
BEGIN
    -- Get sales list ID and version info
    SELECT sales_list_id, version_name
    INTO v_sales_list_id, v_version_name
    FROM public.sales_list_versions
    WHERE id = p_version_id;
    
    IF v_sales_list_id IS NULL THEN
        RAISE EXCEPTION 'Version not found';
    END IF;
    
    -- Clear current sales list unit data
    DELETE FROM public.sales_list_units
    WHERE sales_list_id = v_sales_list_id;
    
    -- Restore data from version
    INSERT INTO public.sales_list_units (
        sales_list_id,
        unit_id,
        list_price,
        sold_price,
        status,
        notes,
        created_at,
        updated_at
    )
    SELECT 
        v_sales_list_id,
        unit_id,
        list_price,
        sold_price,
        status,
        notes,
        now(),
        now()
    FROM public.sales_list_version_units
    WHERE version_id = p_version_id;
    
    -- Create a new version to track this restoration
    PERFORM create_sales_list_version(
        v_sales_list_id,
        'Restored: ' || COALESCE(v_version_name, 'Version'),
        'Restored from version ID: ' || p_version_id::text,
        p_created_by
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get version comparison data
CREATE OR REPLACE FUNCTION compare_sales_list_versions(
    p_version_id_1 uuid,
    p_version_id_2 uuid
)
RETURNS TABLE (
    unit_id uuid,
    unit_number text,
    version1_list_price numeric(12,2),
    version2_list_price numeric(12,2),
    price_difference numeric(12,2),
    version1_status text,
    version2_status text,
    status_changed boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(v1.unit_id, v2.unit_id) as unit_id,
        COALESCE(v1.unit_number, v2.unit_number) as unit_number,
        v1.list_price as version1_list_price,
        v2.list_price as version2_list_price,
        COALESCE(v2.list_price, 0) - COALESCE(v1.list_price, 0) as price_difference,
        v1.status as version1_status,
        v2.status as version2_status,
        COALESCE(v1.status, '') != COALESCE(v2.status, '') as status_changed
    FROM public.sales_list_version_units v1
    FULL OUTER JOIN public.sales_list_version_units v2 
        ON v1.unit_id = v2.unit_id
    WHERE v1.version_id = p_version_id_1 
       OR v2.version_id = p_version_id_2
    ORDER BY COALESCE(v1.unit_number, v2.unit_number);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create initial version when sales list is created
CREATE OR REPLACE FUNCTION create_initial_sales_list_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial version when sales list is created
    PERFORM create_sales_list_version(
        NEW.id,
        'Initial Version',
        'Automatically created initial version',
        'system'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new sales lists
DROP TRIGGER IF EXISTS trigger_create_initial_version ON public.sales_lists;
CREATE TRIGGER trigger_create_initial_version
    AFTER INSERT ON public.sales_lists
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_sales_list_version();

-- Create initial versions for existing sales lists that don't have any versions
DO $$
DECLARE
    sales_list_record record;
BEGIN
    FOR sales_list_record IN 
        SELECT id FROM public.sales_lists sl
        WHERE NOT EXISTS (
            SELECT 1 FROM public.sales_list_versions slv 
            WHERE slv.sales_list_id = sl.id
        )
    LOOP
        PERFORM create_sales_list_version(
            sales_list_record.id,
            'Initial Version',
            'Automatically created for existing sales list',
            'system'
        );
    END LOOP;
END $$;
