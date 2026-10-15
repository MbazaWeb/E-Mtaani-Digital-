/**
 * Services Catalog (Simplified)
 * Only services in CITIZEN_VISIBLE_SERVICES are exposed.
 * Fees depend on the applicant type (citizen / diaspora / foreigner).
 */
import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Wallet, Zap, Clock, Calculator } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { CITIZEN_VISIBLE_SERVICES } from "@/constants/services";
import { Service } from "@/lib/supabase";
import { formatInCurrency, getCurrencyForUser } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";
import { getUserTier } from "@/lib/verification";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useRouterView } from "@/components/layout/AppShell";
import {
  computeFee,
  splitFee,
  SERVICE_NAMES,
  getApplicantType,
  type ApplicantType,
} from "@/constants/serviceFees";
import { cn } from "@/lib/utils";

interface ServicesProps {
  onSelectService: (service: Service) => void;
  onRefresh?: () => void;
}

const SERVICE_META: Record<string, { icon: string }> = {
  [SERVICE_NAMES.BURIAL]: { icon: "\uD83D\uDD4A" },
  [SERVICE_NAMES.CELEBRATION]: { icon: "\uD83C\uDF89" },
  [SERVICE_NAMES.INTRO_LETTER]: { icon: "\uD83D\uDCDD" },
  [SERVICE_NAMES.DISPUTE]: { icon: "\u2696" },
};

