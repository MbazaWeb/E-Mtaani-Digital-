import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  UserCheck,
  HelpCircle,
  Building2,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase, Application } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { StatCard } from "@/components/ui/StatCard";
import { getApplicationAmount } from "@/lib/serviceFees";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface StaffDashboardProps {
  setView: (view: string) => void;
}

export function StaffDashboard({ setView }: StaffDashboardProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    paid: 0,
    returned: 0,
    approved: 0,
    total: 0,
    pendingBusiness: 0, // Pending business registration applications
    revenue: 0,
  });


  useEffect(() => {
    fetchData();

    // Supabase realtime: instant notification when a new application is inserted
    const channel = supabase
      .channel("staff_applications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "applications" }, () =>
        fetchData(),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "applications" }, () =>
        fetchData(),
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      setRealtimeConnected(false);
      supabase.removeChannel(channel);
    };
    // Re-run after the auth profile loads or staff assignment changes so the
    // first authenticated dashboard view is populated with the right scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, user?.ward, user?.assigned_district, user?.assigned_region]);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Fetch stats
      const isConfigured = IS_SUPABASE_CONFIGURED;

      if (!isConfigured) {
        setApplications([]);
        setLoadError(
          lang === "sw"
            ? "Muunganisho wa hifadhidata haujasanidiwa."
            : "The database connection is not configured.",
        );
        setStats((prev) => ({
          ...prev,
          pending: 0,
          paid: 0,
          returned: 0,
          approved: 0,
          total: 0,
          revenue: 0,
        }));
        return;
      }

      let statsQuery = supabase
        .from("applications")
        .select("status, service_name, form_data, payment_data");

      if (["staff", "admin"].includes(user?.role || "")) {
        if (user?.ward) {
          statsQuery = statsQuery.eq("ward", user.ward);
        } else if (user?.assigned_district) {
          statsQuery = statsQuery.eq("district", user.assigned_district);
        } else if (user?.assigned_region) {
          statsQuery = statsQuery.eq("region", user.assigned_region);
        }
      }

      const { data: allApps, error: statsError } = await statsQuery;
      if (statsError) {
        console.error("Error fetching staff application stats:", statsError);
        setLoadError(statsError.message);
      }

      // Also fetch pending business registrations count
      const { count: pendingBusinessCount, error: businessError } = await supabase
        .from("business_registrations")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (businessError) console.error("Error fetching pending businesses:", businessError);

      if (allApps) {
        setStats({
          pending: allApps.filter((a) => a.status === "submitted" || a.status === "pending_review")
            .length,
          paid: allApps.filter((a) => a.status === "paid").length,
          revenue: allApps
            .filter((a) => ["paid", "approved", "issued"].includes(a.status as string))
            .reduce(
              (s, a) =>
                s +
                getApplicationAmount(
                  a as {
                    service_name?: string;
                    form_data?: Record<string, unknown>;
                    payment_data?: Record<string, unknown>;
                  },
                ),
              0,
            ),
          returned: allApps.filter((a) => a.status === "returned").length,
          approved: allApps.filter((a) => a.status === "approved" || a.status === "issued").length,
          total: allApps.length,
          pendingBusiness: pendingBusinessCount || 0,
        });
      }

      // Fetch recent applications (without service join to avoid empty results)
      let query = supabase
        .from("applications")
        .select(
          "id, application_number, service_name, status, created_at, ward, district, region, form_data, payment_data, services(name), users!applications_user_id_fkey(first_name, last_name)",
        )
        .order("created_at", { ascending: false });

      // Only filter by location if assigned - otherwise, staff can see all (small mtaa)
      if (["staff", "admin"].includes(user?.role || "")) {
        if (user?.ward) {
          query = query.eq("ward", user.ward);
        } else if (user?.assigned_district) {
          query = query.eq("district", user.assigned_district);
        } else if (user?.assigned_region) {
          query = query.eq("region", user.assigned_region);
        } else {
          // no region filter applied for this user role
        }
      }

      const { data, error } = await query.limit(10);

      if (!error && data) {
        setApplications(data as unknown as import("@/lib/supabase").Application[]);
      } else if (error) {
        console.error("Error fetching applications:", error);
        setLoadError((current) => current || error.message);
        setApplications([]);
      }
    } catch (_error) {
      console.error("Error fetching staff dashboard data:", _error);
      setLoadError(
        _error instanceof Error
          ? _error.message
          : lang === "sw"
            ? "Imeshindwa kupakia dashibodi."
            : "Could not load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {lang === "sw" ? "Dashibodi ya Mtumishi" : "Staff Dashboard"}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === "sw"
              ? `Karibu, ${user?.first_name}. Ofisi: ${user?.assigned_district || user?.assigned_region || "Makao Makuu"}`
              : `Welcome, ${user?.first_name}. Office: ${user?.assigned_district || user?.assigned_region || "Headquarters"}`}
          </p>
        </div>
        <div className="flex gap-3">
          <div
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border ${
              realtimeConnected
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-amber-50 text-amber-700 border-amber-100"
            }`}
            title={
              realtimeConnected
                ? "Realtime is connected"
                : "Realtime is disconnected; use refresh to reload applications"
            }
          >
            <TrendingUp size={16} />
            {realtimeConnected
              ? lang === "sw"
                ? "Sasisho la papo hapo: Linafanya kazi"
                : "Live updates: Connected"
              : lang === "sw"
                ? "Sasisho la papo hapo: Limekatika"
                : "Live updates: Offline"}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="ml-2 inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-1 text-xs hover:bg-white disabled:opacity-50"
              aria-label={lang === "sw" ? "Onyesha upya maombi" : "Refresh applications"}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              {lang === "sw" ? "Onyesha upya" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={<Clock className="text-blue-500" />}
          label={lang === "sw" ? "Maombi Mapya" : "New Applications"}
          value={stats.pending}
        />
        <StatCard
          icon={<AlertCircle className="text-amber-500" />}
          label={lang === "sw" ? "Zilizolipwa" : "Paid Applications"}
          value={stats.paid}
        />
        <StatCard
          icon={<RefreshCw className="text-orange-500" />}
          label={lang === "sw" ? "Zilizorudishwa" : "Returned"}
          value={stats.returned}
        />
        <StatCard
          icon={<CheckCircle className="text-emerald-500" />}
          label={lang === "sw" ? "Zilizoidhinishwa" : "Approved"}
          value={stats.approved}
        />
        <StatCard
          icon={<FileText className="text-stone-500" />}
          label={lang === "sw" ? "Jumla ya Maombi" : "Total Handled"}
          value={stats.total}
        />
        <StatCard
          icon={<DollarSign className="text-green-600" />}
          label={lang === "sw" ? "Mapato" : "Revenue"}
          value={`TSh ${stats.revenue.toLocaleString()}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-stone-900">
              {lang === "sw" ? "Maombi ya Karibuni" : "Recent Applications"}
            </h3>
            <button
              onClick={() => setView("application_review")}
              className="text-sm font-bold text-emerald-600 hover:underline"
            >
              {lang === "sw" ? "Tazama Yote" : "View All"}
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {loadError && (
              <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-bold">
                  {lang === "sw" ? "Maombi hayakupakiwa" : "Applications could not be loaded"}
                </p>
                <p className="mt-1 break-words">{loadError}</p>
                <button
                  type="button"
                  onClick={fetchData}
                  className="mt-3 inline-flex items-center gap-2 font-bold text-red-800 underline"
                >
                  <RefreshCw size={14} /> {lang === "sw" ? "Jaribu tena" : "Try again"}
                </button>
              </div>
            )}
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-stone-400 font-bold">
                  {lang === "sw" ? "Inapakia..." : "Loading..."}
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center text-stone-500">
                <p className="font-bold text-stone-700">
                  {lang === "sw" ? "Hakuna maombi kwenye eneo lako." : "No applications in your assigned area."}
                </p>
                <p className="mt-2 text-sm">
                  {lang === "sw"
                    ? `Eneo: ${user?.ward || user?.assigned_district || user?.assigned_region || "Ofisi zote"}. Buruta upya baada ya kutuma ombi.`
                    : `Area: ${user?.ward || user?.assigned_district || user?.assigned_region || "All offices"}. Refresh after an application is submitted.`}
                </p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setView("application_review")}
                  className="px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">
                        {app.services?.name || app.service_name || (lang === "sw" ? "Huduma" : "Service")}
                      </p>
                      <p className="text-xs text-stone-400 font-medium">
                        {app.users?.first_name} {app.users?.last_name} • {app.application_number}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} lang={lang} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-stone-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UserCheck size={20} className="text-emerald-400" />
              {lang === "sw" ? "Njia za Mkato" : "Quick Access"}
            </h3>
            <div className="space-y-3 relative z-10">
              <button
                onClick={() => setView("customer_support")}
                className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <HelpCircle size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {lang === "sw" ? "Huduma kwa Wateja" : "Customer Support"}
                  </p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                    {lang === "sw" ? "Tafuta Maombi" : "Search Applications"}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setView("manual_verification")}
                className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <UserCheck size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {lang === "sw" ? "Uhakiki wa Raia" : "Citizen Verification"}
                  </p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                    {lang === "sw" ? "Thibitisha Raia" : "Verify Citizen"}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setView("business_approval")}
                className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3 relative"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                  <Building2 size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold">
                    {lang === "sw" ? "Idhini ya Biashara" : "Business Approval"}
                  </p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                    {lang === "sw" ? "Wauzaji, Mpangishaji, Dalali" : "Sellers, Landlords, Brokers"}
                  </p>
                </div>
                {stats.pendingBusiness > 0 && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                    {stats.pendingBusiness}
                  </span>
                )}
              </button>
              <button
                onClick={() => setView("verify_documents")}
                className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Search size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">
                    {lang === "sw" ? "Hakiki Hati" : "Verify Documents"}
                  </p>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">
                    {lang === "sw" ? "Thibitisha Uhalali" : "Verify Authenticity"}
                  </p>
                </div>
              </button>
            </div>
            <Building2 className="absolute -right-7.5 -bottom-7.5 h-48 w-48 text-white/5 rotate-12" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
