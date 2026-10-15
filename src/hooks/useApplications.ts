import { useState, useEffect, useCallback } from "react";
import { supabase, Application, UserProfile } from "@/lib/supabase";
import type { ApplicationDraft } from "@/types";
import { IS_DEMO_MODE, IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { HARDCODED_SERVICES } from "@/constants/services";

const getServiceById = (serviceId: string) => {
  return HARDCODED_SERVICES.find((s) => s.id === serviceId) || null;
};

// Summary cache avoids re-downloading potentially large uploaded documents on
// every visit. Full form data is fetched only when the citizen opens a record.
const applicationCache = new Map<string, Application[]>();

const toApplicationSummary = (row: Partial<Application>, user: UserProfile): Application => ({
  ...(row as Application),
  form_data: {},
  services: getServiceById(row.service_id || "") || { name: row.service_name || "Service", fee: 0 },
  users: user,
});

export function useApplications(user: UserProfile | null) {
  const [applications, setApplications] = useState<Application[]>(() =>
    user?.id ? applicationCache.get(user.id) || [] : [],
  );
  const [drafts, setDrafts] = useState<ApplicationDraft[]>([]);
  const [loading, setLoading] = useState(() => !(user?.id && applicationCache.has(user.id)));
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!user || !user.id) {
      setApplications([]);
      setDrafts([]);
      return;
    }

    const cached = applicationCache.get(user.id);
    if (cached) {
      setApplications(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    const isConfigured = IS_SUPABASE_CONFIGURED;

    if (IS_DEMO_MODE && (!isConfigured || (user.id && user.id.startsWith("demo-")))) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const demoApps = JSON.parse(localStorage.getItem("demo_applications") || "[]");
      const userApps = demoApps
        .filter((app: Application) => app.user_id === user.id)
        .map((app: Application) => ({
          ...app,
          services: getServiceById(app.service_id) || {
            name: app.service_name || "Service",
            fee: 0,
          },
          users: user,
        }));
      applicationCache.set(user.id, userApps);
      setApplications(userApps);

      const userDrafts = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`draft_${user.id}_`)) {
          try {
            const draft = JSON.parse(localStorage.getItem(key)!) as ApplicationDraft;
            userDrafts.push({
              ...draft,
              services: getServiceById(draft.service_id) || {
                name: draft.service_name || "Service",
                fee: 0,
              },
              users: user,
            });
          } catch (_err) {
            console.error("Error parsing draft:", _err);
          }
        }
      }
      setDrafts(userDrafts);
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      setApplications([]);
      setDrafts([]);
      setError("Application service is not configured.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("applications")
      .select(
        "id, user_id, application_number, service_id, service_name, status, created_at, updated_at, region, district, ward, street, office_registry_id, target_user_id, second_party_user_id, target_user_role, agreement_status, approved_at, paid_at, issued_at, feedback, payment_data",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error("Error fetching applications:", fetchError);
      setError(fetchError.message);
    }

    if (data) {
      const appsWithServices = (data as unknown as Partial<Application>[]).map((app) =>
        toApplicationSummary(app, user),
      );
      applicationCache.set(user.id, appsWithServices);
      setApplications(appsWithServices);
    }

    setDrafts([]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Demo payment verification and issuance run after 45 seconds and survive
  // refreshes because the due time is stored in payment_data. If issuance
  // fails, the verified, paid application remains available for staff issuance.
  useEffect(() => {
    if (!user?.id) return;

    const timers = applications
      .filter((app) =>
        app.status === "paid" &&
        (app.payment_data?.auto_verify_at || app.payment_data?.auto_issue_at) &&
        !app.payment_data?.payment_verified_at,
      )
      .map((app) => {
        const dueAt = Date.parse(app.payment_data!.auto_verify_at || app.payment_data!.auto_issue_at!);
        const delay = Math.max(0, dueAt - Date.now());
        return window.setTimeout(async () => {
          const verifiedAt = new Date().toISOString();
          const nextPaymentData = {
            ...app.payment_data,
            status: "verified",
            payment_status: "verified",
            payment_verified_at: verifiedAt,
          };
          let autoIssued = false;
          const isLocalDemo =
            IS_DEMO_MODE &&
            (!IS_SUPABASE_CONFIGURED || user.id.startsWith("demo-"));

          if (isLocalDemo) {
            const stored: Application[] = JSON.parse(localStorage.getItem("demo_applications") || "[]");
            localStorage.setItem(
              "demo_applications",
              JSON.stringify(stored.map((item) => item.id === app.id
                ? { ...item, status: "issued", issued_at: verifiedAt, payment_data: nextPaymentData }
                : item)),
            );
            autoIssued = true;
          } else {
            const { error: verifyError } = await supabase
              .from("applications")
              .update({ payment_data: nextPaymentData })
              .eq("id", app.id)
              .eq("status", "paid");
            if (verifyError) {
              console.error("Could not complete demo payment verification:", verifyError);
              return;
            }

            const { data: issuedRow, error: issueError } = await supabase
              .from("applications")
              .update({ status: "issued", issued_at: verifiedAt })
              .eq("id", app.id)
              .eq("status", "paid")
              .select("id")
              .maybeSingle();
            if (issueError || !issuedRow) {
              console.error("Automatic issuance failed; staff can issue this verified application:", issueError);
            } else {
              autoIssued = true;
            }
          }

          setApplications((current) => {
            const updated = current.map((item) => item.id === app.id
              ? {
                  ...item,
                  ...(autoIssued ? { status: "issued" as const, issued_at: verifiedAt } : {}),
                  payment_data: nextPaymentData,
                }
              : item);
            applicationCache.set(user.id, updated);
            return updated;
          });
        }, delay);
      });

    return () => timers.forEach(window.clearTimeout);
  }, [applications, user?.id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    if (!user?.id || IS_DEMO_MODE || !IS_SUPABASE_CONFIGURED) return;

    const channel = supabase
      .channel(`citizen-applications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const appId = String((payload.new as Partial<Application>)?.id || (payload.old as Partial<Application>)?.id || "");
          if (!appId) return;

          setApplications((previous) => {
            const next =
              payload.eventType === "DELETE"
                ? previous.filter((app) => app.id !== appId)
                : (() => {
                    const updated = toApplicationSummary(payload.new as Partial<Application>, user);
                    const existing = previous.some((app) => app.id === appId);
                    return (existing
                      ? previous.map((app) => (app.id === appId ? { ...app, ...updated } : app))
                      : [updated, ...previous]
                    ).sort(
                      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                    );
                  })();
            applicationCache.set(user.id, next);
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const refreshApplications = useCallback(() => {
    fetchApplications();
  }, [fetchApplications]);

  const setApplicationsDirectly = useCallback((apps: Application[]) => {
    if (user?.id) applicationCache.set(user.id, apps);
    setApplications(apps);
  }, [user?.id]);

  return {
    applications,
    drafts,
    loading,
    error,
    fetchApplications,
    refreshApplications,
    setApplications: setApplicationsDirectly,
  };
}
