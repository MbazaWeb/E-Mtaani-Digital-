-- --
-- E-MTAA CORE SETUP -- Consolidated, idempotent, single source of truth
-- Safe to run multiple times. No conflicting definitions.
-- --

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -- 1. Enums --
DO $$ BEGIN CREATE TYPE public.user_role AS ENUM ('citizen','staff','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.application_status AS ENUM ('submitted','pending_review','pending_payment','paid','verified','approved','issued','returned','rejected','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.business_type AS ENUM ('seller','landlord','broker'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.business_registration_status AS ENUM ('pending','approved','rejected','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.client_relationship_type AS ENUM ('tenant','buyer','renter'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.client_relationship_status AS ENUM ('active','inactive','pending','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -- 2. Tables --

CREATE TABLE IF NOT EXISTS public.users (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    TEXT UNIQUE NOT NULL,
  first_name               TEXT NOT NULL DEFAULT '',
  middle_name              TEXT,
  last_name                TEXT NOT NULL DEFAULT '',
  phone                    TEXT,
  alternative_phone        TEXT,
  email_address            TEXT,
  alternative_email        TEXT,
  photo_url                TEXT,

  role                     public.user_role NOT NULL DEFAULT 'citizen',
  account_status           TEXT NOT NULL DEFAULT 'active'
                             CHECK (account_status IN ('active','suspended','pending')),
  is_verified              BOOLEAN NOT NULL DEFAULT FALSE,
  is_diaspora              BOOLEAN NOT NULL DEFAULT FALSE,
  profile_complete         BOOLEAN NOT NULL DEFAULT FALSE,
  profile_completion_pct   SMALLINT NOT NULL DEFAULT 0,
  verification_level       TEXT NOT NULL DEFAULT 'UNVERIFIED'
                             CHECK (verification_level IN (
                               'UNVERIFIED','PHONE_VERIFIED','EMAIL_VERIFIED',
                               'PROFILE_COMPLETED','PENDING_OFFICE_VISIT','NIDA_VERIFIED'
                             )),

  sex                      TEXT,
  gender                   TEXT,
  date_of_birth            DATE,
  place_of_birth           TEXT,
  marital_status           TEXT CHECK (marital_status IS NULL OR marital_status IN ('single','married','divorced','widowed')),
  occupation               TEXT,
  education_level          TEXT CHECK (education_level IS NULL OR education_level IN ('none','primary','secondary','diploma','degree','masters','phd')),
  nationality              TEXT DEFAULT 'Tanzanian',
  country_of_citizenship   TEXT DEFAULT 'Tanzania',
  blood_group              TEXT CHECK (blood_group IS NULL OR blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  disability_status        TEXT CHECK (disability_status IS NULL OR disability_status IN ('none','physical','visual','hearing','speech','multiple')),
  religious_affiliation    TEXT,
  tribe                    TEXT,

  nida_number              TEXT UNIQUE,
  id_type                  TEXT,
  id_number                TEXT,
  passport_number          TEXT,
  voter_id_number          TEXT,
  driving_license_number   TEXT,
  citizen_id               TEXT UNIQUE,

  region                   TEXT,
  district                 TEXT,
  ward                     TEXT,
  street                   TEXT,
  house_number             TEXT,
  postal_code              TEXT,
  landmark                 TEXT,
  birth_region             TEXT,
  birth_district           TEXT,

  country_of_residence     TEXT,
  city_of_residence        TEXT,
  diaspora_region          TEXT,
  diaspora_district        TEXT,
  diaspora_ward            TEXT,

  email_verified           BOOLEAN DEFAULT FALSE,
  phone_verified           BOOLEAN DEFAULT FALSE,
  last_login               TIMESTAMPTZ,

  office_id                UUID,
  assigned_office_id       UUID,
  assigned_region          TEXT,
  assigned_district        TEXT,
  employee_id              TEXT,
  department               TEXT,
  position                 TEXT,
  employment_date          DATE,
  is_department_member     BOOLEAN DEFAULT FALSE,
  department_id            UUID,
  signature_url            TEXT,
  stamp_url                TEXT,

  seller_id                TEXT UNIQUE,
  landlord_id              TEXT UNIQUE,
  broker_id                TEXT UNIQUE,

  mtaa_executive_officer   TEXT,
  ward_councillor          TEXT,
  ward_chairperson         TEXT,

  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  emergency_contact_relation TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT UNIQUE NOT NULL,
  name_en               TEXT,
  description           TEXT,
  description_en        TEXT,
  form_schema           JSONB NOT NULL DEFAULT '[]'::jsonb,
  diaspora_form_schema  JSONB,
  document_template     JSONB,
  fee                   DECIMAL(12,2) NOT NULL DEFAULT 0,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  name_sw      TEXT,
  description  TEXT,
  icon         TEXT,
  "order"      INTEGER DEFAULT 0,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  level       TEXT NOT NULL CHECK (level IN ('region','district','ward','street')),
  parent_id   UUID REFERENCES public.locations(id),
  code        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT UNIQUE,
  region      TEXT,
  district    TEXT,
  ward        TEXT,
  street      TEXT,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number    TEXT UNIQUE,
  user_id               UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_id            UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name          TEXT,
  form_data             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                public.application_status NOT NULL DEFAULT 'submitted',
  region                TEXT,
  district              TEXT,
  ward                  TEXT,
  street                TEXT,
  location_id           UUID REFERENCES public.locations(id),
  assigned_staff_id     UUID REFERENCES public.users(id),
  assigned_office_id    UUID,
  office_registry_id    UUID,
  second_party_user_id  UUID REFERENCES public.users(id),
  second_party_citizen_id TEXT,
  second_party_accepted BOOLEAN DEFAULT FALSE,
  second_party_accepted_at TIMESTAMPTZ,
  target_user_id        UUID REFERENCES public.users(id),
  target_user_nida      TEXT,
  target_user_role      TEXT,
  agreement_status      TEXT CHECK (agreement_status IS NULL OR agreement_status IN ('pending','approved','rejected','expired')),
  approved_by_target    UUID REFERENCES public.users(id),
  approved_by_target_at TIMESTAMPTZ,
  target_rejection_reason TEXT,
  confirmation_data     JSONB,
  is_confirmed          BOOLEAN DEFAULT FALSE,
  payment_data          JSONB,
  approved_by           UUID REFERENCES public.users(id),
  approved_at           TIMESTAMPTZ,
  rejected_by           UUID REFERENCES public.users(id),
  rejected_at           TIMESTAMPTZ,
  returned_by           UUID REFERENCES public.users(id),
  returned_at           TIMESTAMPTZ,
  issued_by             UUID REFERENCES public.users(id),
  issued_at             TIMESTAMPTZ,
  verified_by           UUID REFERENCES public.users(id),
  verified_at           TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  feedback              TEXT,
  checklist_phone_verified    BOOLEAN DEFAULT FALSE,
  checklist_address_verified  BOOLEAN DEFAULT FALSE,
  checklist_id_verified       BOOLEAN DEFAULT FALSE,
  checklist_witnesses_added   BOOLEAN DEFAULT FALSE,
  checklist_final_approved    BOOLEAN DEFAULT FALSE,
  buyer_accepted        BOOLEAN,
  tenant_accepted       BOOLEAN,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  amount          DECIMAL(12,2) NOT NULL,
  currency        TEXT DEFAULT 'TZS',
  payment_method  TEXT,
  transaction_id  TEXT UNIQUE,
  receipt_number  TEXT UNIQUE,
  breakdown       JSONB,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generated_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  document_url    TEXT NOT NULL,
  qr_code_url     TEXT,
  certificate_id  TEXT UNIQUE,
  issue_date      DATE DEFAULT CURRENT_DATE,
  expiry_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_type       public.business_type NOT NULL,
  business_id         VARCHAR(20) UNIQUE,
  business_name       VARCHAR(255),
  description         TEXT,
  experience_years    INTEGER DEFAULT 0,
  specialization      VARCHAR(255),
  region              VARCHAR(100),
  district            VARCHAR(100),
  ward                VARCHAR(100),
  street              VARCHAR(255),
  phone               VARCHAR(20),
  alt_phone           VARCHAR(20),
  email               VARCHAR(255),
  id_document_url     TEXT,
  proof_document_url  TEXT,
  photo_url           TEXT,
  status              public.business_registration_status DEFAULT 'pending',
  rejection_reason    TEXT,
  reviewed_by         UUID REFERENCES public.users(id),
  reviewed_at         TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_relationships (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_business_id     VARCHAR(20),
  owner_business_type   VARCHAR(20),
  client_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_citizen_id     VARCHAR(20),
  relationship_type     public.client_relationship_type NOT NULL,
  property_type         VARCHAR(100),
  property_description  TEXT,
  property_address      TEXT,
  property_region       VARCHAR(100),
  property_district     VARCHAR(100),
  property_ward         VARCHAR(100),
  agreement_id          UUID,
  agreement_number      VARCHAR(50),
  monthly_rent          DECIMAL(15,2),
  total_price           DECIMAL(15,2),
  deposit_amount        DECIMAL(15,2),
  currency              VARCHAR(10) DEFAULT 'TZS',
  start_date            DATE NOT NULL,
  end_date              DATE,
  last_payment_date     DATE,
  next_payment_due      DATE,
  status                public.client_relationship_status DEFAULT 'active',
  status_reason         TEXT,
  client_name           VARCHAR(255),
  client_phone          VARCHAR(20),
  client_email          VARCHAR(255),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profile_change_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  field_name        TEXT NOT NULL,
  old_value         TEXT,
  new_value         TEXT NOT NULL,
  status            TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by       UUID REFERENCES public.users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT DEFAULT 'info',
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agreement_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_citizen_id TEXT,
  notification_type   TEXT DEFAULT 'agreement_approval',
  message             TEXT,
  is_read             BOOLEAN DEFAULT FALSE,
  is_actioned         BOOLEAN DEFAULT FALSE,
  action_taken        TEXT,
  action_reason       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actioned_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type      TEXT NOT NULL,
  document_category  TEXT NOT NULL DEFAULT 'support',
  document_name      TEXT NOT NULL,
  document_url       TEXT NOT NULL,
  file_type          TEXT,
  file_size          INTEGER,
  verified           BOOLEAN DEFAULT FALSE,
  verified_by        UUID REFERENCES public.users(id),
  verified_at        TIMESTAMPTZ,
  notes              TEXT,
  uploaded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title             VARCHAR(255),
  description       TEXT,
  location_id       UUID REFERENCES public.locations(id),
  start_date        DATE,
  end_date          DATE,
  start_time        TIME,
  end_time          TIME,
  capacity          INTEGER,
  registered_count  INTEGER DEFAULT 0,
  active            BOOLEAN DEFAULT TRUE,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.users(id),
  action       TEXT NOT NULL,
  action_type  TEXT,
  severity     TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  status       TEXT DEFAULT 'success' CHECK (status IN ('success','pending','failed')),
  description  TEXT,
  user_role    TEXT,
  entity_type  TEXT,
  entity_id    TEXT,
  details      JSONB DEFAULT '{}'::jsonb,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -- 3. Helper functions --

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.citizen_id_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_citizen_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  year_part   TEXT;
  letter_part TEXT;
  number_part TEXT;
  counter     INT;
BEGIN
  year_part   := TO_CHAR(CURRENT_DATE, 'YYYY');
  counter     := COALESCE(NEXTVAL('public.citizen_id_seq'), 1);
  letter_part := CHR(65 + ((counter - 1) / 999999) % 26);
  number_part := LPAD(((counter - 1) % 999999 + 1)::TEXT, 5, '0');
  RETURN 'CT' || year_part || letter_part || number_part;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_citizen_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.citizen_id IS NULL THEN
    NEW.citizen_id := public.generate_citizen_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_safe()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role_safe() = 'admin', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.get_user_role_safe() IN ('staff','admin'), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_or_staff();
$$;

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID, email TEXT, first_name TEXT, last_name TEXT,
  role TEXT, is_verified BOOLEAN, account_status TEXT,
  region TEXT, district TEXT, ward TEXT, street TEXT
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email, u.first_name, u.last_name,
         u.role::TEXT, u.is_verified, u.account_status,
         u.region, u.district, u.ward, u.street
  FROM public.users u WHERE u.id = p_user_id;
$$;

-- -- 4. Triggers --

DROP TRIGGER IF EXISTS trigger_set_citizen_id ON public.users;
CREATE TRIGGER trigger_set_citizen_id
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_citizen_id();

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trigger_applications_updated_at ON public.applications;
CREATE TRIGGER trigger_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- -- 5. Indexes --

CREATE INDEX IF NOT EXISTS idx_users_email        ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone        ON public.users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_nida         ON public.users(nida_number) WHERE nida_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role         ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_region       ON public.users(region);
CREATE INDEX IF NOT EXISTS idx_users_citizen_id   ON public.users(citizen_id) WHERE citizen_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_verification ON public.users(verification_level);

CREATE INDEX IF NOT EXISTS idx_applications_user_id       ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status        ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_number        ON public.applications(application_number);
CREATE INDEX IF NOT EXISTS idx_applications_ward          ON public.applications(ward);
CREATE INDEX IF NOT EXISTS idx_applications_district      ON public.applications(district);
CREATE INDEX IF NOT EXISTS idx_applications_region        ON public.applications(region);
CREATE INDEX IF NOT EXISTS idx_applications_created_at    ON public.applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_service_name  ON public.applications(service_name);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_staff ON public.applications(assigned_staff_id);

CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read       ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bizreg_user_id ON public.business_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_bizreg_status  ON public.business_registrations(status);

CREATE INDEX IF NOT EXISTS idx_relationships_owner_id  ON public.client_relationships(owner_id);
CREATE INDEX IF NOT EXISTS idx_relationships_client_id ON public.client_relationships(client_id);

CREATE INDEX IF NOT EXISTS idx_logs_user_id    ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_action     ON public.activity_logs(action);

-- -- 6. Grants --

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users                   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_documents     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_registrations  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_relationships    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_change_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agreement_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions                TO authenticated;
GRANT SELECT, INSERT                ON public.activity_logs            TO authenticated;

GRANT SELECT ON public.users              TO anon;
GRANT SELECT ON public.services           TO anon;
GRANT SELECT ON public.applications       TO anon;
GRANT SELECT ON public.generated_documents TO anon;
GRANT SELECT ON public.locations          TO anon;
GRANT SELECT ON public.offices            TO anon;
GRANT SELECT ON public.service_categories TO anon;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- -- 7. Row Level Security --

ALTER TABLE public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_relationships    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs           ENABLE ROW LEVEL SECURITY;

-- USERS
DROP POLICY IF EXISTS users_select_own     ON public.users;
CREATE POLICY users_select_own     ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS users_insert_self    ON public.users;
CREATE POLICY users_insert_self    ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS users_update_own     ON public.users;
CREATE POLICY users_update_own     ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS users_select_staff   ON public.users;
CREATE POLICY users_select_staff   ON public.users FOR SELECT USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS users_update_staff   ON public.users;
CREATE POLICY users_update_staff   ON public.users FOR UPDATE USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS users_delete_admin   ON public.users;
CREATE POLICY users_delete_admin   ON public.users FOR DELETE USING (public.is_admin());

-- SERVICES
DROP POLICY IF EXISTS services_select_all   ON public.services;
CREATE POLICY services_select_all   ON public.services FOR SELECT USING (active = true OR public.is_admin_or_staff());
DROP POLICY IF EXISTS services_modify_staff ON public.services;
CREATE POLICY services_modify_staff ON public.services FOR ALL USING (public.is_admin_or_staff());

-- SERVICE CATEGORIES
DROP POLICY IF EXISTS service_categories_select_all   ON public.service_categories;
CREATE POLICY service_categories_select_all   ON public.service_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS service_categories_modify_staff ON public.service_categories;
CREATE POLICY service_categories_modify_staff ON public.service_categories FOR ALL USING (public.is_admin_or_staff());

-- LOCATIONS
DROP POLICY IF EXISTS locations_select_all   ON public.locations;
CREATE POLICY locations_select_all   ON public.locations FOR SELECT USING (true);
DROP POLICY IF EXISTS locations_modify_staff ON public.locations;
CREATE POLICY locations_modify_staff ON public.locations FOR ALL USING (public.is_admin_or_staff());

-- OFFICES
DROP POLICY IF EXISTS offices_select_all   ON public.offices;
CREATE POLICY offices_select_all   ON public.offices FOR SELECT USING (true);
DROP POLICY IF EXISTS offices_modify_staff ON public.offices;
CREATE POLICY offices_modify_staff ON public.offices FOR ALL USING (public.is_admin_or_staff());

-- APPLICATIONS
DROP POLICY IF EXISTS applications_select_own ON public.applications;
CREATE POLICY applications_select_own ON public.applications
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = second_party_user_id OR auth.uid() = target_user_id);
DROP POLICY IF EXISTS applications_insert_own ON public.applications;
CREATE POLICY applications_insert_own ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS applications_update_own ON public.applications;
CREATE POLICY applications_update_own ON public.applications
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = second_party_user_id OR auth.uid() = target_user_id);
DROP POLICY IF EXISTS applications_select_staff ON public.applications;
CREATE POLICY applications_select_staff ON public.applications
  FOR SELECT USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS applications_update_staff ON public.applications;
CREATE POLICY applications_update_staff ON public.applications
  FOR UPDATE USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS applications_select_public ON public.applications;
CREATE POLICY applications_select_public ON public.applications
  FOR SELECT USING (status = 'issued');

-- PAYMENTS
DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications WHERE id = payments.application_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS payments_insert_own ON public.payments;
CREATE POLICY payments_insert_own ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.applications WHERE id = payments.application_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS payments_select_staff ON public.payments;
CREATE POLICY payments_select_staff ON public.payments FOR SELECT USING (public.is_admin_or_staff());

-- GENERATED DOCUMENTS
DROP POLICY IF EXISTS generated_documents_select_all   ON public.generated_documents;
CREATE POLICY generated_documents_select_all   ON public.generated_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS generated_documents_modify_staff ON public.generated_documents;
CREATE POLICY generated_documents_modify_staff ON public.generated_documents FOR ALL USING (public.is_admin_or_staff());

-- BUSINESS REGISTRATIONS
DROP POLICY IF EXISTS bizreg_select_own   ON public.business_registrations;
CREATE POLICY bizreg_select_own   ON public.business_registrations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS bizreg_insert_own   ON public.business_registrations;
CREATE POLICY bizreg_insert_own   ON public.business_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS bizreg_update_own   ON public.business_registrations;
CREATE POLICY bizreg_update_own   ON public.business_registrations FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS bizreg_select_staff ON public.business_registrations;
CREATE POLICY bizreg_select_staff ON public.business_registrations FOR SELECT USING (public.is_admin_or_staff());
DROP POLICY IF EXISTS bizreg_update_staff ON public.business_registrations;
CREATE POLICY bizreg_update_staff ON public.business_registrations FOR UPDATE USING (public.is_admin_or_staff());

-- CLIENT RELATIONSHIPS
DROP POLICY IF EXISTS relationships_select_owner ON public.client_relationships;
CREATE POLICY relationships_select_owner ON public.client_relationships FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS relationships_select_client ON public.client_relationships;
CREATE POLICY relationships_select_client ON public.client_relationships FOR SELECT USING (auth.uid() = client_id);
DROP POLICY IF EXISTS relationships_insert_owner ON public.client_relationships;
CREATE POLICY relationships_insert_owner ON public.client_relationships FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS relationships_update_owner ON public.client_relationships;
CREATE POLICY relationships_update_owner ON public.client_relationships FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS relationships_select_staff ON public.client_relationships;
CREATE POLICY relationships_select_staff ON public.client_relationships FOR SELECT USING (public.is_admin_or_staff());

-- PROFILE CHANGE REQUESTS
DROP POLICY IF EXISTS pcr_select_own   ON public.profile_change_requests;
CREATE POLICY pcr_select_own   ON public.profile_change_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS pcr_insert_own   ON public.profile_change_requests;
CREATE POLICY pcr_insert_own   ON public.profile_change_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS pcr_select_staff ON public.profile_change_requests;
CREATE POLICY pcr_select_staff ON public.profile_change_requests FOR ALL USING (public.is_admin_or_staff());

-- NOTIFICATIONS
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS notifications_insert_auth ON public.notifications;
CREATE POLICY notifications_insert_auth ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS notifications_select_staff ON public.notifications;
CREATE POLICY notifications_select_staff ON public.notifications FOR SELECT USING (public.is_admin_or_staff());

-- AGREEMENT NOTIFICATIONS
DROP POLICY IF EXISTS agreement_notifs_select_recipient ON public.agreement_notifications;
CREATE POLICY agreement_notifs_select_recipient ON public.agreement_notifications
  FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
DROP POLICY IF EXISTS agreement_notifs_update_recipient ON public.agreement_notifications;
CREATE POLICY agreement_notifs_update_recipient ON public.agreement_notifications
  FOR UPDATE USING (auth.uid() = recipient_id);
DROP POLICY IF EXISTS agreement_notifs_insert_auth ON public.agreement_notifications;
CREATE POLICY agreement_notifs_insert_auth ON public.agreement_notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS agreement_notifs_select_staff ON public.agreement_notifications;
CREATE POLICY agreement_notifs_select_staff ON public.agreement_notifications
  FOR SELECT USING (public.is_admin_or_staff());

-- USER DOCUMENTS
DROP POLICY IF EXISTS documents_select_own   ON public.user_documents;
CREATE POLICY documents_select_own   ON public.user_documents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS documents_insert_own   ON public.user_documents;
CREATE POLICY documents_insert_own   ON public.user_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS documents_update_own   ON public.user_documents;
CREATE POLICY documents_update_own   ON public.user_documents FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS documents_select_staff ON public.user_documents;
CREATE POLICY documents_select_staff ON public.user_documents FOR SELECT USING (public.is_admin_or_staff());

-- SESSIONS
DROP POLICY IF EXISTS sessions_select_own ON public.sessions;
CREATE POLICY sessions_select_own ON public.sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS sessions_insert_own ON public.sessions;
CREATE POLICY sessions_insert_own ON public.sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ACTIVITY LOGS
DROP POLICY IF EXISTS logs_select_admin ON public.activity_logs;
CREATE POLICY logs_select_admin ON public.activity_logs FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS logs_select_own   ON public.activity_logs;
CREATE POLICY logs_select_own   ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS logs_insert_auth  ON public.activity_logs;
CREATE POLICY logs_insert_auth  ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);