DO $$
BEGIN
    -- 1. Create Hubs Table (Structure Only)
    CREATE TABLE IF NOT EXISTS public.hubs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. Enable Row Level Security (RLS)
    ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

    -- 3. Set up RLS Policies (Who can do what)

    -- View: All users in the company can see hubs
    DROP POLICY IF EXISTS "Users can view hubs for their company" ON public.hubs;
    CREATE POLICY "Users can view hubs for their company"
        ON public.hubs FOR SELECT
        USING (
            company_id IN (
                SELECT company_id FROM public.users
                WHERE users.id = auth.uid()
            )
        );

    -- Insert: Managers and Admins can add hubs
    DROP POLICY IF EXISTS "Managers can insert hubs for their company" ON public.hubs;
    CREATE POLICY "Managers can insert hubs for their company"
        ON public.hubs FOR INSERT
        WITH CHECK (
            company_id IN (
                SELECT company_id FROM public.users
                WHERE users.id = auth.uid()
                AND users.role IN ('manager', 'admin')
            )
        );

    -- Update: Managers and Admins can edit hubs
    DROP POLICY IF EXISTS "Managers can update hubs for their company" ON public.hubs;
    CREATE POLICY "Managers can update hubs for their company"
        ON public.hubs FOR UPDATE
        USING (
            company_id IN (
                SELECT company_id FROM public.users
                WHERE users.id = auth.uid()
                AND users.role IN ('manager', 'admin')
            )
        );

    -- Delete: Managers and Admins can delete hubs
    DROP POLICY IF EXISTS "Managers can delete hubs for their company" ON public.hubs;
    CREATE POLICY "Managers can delete hubs for their company"
        ON public.hubs FOR DELETE
        USING (
            company_id IN (
                SELECT company_id FROM public.users
                WHERE users.id = auth.uid()
                AND users.role IN ('manager', 'admin')
            )
        );

    RAISE NOTICE 'Hubs table created successfully. You can now add warehouses manually via the app.';
END $$;
