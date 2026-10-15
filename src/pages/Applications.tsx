/**
 * Applications.tsx — Citizen application tracker (V4)
 *
 * Layout: Clean card list with distinct status zones,
 * prominent action areas, and a polished detail drawer.
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  RefreshCw,
  X,
  FileText,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Share2,
  Download,
  Lock,
  ChevronDown,
  MessageSquare,
  Image,
  ExternalLink,
  Inbox,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { ApplicationChat } from "../components/ApplicationChat";
import { StatusTimeline } from "../components/StatusTimeline";
import { useToast } from "../context/ToastContext";
import { supabase, Application } from "../lib/supabase";
import type { ApplicationDraft } from "../types";
import { formatCurrency, getCurrencyForUser } from "../lib/currency";
import { DocumentRenderer, DocumentPreview } from "../components/DocumentRenderer";
import { cn } from "@/lib/utils";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { RisitiMalipoPDF } from "@/components/documents/RisitiMalipoPDF";
import { DisputeAcknowledgementPDF } from "@/components/documents/DisputeAcknowledgementPDF";
import { getApplicationAmount } from "@/lib/serviceFees";

interface ApplicationsProps {
  applications: Application[];
  drafts?: ApplicationDraft[];
  onPay: (app: Application) => void;
  onRefresh?: () => void;
  onResumeDraft?: (draft: ApplicationDraft) => void;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { bar: string; dot: string; label_sw: string; label_en: string }
> = {
  submitted: {
    bar: "bg-red-500",
    dot: "bg-red-500",
    label_sw: "Imetumwa",
    label_en: "Submitted",
  },
  pending_review: {
    bar: "bg-violet-500",
    dot: "bg-violet-500",
    label_sw: "Inakaguliwa",
    label_en: "Under Review",
  },
  pending_payment: {
    bar: "bg-amber-400",
    dot: "bg-amber-400",
    label_sw: "Inasubiri Malipo",
    label_en: "Pending Payment",
  },
  approved: {
    bar: "bg-amber-400",
    dot: "bg-amber-400",
    label_sw: "Imeidhinishwa",
    label_en: "Approved",
  },
  paid: { bar: "bg-emerald-500", dot: "bg-emerald-500", label_sw: "Imelipwa", label_en: "Paid" },
  verified: {
    bar: "bg-teal-500",
    dot: "bg-teal-500",
    label_sw: "Imethibitishwa",
    label_en: "Verified",
  },
  issued: {
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    label_sw: "Imetolewa",
    label_en: "Issued",
  },
  rejected: { bar: "bg-red-500", dot: "bg-red-500", label_sw: "Imekataliwa", label_en: "Rejected" },
  refunded: {
    bar: "bg-stone-400",
    dot: "bg-stone-400",
    label_sw: "Imerejeshwa",
    label_en: "Refunded",
  },
};

const getStatus = (status: string, sw: boolean) => {
  const cfg = STATUS_CONFIG[status] ?? {
    bar: "bg-stone-300",
    dot: "bg-stone-300",
    label_sw: status,
    label_en: status,
  };
  return { ...cfg, label: sw ? cfg.label_sw : cfg.label_en };
};

export function Applications({
  applications,
  drafts = [],
  onPay,
  onRefresh,
  onResumeDraft,
}: ApplicationsProps) {
  const PDFLink = PDFDownloadLink as unknown as React.ComponentType<{
    document: React.ReactElement;
    fileName: string;
    children: (p: { loading: boolean; error: Error | null }) => React.ReactNode;
  }>;

  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const currency = getCurrencyForUser(user?.is_diaspora, user?.country_of_residence);
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [detailsById, setDetailsById] = useState<Record<string, Application>>({});
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const detailRequests = useRef(new Set<string>());
  const [showDocModal, setShowDocModal] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "messages" | "docs">("timeline");
  const [countdownNow, setCountdownNow] = useState(Date.now());

  const hasPendingPaymentVerification = applications.some(
    (app) =>
      app.status === "paid" &&
      !!(app.payment_data?.auto_verify_at || app.payment_data?.auto_issue_at) &&
      !app.payment_data?.payment_verified_at,
  );
  useEffect(() => {
    if (!hasPendingPaymentVerification) return;
    const timer = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasPendingPaymentVerification]);

  const getFee = useCallback((app: Application) => {
    if (app.service_name === "Kibari cha Sherehe" || app.service_name === "Kibali cha Sherehe") {
      return getApplicationAmount(app);
    }
    const f = app.services?.fee || 0;
    const ff = app.form_data?.service_fee;
    let base =
      f > 0 ? f : typeof ff === "number" ? ff : typeof ff === "string" ? parseFloat(ff) || 0 : 0;
    const extra = app.services?.extra_address_fee || 0;
    const n =
      parseInt(String((app.form_data as Record<string, unknown>)?.num_extra_addresses ?? "0")) || 0;
    if (extra > 0 && n > 0) base += n * extra;
    return base;
  }, []);

  const paymentRecorded = useCallback(
    (app: Application) =>
      !!(
        ["paid", "verified", "issued"].includes(app.status) ||
        app.paid_at ||
        (app.form_data as Record<string, unknown>)?.payment_data ||
        (app.payment_data as unknown as Record<string, unknown>)?.transaction_id
      ),
    [],
  );

  const hasPaid = useCallback(
    (app: Application) => paymentRecorded(app) || getFee(app) === 0,
    [getFee, paymentRecorded],
  );

  const getPhotos = (app: Application) => {
    const docs = (app.form_data as Record<string, unknown>)?.uploaded_documents as
      | { type: string; name: string; dataUrl: string }[]
      | undefined;
    return docs?.filter((d) => d.dataUrl?.startsWith("data:image")) ?? [];
  };

  const loadApplicationDetails = useCallback(
    async (appId: string) => {
      if (detailsById[appId] || detailRequests.current.has(appId)) return;
      detailRequests.current.add(appId);
      setLoadingDetailsId(appId);
      try {
        const { data, error } = await supabase
          .from("applications")
          .select(
            "*, users:user_id(first_name, middle_name, last_name, citizen_id, nida_number, phone, region, district, ward, photo_url)",
          )
          .eq("id", appId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const application = data as unknown as Application;
          const formData = (application.form_data || {}) as Record<string, unknown>;
          if (user?.photo_url && !formData.photo_url) formData.photo_url = user.photo_url;
          setDetailsById((previous) => ({ ...previous, [appId]: { ...application, form_data: formData } }));
        }
      } catch (error) {
        console.error("Error loading application details:", error);
        showToast(L("Maelezo hayajapakiwa", "Application details could not be loaded"), "error");
      } finally {
        detailRequests.current.delete(appId);
        setLoadingDetailsId((current) => (current === appId ? null : current));
      }
    },
    [detailsById, user?.photo_url, showToast, lang],
  );

  const doRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const acceptAgreement = async (app: Application) => {
    if (!user) return;
    setProcessingId(app.id);
    try {
      const fd = (app.form_data || {}) as Record<string, unknown>;
      const isBuyer =
        app.service_name?.includes("Mauzo") && String(fd.buyer_nida ?? "") === user.nida_number;
      const isTenant =
        app.service_name?.includes("Pango") && String(fd.tenant_nida ?? "") === user.nida_number;
      const patch: Record<string, unknown> = {};
      if (isBuyer) patch.buyer_accepted = true;
      if (isTenant) patch.tenant_accepted = true;
      if (!Object.keys(patch).length) {
        showToast(L("Si mwanachama wa mkataba huu", "Not party to this agreement"), "error");
        return;
      }
      await supabase.from("applications").update(patch).eq("id", app.id);
      showToast(L("Umekubali mkataba", "Agreement accepted"), "success");
      onRefresh?.();
    } catch {
      showToast(L("Imeshindwa", "Failed"), "error");
    } finally {
      setProcessingId(null);
    }
  };

  const list = useMemo(() => {
    return applications
      .filter((a) => {
        const name = sw
          ? a.service_name || a.services?.name || ""
          : a.services?.name_en || a.service_name || a.services?.name || "";
        return (
          (name.toLowerCase().includes(search.toLowerCase()) ||
            a.application_number.toLowerCase().includes(search.toLowerCase())) &&
          (filter === "all" || a.status === filter)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [applications, search, filter, sw]);

  // Stats for summary bar
  const stats = useMemo(
    () => ({
      total: applications.length,
      active: applications.filter((a) =>
        ["submitted", "pending_review", "approved", "pending_payment", "paid", "verified"].includes(a.status),
      ).length,
      issued: applications.filter((a) => a.status === "issued").length,
      needsAction: applications.filter(
        (a) =>
          ["approved", "pending_payment"].includes(a.status) && getFee(a) > 0 && !hasPaid(a),
      ).length,
    }),
    [applications, getFee, hasPaid],
  );

  return (
    <div className="space-y-4 pb-8">
      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightboxImg(null)}
          >
            <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
              <X size={20} />
            </button>
            <img
              src={lightboxImg}
              className="max-w-full max-h-[88vh] rounded-2xl object-contain shadow-2xl"
              alt="Document"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Doc preview modal ─────────────────────────────────────────────── */}
      {showDocModal && selected && (
        <DocumentPreview
          application={selected}
          lang={lang}
          onClose={() => setShowDocModal(false)}
        />
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            {L("Maombi Yangu", "My Applications")}
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {L("Fuatilia hali ya maombi yako yote", "Track the status of all your applications")}
          </p>
        </div>
        <button
          onClick={doRefresh}
          disabled={refreshing}
          className="w-9 h-9 border border-stone-200 bg-white rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-all shadow-sm shrink-0"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border border-stone-200 rounded-2xl p-3 text-center shadow-sm">
            <div className="text-2xl font-black text-stone-800">{stats.total}</div>
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mt-0.5">
              {L("Maombi Yote", "Total")}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-3 text-center shadow-sm">
            <div className="text-2xl font-black text-blue-600">{stats.active}</div>
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mt-0.5">
              {L("Yanayoendelea", "Active")}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-3 text-center shadow-sm">
            <div className="text-2xl font-black text-emerald-600">{stats.issued}</div>
            <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider mt-0.5">
              {L("Zilizotolewa", "Issued")}
            </div>
          </div>
        </div>
      )}

      {/* ── Needs action banner ───────────────────────────────────────────── */}
      {stats.needsAction > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-900 text-sm">
              {stats.needsAction === 1
                ? L("Ombi 1 linasubiri malipo yako", "1 application awaiting your payment")
                : L(
                    `Maombi ${stats.needsAction} yanasubiri malipo`,
                    `${stats.needsAction} applications awaiting payment`,
                  )}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {L("Bonyeza ombi lolote hapo chini kulipa", "Tap any application below to pay")}
            </p>
          </div>
        </div>
      )}

      {/* ── Tab bar (Applications / Drafts) ─────────────────────────────── */}
      {drafts.length > 0 && (
        <div className="flex bg-stone-100 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setShowDrafts(false)}
            className={cn(
              "flex-1 h-9 rounded-xl text-sm font-bold transition-all",
              !showDrafts
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700",
            )}
          >
            {L("Maombi", "Applications")} ({list.length})
          </button>
          <button
            onClick={() => setShowDrafts(true)}
            className={cn(
              "flex-1 h-9 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5",
              showDrafts
                ? "bg-white text-amber-700 shadow-sm"
                : "text-stone-500 hover:text-stone-700",
            )}
          >
            <AlertCircle size={13} />
            {L("Hayakukamilika", "Drafts")} ({drafts.length})
          </button>
        </div>
      )}

      {/* ── Search + Filter ───────────────────────────────────────────────── */}
      {!showDrafts && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={L(
                "Tafuta huduma au namba ya ombi...",
                "Search service or application number...",
              )}
              className="w-full h-11 pl-10 pr-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-11 pl-9 pr-4 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">{L("Zote", "All")}</option>
              <option value="submitted">{L("Imetumwa", "Submitted")}</option>
              <option value="approved">{L("Imeidhinishwa", "Approved")}</option>
              <option value="pending_payment">{L("Inasubiri Malipo", "Pending Payment")}</option>
              <option value="paid">{L("Imelipwa", "Paid")}</option>
              <option value="issued">{L("Imetolewa", "Issued")}</option>
              <option value="rejected">{L("Imekataliwa", "Rejected")}</option>
            </select>
          </div>
        </div>
      )}

      {/* ── DRAFTS VIEW ───────────────────────────────────────────────────── */}
      {showDrafts && (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm"
            >
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={18} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-800 text-sm truncate">{d.service_name}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {L("Ilihifadhiwa", "Saved")}{" "}
                  {new Date(d.updated_at || d.created_at || d.saved_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => onResumeDraft?.(d)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <ExternalLink size={12} /> {L("Endelea", "Continue")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── APPLICATIONS LIST ─────────────────────────────────────────────── */}
      {!showDrafts && (
        <div className="space-y-3">
          {/* Empty state */}
          {list.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Inbox size={28} className="text-stone-400" />
              </div>
              <p className="font-bold text-stone-600 text-base">
                {search || filter !== "all"
                  ? L("Hakuna maombi yanayolingana", "No matching applications")
                  : L("Bado hujafanya maombi yoyote", "You have no applications yet")}
              </p>
              <p className="text-sm text-stone-400 mt-1">
                {search || filter !== "all"
                  ? L("Jaribu kutafuta kwa maneno tofauti", "Try different search terms")
                  : L(
                      "Anza ombi lako la kwanza kutoka kwa Huduma",
                      "Start your first application from Services",
                    )}
              </p>
            </div>
          )}

          {list.map((summaryApp, i) => {
            const details = detailsById[summaryApp.id];
            const app = details
              ? {
                  ...details,
                  ...summaryApp,
                  users: details.users || summaryApp.users,
                  form_data: details.form_data,
                }
              : summaryApp;
            const formData = (app.form_data || {}) as Record<string, unknown>;
            const isDisputeAcknowledgement =
              app.service_name?.toLowerCase().includes("mgogoro") &&
              formData.mode === "CITIZEN_DISPUTE";
            const name = sw
              ? app.service_name || app.services?.name || "—"
              : app.services?.name_en || app.service_name || app.services?.name || "—";
            const fee = getFee(app);
            const paid = hasPaid(app);
            const isOpen = selected?.id === app.id;
            const photos = getPhotos(app);
            const status = getStatus(app.status, sw);
            const needsPayment = fee > 0 && !paid && !["rejected", "refunded"].includes(app.status);
            const paymentState = paid
              ? "paid"
              : ["pending_payment", "approved"].includes(app.status)
                ? "pending"
                : fee > 0
                  ? "unpaid"
                  : "none";
            const paymentColors =
              paymentState === "paid"
                ? {
                    bar: "bg-emerald-500",
                    soft: "bg-emerald-50",
                    icon: "text-emerald-600",
                    badge: "bg-emerald-100 text-emerald-700",
                    button: "bg-emerald-600 hover:bg-emerald-700",
                    panel: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200",
                    lockBg: "bg-emerald-100",
                  }
                : paymentState === "pending"
                  ? {
                      bar: "bg-yellow-400",
                      soft: "bg-yellow-50",
                      icon: "text-yellow-600",
                      badge: "bg-yellow-100 text-yellow-800",
                      button: "bg-yellow-500 hover:bg-yellow-600",
                      panel: "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200",
                      lockBg: "bg-yellow-100",
                    }
                  : {
                      bar: "bg-red-500",
                      soft: "bg-red-50",
                      icon: "text-red-600",
                      badge: "bg-red-100 text-red-700",
                      button: "bg-red-600 hover:bg-red-700",
                      panel: "bg-gradient-to-br from-red-50 to-rose-50 border-red-200",
                      lockBg: "bg-red-100",
                    };
            const isIssued =
              app.status === "issued";
            const autoVerifyAt = app.payment_data?.auto_verify_at || app.payment_data?.auto_issue_at;
            const autoIssueAt = autoVerifyAt
              ? Date.parse(autoVerifyAt)
              : null;
            const autoVerifying = app.status === "paid" && autoIssueAt !== null && !app.payment_data?.payment_verified_at;
            const verificationSeconds = autoVerifying && autoIssueAt !== null
              ? Math.ceil(Math.max(0, autoIssueAt - countdownNow) / 1000)
              : 0;
            const issueElapsed = autoVerifying && autoIssueAt !== null
              ? Math.min(45_000, Math.max(0, 45_000 - (autoIssueAt - countdownNow)))
              : 0;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.01, 0.15), duration: 0.2 }}
                className={cn(
                  "bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-200",
                  isOpen
                    ? "border-emerald-400 ring-2 ring-emerald-100 shadow-md"
                    : "border-stone-200 hover:border-stone-300 hover:shadow-md",
                )}
              >
                {/* ── Top colour bar ── */}
                <div
                  className={cn(
                    "h-1.5",
                    paymentState === "none" ? status.bar : paymentColors.bar,
                    app.status === "rejected" && "bg-red-500",
                  )}
                />

                {/* ── Card header ── */}
                <button
                  className="w-full text-left px-4 pt-3.5 pb-3"
                  onClick={() => {
                    setSelected(isOpen ? null : app);
                    setActiveTab("timeline");
                    if (!isOpen) void loadApplicationDetails(app.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Status dot + icon */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                        isIssued ? "bg-emerald-50" : needsPayment ? paymentColors.soft : "bg-stone-50",
                      )}
                    >
                      {isIssued ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : needsPayment ? (
                        <CreditCard size={18} className={paymentColors.icon} />
                      ) : (
                        <FileText size={18} className="text-stone-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Service name + status badge */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-stone-900 text-sm leading-tight truncate pr-1">
                          {name}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                            app.status === "issued"
                              ? "bg-emerald-100 text-emerald-700"
                              : app.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : needsPayment
                                  ? paymentColors.badge
                                  : paymentState === "paid"
                                    ? paymentColors.badge
                                    : paymentState === "pending"
                                      ? paymentColors.badge
                                  : "bg-stone-100 text-stone-600",
                          )}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-stone-400 font-mono tracking-tight">
                          {app.application_number}
                        </span>
                        <span className="text-[11px] text-stone-400 flex items-center gap-1">
                          <Clock size={9} />
                          {new Date(app.created_at).toLocaleDateString(sw ? "sw-TZ" : "en-TZ", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {fee > 0 && (
                          <span
                            className={cn(
                              "text-[11px] font-bold flex items-center gap-1",
                              paid ? "text-emerald-600" : paymentState === "pending" ? "text-yellow-700" : "text-red-600",
                            )}
                          >
                            {paid ? <CheckCircle2 size={9} /> : <Lock size={9} />}
                            {paid ? L("Imelipwa", "Paid") : formatCurrency(fee, currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand chevron */}
                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-stone-400 shrink-0 transition-transform duration-200 mt-1",
                        isOpen && "rotate-180",
                      )}
                    />
                  </div>
                </button>

                {/* ── Quick Pay CTA (visible without opening) ── */}
                {needsPayment && !isOpen && (
                  <div className="px-4 pb-3.5">
                    <button
                      onClick={() => {
                        onPay(app);
                      }}
                      className={cn(
                        "w-full h-10 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm",
                        paymentColors.button,
                      )}
                    >
                      <CreditCard size={15} /> {L("Lipa", "Pay")} {formatCurrency(fee, currency)}
                    </button>
                  </div>
                )}

                {/* ── Issued quick download (visible without opening) ── */}
                {isIssued && !isOpen && (
                  <div className="px-4 pb-3.5">
                    <div className="flex gap-2">
                      {details || Object.keys(formData).length > 0 ? (
                        <DocumentRenderer application={app} lang={lang} />
                      ) : (
                        <button
                          onClick={() => void loadApplicationDetails(app.id)}
                          disabled={loadingDetailsId === app.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                        >
                          {loadingDetailsId === app.id
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <Download size={12} />}
                          {L("Andaa hati iliyosasishwa", "Prepare updated document")}
                        </button>
                      )}
                      <PDFLink
                        document={<RisitiMalipoPDF application={app} lang={lang} />}
                        fileName={`Risiti_${app.application_number}.pdf`}
                      >
                        {({ loading }) => (
                          <button
                            disabled={loading}
                            className="h-9 px-3 flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {loading ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Download size={12} />
                            )}
                            {L("Risiti", "Receipt")}
                          </button>
                        )}
                      </PDFLink>
                    </div>
                  </div>
                )}

                {/* ── DETAIL DRAWER ─────────────────────────────────────── */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden border-t border-stone-100"
                    >
                      <div className="p-4 space-y-4">
                        {loadingDetailsId === app.id && (
                          <div className="text-xs text-stone-500 flex items-center gap-2">
                            <RefreshCw size={13} className="animate-spin" />
                            {L("Inapakia maelezo...", "Loading application details...")}
                          </div>
                        )}
                        {/* ── Staff feedback ── */}
                        {app.feedback && (
                          <div
                            className={cn(
                              "rounded-xl p-3.5 border text-sm",
                              app.status === "rejected"
                                ? "bg-red-50 border-red-200"
                                : "bg-amber-50 border-amber-200",
                            )}
                          >
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1.5">
                              {L("Maoni ya Afisa", "Officer Feedback")}
                            </p>
                            <p
                              className={cn(
                                "text-sm font-medium leading-relaxed",
                                app.status === "rejected" ? "text-red-800" : "text-amber-800",
                              )}
                            >
                              {app.feedback}
                            </p>
                          </div>
                        )}

                        {/* ── Payment gate (expanded) ── */}
                        {needsPayment && (
                          <div className={cn("border rounded-2xl p-5", paymentColors.panel)}>
                            <div className="flex items-center gap-3 mb-3">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", paymentColors.lockBg)}>
                                <Lock size={18} className={paymentColors.icon} />
                              </div>
                              <div>
                                <p className="font-black text-amber-900 text-sm">
                                  {L("Hati Imefungwa", "Document Locked")}
                                </p>
                                <p className="text-xs text-amber-700">
                                  {L(
                                    "Lipa ili kupakua hati yako rasmi",
                                    "Pay to download your official document",
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between bg-white/70 rounded-xl px-4 py-3 mb-3 border border-amber-100">
                              <span className="text-sm text-amber-700 font-medium">
                                {L("Ada ya Huduma", "Service Fee")}
                              </span>
                              <span className="text-xl font-black text-amber-800">
                                {formatCurrency(fee, currency)}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                onPay(app);
                                setSelected(null);
                              }}
                              className={cn(
                                "w-full h-12 active:scale-[0.98] text-white rounded-xl font-black text-base transition-all shadow-lg flex items-center justify-center gap-2",
                                paymentColors.button,
                              )}
                            >
                              <CreditCard size={18} /> {L("Lipia Sasa", "Pay Now")}
                            </button>
                          </div>
                        )}

                        {paymentRecorded(app) && !isIssued && (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                            <div>
                              <p className="text-sm font-black text-emerald-800">
                                {L("Malipo yamepokelewa", "Payment received")}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                                {isDisputeAcknowledgement
                                  ? L(
                                      "Ombi lako limepokelewa. Pakua uthibitisho wa kufungua mgogoro hapa chini. Ripoti rasmi ya shauri itapatikana baada ya ofisi kukamilisha uhakiki na kuitoa.",
                                      "Your dispute application has been received. Download the filing acknowledgement below. The official case report will be available after the office completes its review and issues it.",
                                    )
                                  : L(
                                      autoVerifying
                                        ? `Malipo yamepokelewa. Uthibitishaji wa kiotomatiki baada ya sekunde ${verificationSeconds}.`
                                        : app.payment_data?.payment_verified_at
                                          ? "Malipo yamethibitishwa. Mfanyakazi wa ofisi atakagua na kutoa hati yako; utaweza kuipakua hapa baada ya kutolewa."
                                          : "Hati yako inasubiri kuhakikiwa na kutolewa na ofisi. Itapakuliwa hapa hali ikibadilika kuwa ‘Imetolewa’.",
                                      autoVerifying
                                        ? `Payment received. Automatic verification in ${verificationSeconds} seconds, then your document will be ready to download.`
                                        : app.payment_data?.payment_verified_at
                                          ? "Payment verified. Staff will review and issue your document; download it here once issued."
                                          : "Your certificate or letter is awaiting staff review and issue. It will be available here when the status changes to ‘Issued’.",
                                    )}
                              </p>
                            </div>
                            {autoVerifying && (
                              <div className="space-y-1.5" aria-live="polite">
                                <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                                  <motion.div
                                    key={`${app.id}-${autoIssueAt}`}
                                    initial={{ width: `${(issueElapsed / 45_000) * 100}%` }}
                                    animate={{ width: `${(issueElapsed / 45_000) * 100}%` }}
                                    transition={{ duration: 0.2, ease: "linear" }}
                                    className="h-full rounded-full bg-emerald-500"
                                  />
                                </div>
                                <p className="text-[11px] font-semibold text-emerald-700">
                                  {L("Malipo yanathibitishwa kiotomatiki…", "Automatically verifying payment…")}
                                </p>
                              </div>
                            )}
                            {isDisputeAcknowledgement && (
                              <PDFLink
                                document={
                                  <DisputeAcknowledgementPDF
                                    application={app}
                                    lang={sw ? "sw" : "en"}
                                  />
                                }
                                fileName={`dispute-acknowledgement-${app.application_number}.pdf`}
                              >
                                {({ loading }) => (
                                  <button
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                                  >
                                    {loading ? (
                                      <RefreshCw size={13} className="animate-spin" />
                                    ) : (
                                      <Download size={13} />
                                    )}
                                    {L("Pakua uthibitisho wa ombi", "Download dispute acknowledgement")}
                                  </button>
                                )}
                              </PDFLink>
                            )}
                            <PDFLink
                              document={<RisitiMalipoPDF application={app} lang={lang} />}
                              fileName={`Risiti_${app.application_number}.pdf`}
                            >
                              {({ loading }) => (
                                <button
                                  disabled={loading}
                                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  {loading ? (
                                    <RefreshCw size={13} className="animate-spin" />
                                  ) : (
                                    <Download size={13} />
                                  )}
                                  {L("Pakua risiti ya malipo", "Download payment receipt")}
                                </button>
                              )}
                            </PDFLink>
                          </div>
                        )}

                        {/* ── Document downloads (issued) ── */}
                        {isIssued && (
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles size={14} className="text-emerald-600" />
                              <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">
                                {app.payment_data?.payment_verified_at
                                  ? L("Malipo Yamehakikiwa · Pakua Hati", "Payment Verified · Download Document")
                                  : L("Hati Rasmi Yako Iko Tayari", "Your Official Document is Ready")}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <DocumentRenderer application={app} lang={lang} />
                              <PDFLink
                                document={<RisitiMalipoPDF application={app} lang={lang} />}
                                fileName={`Risiti_${app.application_number}.pdf`}
                              >
                                {({ loading }) => (
                                  <button
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
                                  >
                                    {loading ? (
                                      <RefreshCw size={13} className="animate-spin" />
                                    ) : (
                                      <Download size={13} />
                                    )}
                                    {L("Risiti", "Receipt")}
                                  </button>
                                )}
                              </PDFLink>
                              <button
                                onClick={async () => {
                                  try {
                                    if (navigator.share)
                                      await navigator.share({
                                        title: name,
                                        url: window.location.href,
                                      });
                                    else {
                                      await navigator.clipboard.writeText(window.location.href);
                                      showToast(L("Kiungo kimekopwa!", "Link copied!"), "success");
                                    }
                                  } catch {
                                    /* noop */
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold transition-all shadow-sm"
                              >
                                <Share2 size={13} /> {L("Shiriki", "Share")}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ── Agreement accept ── */}
                        {(app.service_name?.includes("Mauzo") ||
                          app.service_name?.includes("Pango")) &&
                          !["rejected", "refunded"].includes(app.status) && (
                            <div
                              className={cn(
                                "rounded-xl p-3.5 border flex items-center justify-between gap-3",
                                app.agreement_status === "buyer_accepted"
                                  ? "bg-emerald-50 border-emerald-200"
                                  : "bg-blue-50 border-blue-200",
                              )}
                            >
                              <p
                                className={cn(
                                  "text-xs font-medium flex-1",
                                  app.agreement_status === "buyer_accepted"
                                    ? "text-emerald-700"
                                    : "text-blue-700",
                                )}
                              >
                                {app.agreement_status === "buyer_accepted"
                                  ? L(
                                      "✅ Mkataba umekubaliwa na pande zote",
                                      "✅ Agreement accepted by all parties",
                                    )
                                  : L(
                                      "Mkataba unasubiri kukubaliwa na upande wa pili",
                                      "Agreement awaiting counterparty acceptance",
                                    )}
                              </p>
                              {app.agreement_status === "pending" && (
                                <button
                                  onClick={() => acceptAgreement(app)}
                                  disabled={processingId === app.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                                >
                                  {processingId === app.id ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={11} />
                                  )}
                                  {L("Kubali", "Accept")}
                                </button>
                              )}
                            </div>
                          )}

                        {/* ── Inner tab bar ── */}
                        <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
                          {[
                            { id: "timeline", label: L("Hali", "Status"), icon: CheckCircle2 },
                            { id: "messages", label: L("Ujumbe", "Messages"), icon: MessageSquare },
                            ...(photos.length > 0
                              ? [{ id: "docs", label: L("Picha", "Photos"), icon: Image }]
                              : []),
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() =>
                                setActiveTab(tab.id as "timeline" | "messages" | "docs")
                              }
                              className={cn(
                                "flex-1 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                                activeTab === tab.id
                                  ? "bg-white text-stone-800 shadow-sm"
                                  : "text-stone-500 hover:text-stone-700",
                              )}
                            >
                              <tab.icon size={11} /> {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* ── Tab content ── */}
                        {activeTab === "timeline" && (
                          <StatusTimeline
                            status={app.status}
                            lang={lang}
                            serviceName={app.service_name}
                            isPaid={paymentRecorded(app)}
                          />
                        )}

                        {activeTab === "messages" && (
                          <ApplicationChat
                            applicationId={app.id}
                            applicationNumber={app.application_number}
                            applicantId={app.user_id || user?.id || ""}
                            lang={lang}
                          />
                        )}

                        {activeTab === "docs" && photos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {photos.map((p, idx) => (
                              <button
                                key={idx}
                                onClick={() => setLightboxImg(p.dataUrl)}
                                className="group relative aspect-square rounded-xl overflow-hidden border border-stone-200 hover:border-emerald-400 transition-all"
                              >
                                <img
                                  src={p.dataUrl}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                                  <Search
                                    size={16}
                                    className="text-white opacity-0 group-hover:opacity-100 transition-all"
                                  />
                                </div>
                                <p className="absolute bottom-0 left-0 right-0 text-[9px] text-white bg-black/50 px-1.5 py-1 text-center truncate">
                                  {p.type}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Applications;
