-- ============================================================================
-- Add applicant_type to users
-- Values: 'citizen' | 'diaspora' | 'foreigner'
-- Existing is_diaspora flag is preserved for backwards compatibility.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS applicant_type TEXT
    CHECK (applicant_type IS NULL OR applicant_type IN ('citizen','diaspora','foreigner'))
    DEFAULT 'citizen';

-- Backfill from existing is_diaspora flag
UPDATE public.users
SET applicant_type = CASE
  WHEN is_diaspora = TRUE THEN 'diaspora'
  WHEN nationality IS NOT NULL
       AND LOWER(nationality) <> 'tanzanian'
       AND LOWER(nationality) <> 'tanzania'
       THEN 'foreigner'
  ELSE 'citizen'
END
WHERE applicant_type IS NULL OR applicant_type = 'citizen';

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_users_applicant_type
  ON public.users(applicant_type);

-- Keep handle_new_user trigger in sync — read applicant_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_is_diaspora BOOLEAN := COALESCE((meta->>'is_diaspora')::BOOLEAN, FALSE);
  v_applicant_type TEXT;
  v_level TEXT;
BEGIN
  v_applicant_type := COALESCE(
    meta->>'applicant_type',
    CASE
      WHEN v_is_diaspora THEN 'diaspora'
      WHEN LOWER(COALESCE(meta->>'nationality', 'tanzanian')) NOT IN ('tanzanian','tanzania')
        THEN 'foreigner'
      ELSE 'citizen'
    END
  );

  v_level := COALESCE(
    meta->>'verification_level',
    CASE
      WHEN v_is_diaspora THEN 'EMAIL_VERIFIED'
      WHEN meta->>'phone' IS NOT NULL THEN 'PHONE_VERIFIED'
      ELSE 'UNVERIFIED'
    END
  );

  INSERT INTO public.users (
    id, email, first_name, middle_name, last_name,
    phone, sex, gender, date_of_birth, place_of_birth,
    marital_status, occupation, education_level,
    nationality, country_of_citizenship,
    nida_number, id_type, id_number,
    region, district, ward, street,
    is_diaspora, country_of_residence, passport_number,
    applicant_type, verification_level,
    is_verified, role, account_status
  ) VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(meta->>'first_name', split_part(NEW.email, '@', 1)),
    meta->>'middle_name',
    COALESCE(meta->>'last_name', ''),
    meta->>'phone',
    meta->>'sex',
    COALESCE(meta->>'gender', meta->>'sex'),
    NULLIF(meta->>'date_of_birth', '')::DATE,
    meta->>'place_of_birth',
    LOWER(meta->>'marital_status'),
    meta->>'occupation',
    meta->>'education_level',
    COALESCE(meta->>'nationality', 'Tanzanian'),
    COALESCE(meta->>'country_of_citizenship', 'Tanzania'),
    meta->>'nida_number',
    meta->>'id_type',
    meta->>'id_number',
    meta->>'region',
    meta->>'district',
    meta->>'ward',
    meta->>'street',
    v_is_diaspora,
    meta->>'country_of_residence',
    meta->>'passport_number',
    v_applicant_type,
    v_level,
    COALESCE((meta->>'is_verified')::BOOLEAN, FALSE),
    COALESCE((meta->>'role')::public.user_role, 'citizen'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    applicant_type = COALESCE(EXCLUDED.applicant_type, public.users.applicant_type),
    is_diaspora    = COALESCE(EXCLUDED.is_diaspora, public.users.is_diaspora),
    updated_at     = NOW();

  RETURN NEW;
END;
$$;