export function Services({ onSelectService }: ServicesProps) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { setView } = useRouterView();
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);
  const tier = getUserTier(user);

  // Determine applicant type from user profile (falls back to citizen)
  const applicantType = getApplicantType(user);
  const displayCurrency = getCurrencyForUser(user?.is_diaspora, user?.country_of_residence);
  const feeCurrency = displayCurrency === "USD" ? "USD" : "TZS";

  const applicantLabel: Record<ApplicantType, { sw: string; en: string }> = {
    citizen: { sw: "Raia wa Tanzania", en: "Tanzania Resident" },
    diaspora: { sw: "Watanzania Nje", en: "Diaspora" },
    foreigner: { sw: "Mgeni", en: "Foreigner" },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900">
          {L("Huduma Zinazopatikana", "Available Services")}
        </h2>
        <p className="text-sm text-stone-500 font-medium mt-0.5">
          {L("Chagua huduma unayoihitaji na ufanye maombi.", "Choose the service you need and apply.")}
        </p>
      </div>

      <div className="rounded-xl px-3 py-2 bg-stone-100 border border-stone-200 flex items-center gap-2 text-xs">
        <span className="font-bold text-stone-500 uppercase tracking-widest">
          {L("Aina yako", "Your type")}:
        </span>
        <span className="font-black text-stone-900">
          {L(applicantLabel[applicantType].sw, applicantLabel[applicantType].en)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setView("applications")}
          className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3 hover:border-stone-400 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-stone-900">{L("Maombi Yangu", "My Applications")}</p>
            <p className="text-[10px] text-stone-400 font-medium truncate">
              {L("Fuatilia maombi yako", "Track your applications")}
            </p>
          </div>
        </button>
        <button
          onClick={() => setView("my_payments")}
          className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3 hover:border-stone-400 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-stone-900">{L("Malipo Yangu", "My Payments")}</p>
            <p className="text-[10px] text-stone-400 font-medium truncate">
              {L("Historia na stakabadhi", "History & receipts")}
            </p>
          </div>
        </button>
      </div>

      {tier !== "NIDA_VERIFIED" ? (
        <div className="rounded-xl p-3.5 flex items-start gap-3 border bg-stone-50 border-stone-200">
          <Clock size={16} className="shrink-0 mt-0.5 text-stone-500" />
          <div className="flex-1">
            <p className="font-bold text-sm text-stone-800">
              {L("Huduma zote zinapatikana", "All services are available")}
            </p>
            <p className="text-xs mt-0.5 text-stone-600">
              {L(
                "Maombi yako yatapitiwa na afisa ndani ya siku 1-5 za kazi.",
                "Applications go to manual staff review in 1-5 working days.",
              )}
            </p>
          </div>
          <VerificationBadge tier={tier} lang={lang} showDot />
        </div>
      ) : (
        <div className="rounded-xl p-3 bg-stone-50 border border-stone-200 flex items-center gap-2.5">
          <Zap size={14} className="text-stone-600 shrink-0" />
          <p className="text-xs font-bold text-stone-700">
            {L("NIDA Imethibitishwa - Usindikaji wa Papo Hapo", "NIDA Verified - Instant processing")}
          </p>
          <VerificationBadge tier={tier} lang={lang} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {CITIZEN_VISIBLE_SERVICES.map((service) => {
          const meta = SERVICE_META[service.name] || { icon: "\uD83D\uDCCB" };
          const isInstant = tier === "NIDA_VERIFIED";
          const isCelebration = service.name === SERVICE_NAMES.CELEBRATION;

          const displayFee = isCelebration ? null : computeFee(service.name, applicantType);
          const split = displayFee === null ? null : splitFee(displayFee);

          return (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition-all flex flex-col hover:shadow-lg hover:border-stone-400 cursor-pointer group"
              onClick={() => onSelectService(service)}
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-xl transition-colors">
                    <span className="grayscale">{meta.icon}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-stone-200 shrink-0">
                      {isCelebration
                        ? applicantType === "citizen"
                          ? L("5% ya gharama", "5% of event cost")
                          : L("10% ya gharama", "10% of event cost")
                        : formatInCurrency(displayFee!, feeCurrency)}
                    </span>
                    {isInstant ? (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded-full border border-stone-200">
                        <Zap size={8} /> {L("Papo Hapo", "Instant")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-stone-400">
                        <Clock size={8} /> {L("Siku 1-5 za kazi", "1-5 working days")}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-black text-stone-900 text-base leading-snug mb-0.5">
                  {lang === "sw" ? service.name : service.name_en || service.name}
                </h3>
                <p className="text-[10px] text-stone-400 font-medium mb-2">
                  {lang === "sw" ? service.name_en || "" : service.name}
                </p>
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-3">
                  {lang === "sw"
                    ? service.description
                    : service.description_en || service.description}
                </p>

                {/* Fee split preview */}
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Calculator size={11} className="text-stone-400" />
                    <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest">
                      {isCelebration
                        ? L("Ada huhesabiwa kwa gharama ya tukio", "Fee based on event cost")
                        : L("Mgawanyo", "Split")}
                    </span>
                  </div>
                  {split ? <>
                    <SplitRow label="TRA" value={split.TRA} currency={feeCurrency} />
                    <SplitRow label={L("Halmashauri", "Council")} value={split.Halmashauri} currency={feeCurrency} />
                    <SplitRow label={L("Maendeleo ya Jamii", "Community Dev")} value={split.MaendeleoYaJamii} currency={feeCurrency} />
                    <SplitRow label={L("Ada ya Huduma", "Service Fee")} value={split.ServiceFee} currency={feeCurrency} />
                  </> : <p className="text-[10px] text-stone-500 font-medium">
                    {applicantType === "citizen" ? "5%" : "10%"} {L("ya gharama ya tukio.", "of the event cost.")}
                    {applicantType === "citizen" ? "" : ` ${L("Raia hulipa 5%.", "Residents pay 5%.")}`}
                  </p>}
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all group-hover:scale-[1.01]",
                    isInstant
                      ? "bg-stone-700 text-white hover:bg-stone-800 shadow-lg shadow-stone-200"
                      : "bg-stone-800 text-white hover:bg-black",
                  )}
                >
                  {isInstant ? (
                    <>
                      <Zap size={13} /> {L("Omba - Papo Hapo", "Apply - Instant")}
                      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  ) : (
                    <>
                      {L("Omba Sasa", "Apply Now")}{" "}
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function SplitRow({
  label,
  value,
  currency,
}: {
  label: string;
  value: number;
  currency: "TZS" | "USD";
}) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-stone-500 font-medium">{label}</span>
      <span className="text-stone-700 font-bold tabular-nums">
        {formatInCurrency(value, currency)}
      </span>
    </div>
  );
}

export default Services;
