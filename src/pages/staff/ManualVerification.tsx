/** Staff identity verification for citizen, diaspora and foreigner user profiles. */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Search,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { supabase, type UserProfile } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { createNotification } from "@/lib/notifications";
import { getUserTier } from "@/lib/verification";
import { VerificationBadge } from "@/components/VerificationBadge";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { cn } from "@/lib/utils";

type Tab = "queue" | "search";
type ApplicantKind = "all" | "citizen" | "diaspora" | "foreigner";

export function ManualVerification() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { user: officer } = useAuth();
  const sw = lang === "sw";
  const L = useCallback((s: string, e: string) => (sw ? s : e), [sw]);

  const [tab, setTab] = useState<Tab>("queue");
  const [applicants, setApplicants] = useState<UserProfile[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [queueSearch, setQueueSearch] = useState("");
  const [applicantKind, setApplicantKind] = useState<ApplicantKind>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
  const [searching, setSearching] = useState(false);
  const [docType, setDocType] = useState("NIDA");
  const [docNumber, setDocNumber] = useState("");
  const [officerNotes, setOfficerNotes] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  const loadApplicants = useCallback(async () => {
    setLoadingApplicants(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id,email,first_name,middle_name,last_name,phone,role,is_verified,verification_level,is_diaspora,applicant_type,account_status,nationality,country_of_residence,region,district,ward,nida_number,citizen_id,passport_number,voter_id_number,driving_license_number,created_at",
        )
        .eq("role", "citizen")
        .eq("is_verified", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setApplicants((data || []) as UserProfile[]);
    } catch (error) {
      console.error("Could not load users for identity verification", error);
      showToast(L("Watumiaji hawakuweza kupakiwa", "Could not load users for verification"), "error");
    } finally {
      setLoadingApplicants(false);
    }
  }, [L, showToast]);

  useEffect(() => {
    void loadApplicants();
  }, [loadApplicants]);

  const filteredApplicants = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();
    return applicants.filter((applicant) => {
      const kind = applicant.applicant_type || (applicant.is_diaspora ? "diaspora" : "citizen");
      if (applicantKind !== "all" && kind !== applicantKind) return false;
      if (!query) return true;
      return [
        applicant.first_name,
        applicant.middle_name,
        applicant.last_name,
        applicant.email,
        applicant.phone,
        applicant.nida_number,
        applicant.passport_number,
        applicant.citizen_id,
        applicant.country_of_residence,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [applicants, applicantKind, queueSearch]);

  const selectApplicant = (applicant: UserProfile) => {
    setSearchResult(applicant);
    setUpgraded(false);
    setDocNumber("");
    setDocType(applicant.applicant_type === "citizen" && !applicant.is_diaspora ? "NIDA" : "PASSPORT");
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    if (!/^[\p{L}\p{N}@+._-]+$/u.test(q)) {
      showToast(L("Tumia namba au herufi halali", "Use letters, numbers, or a valid ID format"), "error");
      return;
    }

    setSearching(true);
    setSearchResult(null);
    setUpgraded(false);
    try {
      const normalized = q.replace(/-/g, "").toUpperCase();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "citizen")
        .or(
          `phone.eq.${q},phone.eq.+255${q.replace(/^0/, "")},nida_number.eq.${q},nida_number.eq.${normalized},citizen_id.eq.${q},email.eq.${q.toLowerCase()},passport_number.eq.${normalized},voter_id_number.eq.${normalized},driving_license_number.eq.${normalized}`,
        )
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        showToast(L("Mtumiaji hajapatikana. Jaribu taarifa nyingine.", "User not found. Try another identifier."), "error");
        return;
      }
      selectApplicant(data as UserProfile);
    } catch (error) {
      console.error("Identity lookup failed", error);
      showToast(L("Hitilafu ya utafutaji", "Search failed"), "error");
    } finally {
      setSearching(false);
    }
  };

  const handleVerifyUser = async () => {
    if (!searchResult || !docNumber.trim()) {
      showToast(L("Ingiza namba ya kitambulisho", "Enter the identity document number"), "error");
      return;
    }
    setUpgrading(true);
    try {
      const normalizedNumber = docNumber.trim().replace(/\s/g, "").toUpperCase();
      const updates: Record<string, unknown> = {
        is_verified: true,
        verification_level: docType === "NIDA" ? "NIDA_VERIFIED" : "PROFILE_COMPLETED",
        id_type: docType,
        id_number: normalizedNumber,
      };
      if (docType === "NIDA") updates.nida_number = normalizedNumber.replace(/-/g, "");
      else if (docType === "PASSPORT") updates.passport_number = normalizedNumber;
      else if (docType === "VOTER_ID") updates.voter_id_number = normalizedNumber;
      else if (docType === "DRIVING_LICENSE") updates.driving_license_number = normalizedNumber;

      const { data: saved, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", searchResult.id)
        .eq("role", "citizen")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!saved) throw new Error(L("Wasifu haukusasishwa", "User profile was not updated"));

      await createNotification({
        user_id: searchResult.id,
        title: L("Uthibitisho wa Utambulisho Umekamilika", "Identity Verification Complete"),
        message: L(
          "Utambulisho wako umethibitishwa na afisa. Hali hii inatumika kwa maombi yako yote.",
          "Your identity has been verified by staff. This status applies to all your applications.",
        ),
        type: "success",
      });

      await supabase.from("audit_logs").insert({
        user_id: officer?.id,
        action: "user_identity_verification",
        details: {
          verified_user_id: searchResult.id,
          applicant_type: searchResult.applicant_type || (searchResult.is_diaspora ? "diaspora" : "citizen"),
          document_type: docType,
          document_number: normalizedNumber,
          notes: officerNotes,
          officer_id: officer?.id,
          officer_name: `${officer?.first_name || ""} ${officer?.last_name || ""}`.trim(),
        },
      });

      const verifiedApplicant = { ...searchResult, ...updates } as UserProfile;
      setSearchResult(verifiedApplicant);
      setApplicants((current) => current.filter((applicant) => applicant.id !== verifiedApplicant.id));
      setUpgraded(true);
      setDocNumber("");
      showToast(L("Mtumiaji amethibitishwa kikamilifu!", "User identity verified!"), "success");
    } catch (error) {
      showToast((error as Error).message || L("Imeshindwa", "Verification failed"), "error");
    } finally {
      setUpgrading(false);
    }
  };

  const applicantKindLabel = (applicant: UserProfile) => {
    const kind = applicant.applicant_type || (applicant.is_diaspora ? "diaspora" : "citizen");
    if (kind === "foreigner") return L("Mgeni", "Foreigner");
    if (kind === "diaspora") return L("Diaspora", "Diaspora");
    return L("Raia", "Citizen");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900">
            {L("Uthibitisho wa Watumiaji", "User Identity Verification")}
          </h1>
          <p className="mt-0.5 text-xs text-stone-400">
            {L(
              "Thibitisha wasifu wa raia, diaspora na wageni mara moja kwa nyaraka zao za utambulisho.",
              "Verify citizen, diaspora and foreigner user profiles once using their identity documents.",
            )}
          </p>
        </div>
        <RefreshButton onRefresh={loadApplicants} lang={lang} />
      </div>

      <div className="flex gap-1 rounded-2xl bg-stone-100 p-1">
        {([
          ["queue", L("Watumiaji Wanaosubiri", "Users to Verify")],
          ["search", L("Tafuta Mtumiaji", "Find a User")],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all",
              tab === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700",
            )}
          >
            {value === "queue" ? <UserCheck size={15} /> : <Search size={15} />}
            {label}
            {value === "queue" && applicants.length > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                {applicants.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "queue" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder={L("Tafuta jina, simu, barua pepe, pasipoti...", "Search name, phone, email or passport...")}
                className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={applicantKind}
              onChange={(event) => setApplicantKind(event.target.value as ApplicantKind)}
              className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"
            >
              <option value="all">{L("Aina zote", "All applicant types")}</option>
              <option value="citizen">{L("Raia", "Citizens")}</option>
              <option value="diaspora">Diaspora</option>
              <option value="foreigner">{L("Wageni", "Foreigners")}</option>
            </select>
          </div>

          {loadingApplicants ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-stone-400" /></div>
          ) : filteredApplicants.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-400" />
              <p className="font-bold text-stone-700">{L("Hakuna watumiaji wanaosubiri uthibitisho", "No users are waiting for verification")}</p>
              <p className="mt-1 text-xs text-stone-400">{L("Tafuta mtumiaji kwa kitambulisho ikiwa hayupo kwenye orodha.", "Search for a user by ID if they are not listed here.")}</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredApplicants.map((applicant) => (
                <button
                  key={applicant.id}
                  onClick={() => selectApplicant(applicant)}
                  className={cn(
                    "rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md",
                    searchResult?.id === applicant.id ? "border-emerald-500 ring-2 ring-emerald-100" : "border-stone-200",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><User size={17} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-stone-900">{`${applicant.first_name} ${applicant.middle_name || ""} ${applicant.last_name}`.replace(/\s+/g, " ").trim()}</p>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{applicantKindLabel(applicant)}</span>
                      </div>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                        {applicant.phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{applicant.phone}</span>}
                        {applicant.country_of_residence && <span className="inline-flex items-center gap-1"><MapPin size={10} />{applicant.country_of_residence}</span>}
                        {applicant.email && <span className="truncate">{applicant.email}</span>}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-stone-500">{L("Tafuta kwa taarifa za mtumiaji", "Find a user by their details")}</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void handleSearch()}
                placeholder={L("Simu, barua pepe, CT ID, NIDA au pasipoti...", "Phone, email, CT ID, NIDA or passport...")}
                className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => void handleSearch()}
              disabled={searching || !searchQuery.trim()}
              className="flex h-11 items-center gap-1.5 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white transition hover:bg-black disabled:opacity-40"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {L("Tafuta", "Search")}
            </button>
          </div>
        </section>
      )}

      {searchResult && (
        <AnimatePresence>
          <motion.section
            key={searchResult.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          >
            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><User size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-stone-900">{`${searchResult.first_name || ""} ${searchResult.middle_name || ""} ${searchResult.last_name || ""}`.replace(/\s+/g, " ").trim()}</p>
                    <VerificationBadge tier={getUserTier(searchResult)} lang={lang} showDot />
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-stone-500 sm:grid-cols-2">
                    <span>{L("Aina", "Type")}: {applicantKindLabel(searchResult)}</span>
                    {searchResult.nationality && <span>{L("Uraia", "Nationality")}: {searchResult.nationality}</span>}
                    {searchResult.country_of_residence && <span>{L("Nchi ya makazi", "Country of residence")}: {searchResult.country_of_residence}</span>}
                    {searchResult.phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{searchResult.phone}</span>}
                    {searchResult.email && <span className="truncate">{searchResult.email}</span>}
                    {searchResult.region && <span className="inline-flex items-center gap-1"><MapPin size={10} />{searchResult.region}{searchResult.district ? `, ${searchResult.district}` : ""}</span>}
                    {searchResult.nida_number && <span className="inline-flex items-center gap-1"><Shield size={10} />NIDA: {searchResult.nida_number}</span>}
                    {searchResult.passport_number && <span>Passport: {searchResult.passport_number}</span>}
                    {searchResult.citizen_id && <span>CT ID: {searchResult.citizen_id}</span>}
                  </div>
                </div>
              </div>

              {upgraded || searchResult.is_verified === true ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <ShieldCheck size={20} className="shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-black text-emerald-800">{L("Utambulisho umethibitishwa ✓", "Identity verified ✓")}</p>
                    <p className="mt-0.5 text-xs text-emerald-700">{L("Hali hii inatumika kwa maombi yote ya mtumiaji.", "This status applies to all applications from this user.")}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 border-t border-stone-100 pt-4">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-500">{L("Thibitisha utambulisho wa mtumiaji", "Verify this user's identity")}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-stone-500">
                      {L("Aina ya hati", "Document type")}
                      <select value={docType} onChange={(event) => setDocType(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-normal normal-case tracking-normal text-stone-800">
                        <option value="NIDA">NIDA</option>
                        <option value="PASSPORT">{L("Pasipoti", "Passport")}</option>
                        <option value="VOTER_ID">{L("Kadi ya kura", "Voter ID")}</option>
                        <option value="DRIVING_LICENSE">{L("Leseni ya udereva", "Driving licence")}</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-black uppercase tracking-widest text-stone-500">
                      {L("Namba ya hati", "Document number")}
                      <input value={docNumber} onChange={(event) => setDocNumber(event.target.value)} placeholder={docType === "NIDA" ? "XXXX-XXXXX-XXXXX-XX" : ""} className="mt-1.5 h-10 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-normal normal-case tracking-normal text-stone-800" />
                    </label>
                  </div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-stone-500">
                    {L("Maelezo ya afisa (hiari)", "Officer notes (optional)")}
                    <textarea value={officerNotes} onChange={(event) => setOfficerNotes(event.target.value)} rows={2} className="mt-1.5 w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-800" />
                  </label>
                  <button onClick={() => void handleVerifyUser()} disabled={upgrading || !docNumber.trim()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40">
                    {upgrading ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                    {L("Thibitisha mtumiaji", "Verify user")}
                  </button>
                </div>
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      )}
    </div>
  );
}

export default ManualVerification;
