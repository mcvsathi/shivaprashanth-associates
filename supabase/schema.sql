-- ==============================================================================
-- ShivaPrashanth & Associates - Consultations Table Schema
-- Execute this script in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Create consultations table
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    service VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'contacted', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Add comments for clarity
COMMENT ON TABLE public.consultations IS 'Client consultation and audit inquiry submissions';
COMMENT ON COLUMN public.consultations.service IS 'Selected consultation service (e.g. tax, fssai, gst, audit, other)';
COMMENT ON COLUMN public.consultations.status IS 'Current processing workflow status of inquiry';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON public.consultations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations (status);
CREATE INDEX IF NOT EXISTS idx_consultations_email ON public.consultations (email);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- 5. Security Policies:
-- Allow anyone (anonymous website visitors) to submit a consultation request
DROP POLICY IF EXISTS "Allow anonymous consultation submissions" ON public.consultations;
CREATE POLICY "Allow anonymous consultation submissions"
    ON public.consultations
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow authenticated users (firm administrators/partners) to view inquiries
DROP POLICY IF EXISTS "Allow authenticated staff to view consultations" ON public.consultations;
CREATE POLICY "Allow authenticated staff to view consultations"
    ON public.consultations
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to update consultation statuses
DROP POLICY IF EXISTS "Allow authenticated staff to update consultations" ON public.consultations;
CREATE POLICY "Allow authenticated staff to update consultations"
    ON public.consultations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_consultations_updated_at ON public.consultations;
CREATE TRIGGER set_consultations_updated_at
    BEFORE UPDATE ON public.consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
