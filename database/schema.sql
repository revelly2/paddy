-- =============================================================================
-- Paddy Rice Harvest Time Classification System
-- Supabase / PostgreSQL Schema
-- =============================================================================
-- Run this entire script in the Supabase SQL Editor of your project.
-- It creates all tables, enables Row Level Security (RLS), and sets up
-- the storage bucket configuration.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Extensions (already enabled in Supabase by default)
-- ---------------------------------------------------------------------------
-- uuid-ossp is available by default; no action needed.


-- ---------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Extends auth.users with app-specific farmer profile data.
-- Supabase Auth handles authentication; this table holds display metadata.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT,
    region      TEXT,           -- Philippine region (e.g., "Region II - Cagayan Valley")
    farm_name   TEXT,           -- Optional farm label
    avatar_url  TEXT,           -- URL to profile picture in Supabase Storage
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS
  'Farmer profile data linked to Supabase Auth users.';

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on profile change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 2. CLASSIFICATIONS TABLE
-- Stores each image upload and its CNN prediction result.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Supabase Storage reference (bucket: 'rice-images', path inside bucket)
    image_path      TEXT        NOT NULL,
    -- Public URL of the image (set after upload)
    image_url       TEXT,

    -- CNN prediction output
    label           TEXT        NOT NULL
                                CHECK (label IN ('Immature', 'Nearly Mature', 'Ready for Harvest')),
    confidence      NUMERIC(5,4) NOT NULL
                                CHECK (confidence >= 0 AND confidence <= 1),

    -- All three class probabilities for transparency
    prob_immature         NUMERIC(5,4),
    prob_nearly_mature    NUMERIC(5,4),
    prob_ready_for_harvest NUMERIC(5,4),

    -- Optional farmer notes / location metadata
    notes           TEXT,
    location        TEXT,       -- Free-text field: barangay / municipality

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.classifications IS
  'Each row is one image uploaded by a farmer with the CNN maturity prediction.';
COMMENT ON COLUMN public.classifications.image_path IS
  'Path within the "rice-images" Supabase Storage bucket.';
COMMENT ON COLUMN public.classifications.label IS
  'Top predicted class from the CNN: Immature | Nearly Mature | Ready for Harvest.';
COMMENT ON COLUMN public.classifications.confidence IS
  'Softmax probability of the winning class (0.0000 – 1.0000).';

-- Index for fast per-user history retrieval
CREATE INDEX IF NOT EXISTS idx_classifications_user_id
    ON public.classifications (user_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- Each farmer can only see and modify their own data.
-- ---------------------------------------------------------------------------

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- classifications
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own classifications"
    ON public.classifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own classifications"
    ON public.classifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own classifications"
    ON public.classifications FOR DELETE
    USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 4. STORAGE BUCKET
-- Run in the Supabase SQL editor or configure via the Storage UI.
-- The bucket "rice-images" stores uploaded paddy photos.
-- ---------------------------------------------------------------------------

-- Insert the storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rice-images', 'rice-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
-- Folder convention: rice-images/<user_id>/<filename>
CREATE POLICY "Authenticated users can upload rice images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'rice-images'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "Users can view their own rice images"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'rice-images'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "Users can delete their own rice images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'rice-images'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );


-- ---------------------------------------------------------------------------
-- 5. HELPER VIEW — classification summary per user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.user_classification_summary AS
SELECT
    user_id,
    COUNT(*)                                                      AS total_scans,
    COUNT(*) FILTER (WHERE label = 'Ready for Harvest')           AS ready_for_harvest_count,
    COUNT(*) FILTER (WHERE label = 'Nearly Mature')               AS nearly_mature_count,
    COUNT(*) FILTER (WHERE label = 'Immature')                    AS immature_count,
    ROUND(AVG(confidence) * 100, 1)                               AS avg_confidence_pct,
    MAX(created_at)                                               AS last_scan_at
FROM public.classifications
GROUP BY user_id;

COMMENT ON VIEW public.user_classification_summary IS
  'Aggregate statistics per farmer for dashboard display.';
