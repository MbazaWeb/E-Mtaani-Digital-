-- Support tickets, community reports, announcements, and their related records.

CREATE TABLE IF NOT EXISTS public.support_tickets (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	ticket_number TEXT NOT NULL UNIQUE DEFAULT ('TKT-' || upper(replace(gen_random_uuid()::TEXT, '-', ''))),
	citizen_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
	category TEXT NOT NULL,
	subject TEXT NOT NULL,
	description TEXT NOT NULL,
	priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
	status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed')),
	region TEXT,
	district TEXT,
	ward TEXT,
	street TEXT,
	assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
	assigned_department_id UUID,
	resolution_note TEXT,
	resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
	resolved_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_responses (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
	message TEXT NOT NULL,
	is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_reports (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	report_number TEXT NOT NULL UNIQUE DEFAULT ('RPT-' || upper(replace(gen_random_uuid()::TEXT, '-', ''))),
	citizen_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	description TEXT NOT NULL,
	category TEXT NOT NULL,
	priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
	status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed')),
	region TEXT,
	district TEXT,
	ward TEXT,
	street TEXT,
	gps_lat DOUBLE PRECISION,
	gps_lng DOUBLE PRECISION,
	assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
	assigned_department_id UUID,
	resolution_note TEXT,
	resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
	resolved_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_responses (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	report_id UUID NOT NULL REFERENCES public.community_reports(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
	message TEXT NOT NULL,
	is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_report_media (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	report_id UUID NOT NULL REFERENCES public.community_reports(id) ON DELETE CASCADE,
	media_data TEXT NOT NULL,
	media_type TEXT NOT NULL DEFAULT 'image',
	file_name TEXT NOT NULL,
	uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT 'public_notice',
	level TEXT NOT NULL DEFAULT 'ward' CHECK (level IN ('national', 'region', 'district', 'ward', 'street')),
	region TEXT,
	district TEXT,
	ward TEXT,
	street TEXT,
	priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
	published_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
	published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	expires_at TIMESTAMPTZ,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.department_routing_rules (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	category TEXT NOT NULL,
	category_type TEXT NOT NULL CHECK (category_type IN ('ticket', 'report')),
	department_id UUID NOT NULL,
	priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
	active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (category, category_type)
);

ALTER TABLE public.support_tickets
	ALTER COLUMN ticket_number SET DEFAULT ('TKT-' || upper(replace(gen_random_uuid()::TEXT, '-', '')));
ALTER TABLE public.community_reports
	ALTER COLUMN report_number SET DEFAULT ('RPT-' || upper(replace(gen_random_uuid()::TEXT, '-', '')));
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.department_routing_rules
	ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_support_tickets_citizen_created
	ON public.support_tickets (citizen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_area_status
	ON public.support_tickets (region, district, ward, status);
CREATE INDEX IF NOT EXISTS idx_support_responses_ticket_created
	ON public.support_responses (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_reports_citizen_created
	ON public.community_reports (citizen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reports_area_status
	ON public.community_reports (region, district, ward, status);
CREATE INDEX IF NOT EXISTS idx_report_responses_report_created
	ON public.report_responses (report_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_report_media_report
	ON public.community_report_media (report_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active_published
	ON public.announcements (is_active, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_department_routing_rules_lookup
	ON public.department_routing_rules (category, category_type, active);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
	public.support_tickets,
	public.support_responses,
	public.community_reports,
	public.report_responses,
	public.community_report_media,
	public.announcements,
	public.department_routing_rules
TO authenticated;
GRANT ALL ON TABLE
	public.support_tickets,
	public.support_responses,
	public.community_reports,
	public.report_responses,
	public.community_report_media,
	public.announcements,
	public.department_routing_rules
TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_report_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_routing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Citizens read own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Citizens create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Staff manage tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Citizens read own ticket responses" ON public.support_responses;
DROP POLICY IF EXISTS "Citizens add responses" ON public.support_responses;
DROP POLICY IF EXISTS "Staff manage responses" ON public.support_responses;
DROP POLICY IF EXISTS "Citizens read own reports" ON public.community_reports;
DROP POLICY IF EXISTS "Citizens create reports" ON public.community_reports;
DROP POLICY IF EXISTS "Staff manage reports" ON public.community_reports;
DROP POLICY IF EXISTS "Report participants read media" ON public.community_report_media;
DROP POLICY IF EXISTS "Users upload media" ON public.community_report_media;
DROP POLICY IF EXISTS "Citizens read own report responses" ON public.report_responses;
DROP POLICY IF EXISTS "Citizens add report responses" ON public.report_responses;
DROP POLICY IF EXISTS "Staff manage report responses" ON public.report_responses;

CREATE POLICY support_tickets_read_citizen_or_staff ON public.support_tickets
	FOR SELECT TO authenticated
	USING (citizen_id = (SELECT auth.uid()) OR public.is_admin_or_staff());
CREATE POLICY support_tickets_insert_citizen ON public.support_tickets
	FOR INSERT TO authenticated
	WITH CHECK (citizen_id = (SELECT auth.uid()));
CREATE POLICY support_tickets_update_staff ON public.support_tickets
	FOR UPDATE TO authenticated
	USING (public.is_admin_or_staff())
	WITH CHECK (public.is_admin_or_staff());

CREATE POLICY support_responses_read_citizen_or_staff ON public.support_responses
	FOR SELECT TO authenticated
	USING (
		public.is_admin_or_staff()
		OR (
			is_internal_note = FALSE
			AND EXISTS (
				SELECT 1 FROM public.support_tickets ticket
				WHERE ticket.id = support_responses.ticket_id
					AND ticket.citizen_id = (SELECT auth.uid())
			)
		)
	);
CREATE POLICY support_responses_insert_citizen_or_staff ON public.support_responses
	FOR INSERT TO authenticated
	WITH CHECK (
		user_id = (SELECT auth.uid())
		AND (
			public.is_admin_or_staff()
			OR (
				is_internal_note = FALSE
				AND EXISTS (
					SELECT 1 FROM public.support_tickets ticket
					WHERE ticket.id = support_responses.ticket_id
						AND ticket.citizen_id = (SELECT auth.uid())
				)
			)
		)
	);

CREATE POLICY community_reports_read_citizen_or_staff ON public.community_reports
	FOR SELECT TO authenticated
	USING (citizen_id = (SELECT auth.uid()) OR public.is_admin_or_staff());
CREATE POLICY community_reports_insert_citizen ON public.community_reports
	FOR INSERT TO authenticated
	WITH CHECK (citizen_id = (SELECT auth.uid()));
CREATE POLICY community_reports_update_staff ON public.community_reports
	FOR UPDATE TO authenticated
	USING (public.is_admin_or_staff())
	WITH CHECK (public.is_admin_or_staff());

CREATE POLICY report_responses_read_citizen_or_staff ON public.report_responses
	FOR SELECT TO authenticated
	USING (
		public.is_admin_or_staff()
		OR (
			is_internal_note = FALSE
			AND EXISTS (
				SELECT 1 FROM public.community_reports report
				WHERE report.id = report_responses.report_id
					AND report.citizen_id = (SELECT auth.uid())
			)
		)
	);
CREATE POLICY report_responses_insert_citizen_or_staff ON public.report_responses
	FOR INSERT TO authenticated
	WITH CHECK (
		user_id = (SELECT auth.uid())
		AND (
			public.is_admin_or_staff()
			OR (
				is_internal_note = FALSE
				AND EXISTS (
					SELECT 1 FROM public.community_reports report
					WHERE report.id = report_responses.report_id
						AND report.citizen_id = (SELECT auth.uid())
				)
			)
		)
	);

CREATE POLICY community_report_media_read_citizen_or_staff ON public.community_report_media
	FOR SELECT TO authenticated
	USING (
		public.is_admin_or_staff()
		OR EXISTS (
			SELECT 1 FROM public.community_reports report
			WHERE report.id = community_report_media.report_id
				AND report.citizen_id = (SELECT auth.uid())
		)
	);
CREATE POLICY community_report_media_insert_citizen ON public.community_report_media
	FOR INSERT TO authenticated
	WITH CHECK (
		uploaded_by = (SELECT auth.uid())
		AND EXISTS (
			SELECT 1 FROM public.community_reports report
			WHERE report.id = community_report_media.report_id
				AND report.citizen_id = (SELECT auth.uid())
		)
	);

CREATE POLICY announcements_read_active_or_staff ON public.announcements
	FOR SELECT TO authenticated
	USING (is_active = TRUE OR public.is_admin_or_staff());
CREATE POLICY announcements_insert_staff ON public.announcements
	FOR INSERT TO authenticated
	WITH CHECK (published_by = (SELECT auth.uid()) AND public.is_admin_or_staff());
CREATE POLICY announcements_update_staff ON public.announcements
	FOR UPDATE TO authenticated
	USING (public.is_admin_or_staff())
	WITH CHECK (public.is_admin_or_staff());

CREATE POLICY department_routing_rules_read_authenticated ON public.department_routing_rules
	FOR SELECT TO authenticated
	USING (TRUE);
CREATE POLICY department_routing_rules_manage_staff ON public.department_routing_rules
	FOR ALL TO authenticated
	USING (public.is_admin_or_staff())
	WITH CHECK (public.is_admin_or_staff());

DROP TRIGGER IF EXISTS trigger_support_tickets_updated ON public.support_tickets;
CREATE TRIGGER trigger_support_tickets_updated
	BEFORE UPDATE ON public.support_tickets
	FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
DROP TRIGGER IF EXISTS trigger_community_reports_updated ON public.community_reports;
CREATE TRIGGER trigger_community_reports_updated
	BEFORE UPDATE ON public.community_reports
	FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

NOTIFY pgrst, 'reload schema';
