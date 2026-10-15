-- ============================================================================
-- E-MTAA REFERENCE NUMBERS -- human-readable operational IDs
-- Runs AFTER 20261014000002_office_registry.sql
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.application_reference_seq;
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_reference_seq;
CREATE SEQUENCE IF NOT EXISTS public.community_report_reference_seq;
CREATE SEQUENCE IF NOT EXISTS public.business_reference_seq;

CREATE OR REPLACE FUNCTION public.set_application_reference()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.application_number IS NULL OR BTRIM(NEW.application_number) = '' THEN
    NEW.application_number :=
      'TZ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
      LPAD(NEXTVAL('public.application_reference_seq')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_application_reference ON public.applications;
CREATE TRIGGER trg_set_application_reference
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_application_reference();

CREATE OR REPLACE FUNCTION public.set_business_reference()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  ref_prefix TEXT;
BEGIN
  IF NEW.status = 'approved' AND (NEW.business_id IS NULL OR BTRIM(NEW.business_id) = '') THEN
    ref_prefix := CASE
      WHEN NEW.business_type::TEXT = 'seller'   THEN 'SL'
      WHEN NEW.business_type::TEXT = 'landlord' THEN 'LL'
      ELSE 'BR'
    END;
    NEW.business_id :=
      ref_prefix || TO_CHAR(CURRENT_DATE, 'YYYY') ||
      LPAD(NEXTVAL('public.business_reference_seq')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_business_reference ON public.business_registrations;
CREATE TRIGGER trg_set_business_reference
  BEFORE INSERT OR UPDATE OF status ON public.business_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_business_reference();

ALTER TABLE public.applications
  ALTER COLUMN application_number SET NOT NULL;