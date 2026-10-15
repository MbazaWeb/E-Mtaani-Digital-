-- --
-- E-MTAA AUTH & PROFILES -- create_citizen_profile, handle_new_user, verification
-- Idempotent. Safe to re-run. Runs AFTER 20261014000000_setup_core.sql
-- --

-- -- 1. create_citizen_profile -- 26 args, lowercase account_status --
DROP FUNCTION IF EXISTS public.create_citizen_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, TEXT, TEXT, BOOLEAN
);
DROP FUNCTION IF EXISTS public.create_citizen_profile(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, TEXT, TEXT, TEXT, BOOLEAN, TEXT
);

CREATE OR REPLACE FUNCTION public.create_citizen_profile(
  p_id                     UUID,
  p_first_name             TEXT,
  p_middle_name            TEXT DEFAULT NULL,
  p_last_name              TEXT DEFAULT '',
  p_email                  TEXT DEFAULT '',
  p_phone                  TEXT DEFAULT NULL,
  p_sex                    TEXT DEFAULT NULL,
  p_gender                 TEXT DEFAULT NULL,
  p_date_of_birth          DATE DEFAULT NULL,
  p_place_of_birth         TEXT DEFAULT NULL,
  p_marital_status         TEXT DEFAULT NULL,
  p_occupation             TEXT DEFAULT NULL,
  p_education_level        TEXT DEFAULT NULL,
  p_nationality            TEXT DEFAULT 'Tanzanian',
  p_country_of_citizenship TEXT DEFAULT 'Tanzania',
  p_nida_number            TEXT DEFAULT NULL,
  p_id_type                TEXT DEFAULT NULL,
  p_id_number              TEXT DEFAULT NULL,
  p_region                 TEXT DEFAULT NULL,
  p_district               TEXT DEFAULT NULL,
  p_ward                   TEXT DEFAULT NULL,
  p_street                 TEXT DEFAULT NULL,
  p_is_diaspora            BOOLEAN DEFAULT FALSE,
  p_country_of_residence   TEXT DEFAULT NULL,
  p_passport_number        TEXT DEFAULT NULL,
  p_is_verified            BOOLEAN DEFAULT FALSE
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (
    id, first_name, middle_name, last_name,
    email, phone, sex, gender,
    date_of_birth, place_of_birth,
    marital_status, occupation, education_level,
    nationality, country_of_citizenship,
    nida_number, id_type, id_number,
    region, district, ward, street,
    is_diaspora, country_of_residence, passport_number,
    is_verified, role, account_status
  ) VALUES (
    p_id, p_first_name, p_middle_name, p_last_name,
    LOWER(COALESCE(p_email, '')), p_phone, p_sex, p_gender,
    p_date_of_birth, p_place_of_birth,
    LOWER(p_marital_status), p_occupation, p_education_level,
    p_nationality, p_country_of_citizenship,
    p_nida_number, p_id_type, p_id_number,
    p_region, p_district, p_ward, p_street,
    p_is_diaspora, p_country_of_residence, p_passport_number,
    p_is_verified, 'citizen', 'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name             = EXCLUDED.first_name,
    middle_name            = COALESCE(EXCLUDED.middle_name, public.users.middle_name),
    last_name              = CASE WHEN EXCLUDED.last_name <> '' THEN EXCLUDED.last_name ELSE public.users.last_name END,
    phone                  = COALESCE(EXCLUDED.phone, public.users.phone),
    sex                    = COALESCE(EXCLUDED.sex, public.users.sex),
    gender                 = COALESCE(EXCLUDED.gender, public.users.gender),
    date_of_birth          = COALESCE(EXCLUDED.date_of_birth, public.users.date_of_birth),
    place_of_birth         = COALESCE(EXCLUDED.place_of_birth, public.users.place_of_birth),
    marital_status         = COALESCE(EXCLUDED.marital_status, public.users.marital_status),
    occupation             = COALESCE(EXCLUDED.occupation, public.users.occupation),
    education_level        = COALESCE(EXCLUDED.education_level, public.users.education_level),
    nationality            = COALESCE(EXCLUDED.nationality, public.users.nationality),
    country_of_citizenship = COALESCE(EXCLUDED.country_of_citizenship, public.users.country_of_citizenship),
    nida_number            = COALESCE(EXCLUDED.nida_number, public.users.nida_number),
    id_type                = COALESCE(EXCLUDED.id_type, public.users.id_type),
    id_number              = COALESCE(EXCLUDED.id_number, public.users.id_number),
    region                 = COALESCE(EXCLUDED.region, public.users.region),
    district               = COALESCE(EXCLUDED.district, public.users.district),
    ward                   = COALESCE(EXCLUDED.ward, public.users.ward),
    street                 = COALESCE(EXCLUDED.street, public.users.street),
    is_diaspora            = COALESCE(EXCLUDED.is_diaspora, public.users.is_diaspora),
    country_of_residence   = COALESCE(EXCLUDED.country_of_residence, public.users.country_of_residence),
    passport_number        = COALESCE(EXCLUDED.passport_number, public.users.passport_number),
    is_verified            = COALESCE(EXCLUDED.is_verified, public.users.is_verified),
    updated_at             = NOW()
  WHERE public.users.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_citizen_profile TO anon, authenticated, service_role;

-- -- 2. handle_new_user -- auto-create profile on auth signup --

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_is_diaspora BOOLEAN := COALESCE((meta->>'is_diaspora')::BOOLEAN, FALSE);
  v_level TEXT;
BEGIN
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
    verification_level,
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
    v_level,
    COALESCE((meta->>'is_verified')::BOOLEAN, FALSE),
    COALESCE((meta->>'role')::public.user_role, 'citizen'),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -- 3. Profile completion calculator --

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id UUID)
RETURNS SMALLINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u public.users%ROWTYPE;
  score SMALLINT := 0;
  total SMALLINT := 10;
BEGIN
  SELECT * INTO u FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF u.first_name IS NOT NULL AND u.first_name <> '' THEN score := score + 1; END IF;
  IF u.last_name  IS NOT NULL AND u.last_name  <> '' THEN score := score + 1; END IF;
  IF u.phone IS NOT NULL OR u.is_diaspora THEN score := score + 1; END IF;
  IF u.email IS NOT NULL THEN score := score + 1; END IF;
  IF u.region IS NOT NULL OR u.country_of_residence IS NOT NULL THEN score := score + 1; END IF;
  IF u.district IS NOT NULL OR u.city_of_residence IS NOT NULL THEN score := score + 1; END IF;
  IF u.ward IS NOT NULL OR u.diaspora_ward IS NOT NULL THEN score := score + 1; END IF;
  IF u.street IS NOT NULL THEN score := score + 1; END IF;
  IF u.date_of_birth IS NOT NULL THEN score := score + 1; END IF;
  IF u.nida_number IS NOT NULL OR u.passport_number IS NOT NULL THEN score := score + 1; END IF;

  RETURN (score * 100 / total)::SMALLINT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_profile_completion(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pct SMALLINT;
  v_level TEXT;
  u public.users%ROWTYPE;
BEGIN
  pct := public.calculate_profile_completion(p_user_id);
  SELECT * INTO u FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_level := u.verification_level;
  IF u.nida_number IS NOT NULL AND u.is_verified THEN
    v_level := 'NIDA_VERIFIED';
  ELSIF pct >= 70 AND v_level IN ('PHONE_VERIFIED','EMAIL_VERIFIED') THEN
    v_level := 'PROFILE_COMPLETED';
  END IF;

  UPDATE public.users SET
    profile_completion_pct = pct,
    profile_complete       = (pct >= 60),
    verification_level     = v_level,
    updated_at             = NOW()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.update_profile_completion(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_completion ON public.users;
CREATE TRIGGER trg_users_completion
  AFTER UPDATE OF region, district, ward, street, date_of_birth,
                  nida_number, passport_number, phone, gender,
                  country_of_residence, city_of_residence, is_verified
  ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_completion();

-- -- 4. Upgrade verification tier --

CREATE OR REPLACE FUNCTION public.upgrade_verification_tier(
  p_user_id UUID,
  p_tier    TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users SET
    verification_level = p_tier,
    is_verified        = (p_tier IN ('PHONE_VERIFIED','EMAIL_VERIFIED','PROFILE_COMPLETED','PENDING_OFFICE_VISIT','NIDA_VERIFIED')),
    updated_at         = NOW()
  WHERE id = p_user_id;

  PERFORM public.update_profile_completion(p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upgrade_verification_tier(UUID, TEXT) TO authenticated;

-- -- 5. Phone lookup for login --

CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone TEXT)
RETURNS TABLE(email TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_digits TEXT;
  v_e164   TEXT;
  v_local  TEXT;
  v_short  TEXT;
BEGIN
  v_digits := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');

  v_e164 := CASE
    WHEN LEFT(v_digits, 3) = '255' THEN '+' || v_digits
    WHEN LEFT(v_digits, 1) = '0'   THEN '+255' || SUBSTRING(v_digits, 2)
    WHEN LENGTH(v_digits) = 9      THEN '+255' || v_digits
    ELSE p_phone
  END;

  v_local := CASE
    WHEN LEFT(v_digits, 3) = '255' THEN '0' || SUBSTRING(v_digits, 4)
    WHEN LEFT(v_digits, 1) = '0'   THEN v_digits
    ELSE '0' || v_digits
  END;

  v_short := CASE
    WHEN LEFT(v_digits, 3) = '255' THEN SUBSTRING(v_digits, 4)
    WHEN LEFT(v_digits, 1) = '0'   THEN SUBSTRING(v_digits, 2)
    ELSE v_digits
  END;

  RETURN QUERY
    SELECT u.email FROM public.users u
    WHERE u.phone IN (v_e164, v_local, v_digits, '+' || v_digits, v_short)
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_phone(TEXT) TO anon, authenticated;

-- -- 6. Marital status normaliser --

CREATE OR REPLACE FUNCTION public.normalise_marital_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.marital_status IS NOT NULL THEN
    NEW.marital_status := LOWER(NEW.marital_status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalise_marital ON public.users;
CREATE TRIGGER trg_normalise_marital
  BEFORE INSERT OR UPDATE OF marital_status ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.normalise_marital_status();