-- Public document checks go through the narrow server endpoint. Do not expose
-- application rows through the anonymous Supabase Data API, where a broad
-- SELECT could reveal applicant or form data.
REVOKE SELECT ON TABLE public.applications FROM anon;
DROP POLICY IF EXISTS applications_select_public ON public.applications;
