import React, { useState } from "react";
import type { PaymentResult } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  ArrowRight,
  X,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Download,
  Share2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Language, useTranslation } from "@/lib/i18n";
import { formatCurrency, formatInCurrency, CurrencyCode } from "@/lib/currency";
import { convertFromTZS } from "@/constants/currencyRates";
import { supabase } from "@/lib/supabase";
import type { ApplicantType } from "@/constants/serviceFees";

interface PaymentGatewayProps {
  amount: number;
  applicationId: string;
  serviceName?: string;
  applicationNumber?: string;
  userEmail: string;
  userId: string;
  applicantType: ApplicantType;
  onSuccess: (paymentData: PaymentResult) => void;
  onCancel: () => void;
  onGoToApplications?: () => void;
  lang: Language;
  currency: CurrencyCode;
}

type PaymentMethod = "mobile" | "bank" | "paypal" | "card";
type MobileProvider = "mpesa" | "tigopesa" | "airtelmoney";
type BankProvider = "nmb" | "crdb" | "international";

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  applicationId,
  serviceName,
  applicationNumber,
  userEmail,
  userId,
  applicantType,
  onSuccess,
  onCancel,
  onGoToApplications,
  lang,
  currency,
}) => {
  const t = useTranslation(lang);
  const paidCurrency = currency === "USD" || currency === "EUR" ? currency : "TZS";
  const displayAmount =
    paidCurrency === "USD" || paidCurrency === "EUR"
      ? formatInCurrency(amount, paidCurrency)
      : formatCurrency(amount, paidCurrency);
  const [step, setStep] = useState<"method" | "details" | "processing" | "success">("method");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [mobileProvider, setMobileProvider] = useState<MobileProvider | null>(null);
  const [bankProvider, setBankProvider] = useState<BankProvider | null>(null);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [cardNetwork, setCardNetwork] = useState<"Visa" | "Mastercard">("Visa");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentResult, setPaymentResult] = useState<Record<string, unknown> | null>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [controlNumber] = useState(() => `DEMO-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`);

  const handlePayment = async () => {
    setPaymentError("");
    if (!loginPassword) {
      setPaymentError(lang === "sw" ? "Ingiza nenosiri la akaunti yako." : "Enter your account password to continue.");
      return;
    }
    let verified = false;
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: loginPassword,
      });
      verified = !authError && authData.user?.id === userId;
    } catch {
      verified = false;
    }
    setLoginPassword("");
    if (!verified) {
      setPaymentError(lang === "sw" ? "Nenosiri si sahihi. Jaribu tena." : "Password could not be verified. Please try again.");
      return;
    }

    setStep("processing");
    // Simulated processing only — no external PSP is contacted.
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const mockPaymentData = {
      application_id: applicationId,
      control_number: controlNumber,
      amount,
      paid_currency: paidCurrency,
      paid_amount: convertFromTZS(amount, paidCurrency),
      payment_method:
        method === "mobile"
          ? mobileProvider
          : method === "bank"
            ? bankProvider === "international" ? "international_bank_transfer" : bankProvider
            : method === "paypal" ? "paypal" : "card",
      card_brand: method === "card" ? cardNetwork : null,
      transaction_id: `SIM-${crypto.randomUUID().toUpperCase()}`,
      is_simulation: true,
      settlement_status: "simulated",
      provider: "simulation",
      paid_at: new Date().toISOString(),
      status: "simulated",
    };

    setPaymentResult(mockPaymentData);
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h3 className="text-xl font-heading font-extrabold text-stone-900">
              {lang === "sw" ? "Malipo ya Huduma" : "Service Payment"}
            </h3>
            <p className="text-sm text-stone-500">
              Application ID: {applicationId.split("-")[0]}...
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label={lang === "sw" ? "Funga" : "Close"}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === "method" && (
              <motion.div
                key="method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-primary/5 rounded-2xl p-6 flex items-center justify-between border border-primary/10">
                  <span className="text-stone-600 font-medium">
                    {lang === "sw" ? "Kiasi Unachopaswa Kulipa" : "Amount to Pay"}
                  </span>
                  <span className="text-2xl font-heading font-black text-primary">
                    {displayAmount}
                    {currency !== "TZS" && (
                      <span className="block text-xs font-medium text-stone-500">
                        {lang === "sw" ? "Msingi wa TZS" : "TZS base"}: TSh {amount.toLocaleString("en-US")}
                      </span>
                    )}
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
                  <div className="text-stone-500">{lang === "sw" ? "Namba ya udhibiti (ya majaribio)" : "Control number (demo)"}</div>
                  <div className="font-mono font-bold text-stone-900">{controlNumber}</div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {applicantType !== "diaspora" && <button
                    onClick={() => {
                      setMethod("mobile");
                      setStep("details");
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-stone-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900">
                        {lang === "sw" ? "Mtandao wa Simu" : "Mobile Money"}
                      </p>
                      <p className="text-xs text-stone-500">M-Pesa, Tigo Pesa, Airtel Money</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-primary transition-colors" />
                  </button>}

                  <button
                    onClick={() => {
                      setMethod("bank");
                      setStep("details");
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-stone-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900">
                        {applicantType === "diaspora"
                          ? lang === "sw" ? "Uhamisho wa Benki wa Kimataifa" : "International Bank Transfer"
                          : lang === "sw" ? "Benki (Bank Transfer)" : "Bank Transfer"}
                      </p>
                      <p className="text-xs text-stone-500">
                        {applicantType === "diaspora" ? "International transfer / SWIFT" : "NMB, CRDB"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-primary transition-colors" />
                  </button>

                  {applicantType === "diaspora" && <button
                    onClick={() => {
                      setMethod("paypal");
                      setStep("details");
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-stone-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 font-black text-xl">P</div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900">PayPal</p>
                      <p className="text-xs text-stone-500">International wallet</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-primary transition-colors" />
                  </button>}

                  <button
                    onClick={() => {
                      setMethod("card");
                      setStep("details");
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-stone-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-stone-900">
                        {applicantType === "diaspora"
                          ? lang === "sw" ? "Kadi ya Kimataifa (Visa/Mastercard)" : "International Card (Visa/Mastercard)"
                          : lang === "sw" ? "Kadi (Visa/Mastercard)" : "Card (Visa/Mastercard)"}
                      </p>
                      <p className="text-xs text-stone-500">Credit or Debit Card</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <button
                  onClick={() => setStep("method")}
                  className="text-sm font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  <X className="h-3 w-3" />{" "}
                  {lang === "sw" ? "Badili Njia ya Malipo" : "Change Payment Method"}
                </button>

                {method === "mobile" ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "mpesa", name: "M-Pesa", color: "bg-red-500" },
                        { id: "tigopesa", name: "Tigo Pesa", color: "bg-blue-600" },
                        { id: "airtelmoney", name: "Airtel Money", color: "bg-red-600" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setMobileProvider(p.id as MobileProvider)}
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all text-center",
                            mobileProvider === p.id
                              ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                              : "border-stone-100 hover:border-stone-200",
                          )}
                        >
                          <div className={cn("h-2 w-full rounded-full mb-2", p.color)} />
                          <span className="text-xs font-bold">{p.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-700">
                        {lang === "sw" ? "Namba ya Simu" : "Phone Number"}
                      </label>
                      <input
                        type="tel"
                        placeholder="07XX XXX XXX"
                        className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>
                ) : method === "paypal" ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                      {lang === "sw"
                        ? "Malipo ya PayPal bado hayajaunganishwa. Hii ni hali ya majaribio; hakuna fedha itakayotumwa kwa PayPal."
                        : "PayPal checkout is not connected yet. This is demo mode; no funds will be sent to PayPal."}
                    </div>
                    <label className="block space-y-2">
                      <span className="text-sm font-bold text-stone-700">PayPal email</span>
                      <input type="email" autoComplete="email" value={paypalEmail}
                        onChange={(event) => setPaypalEmail(event.target.value)}
                        placeholder="name@example.com"
                        className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none" />
                    </label>
                  </div>
                ) : method === "bank" ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(applicantType === "diaspora"
                        ? [{ id: "international", name: "International Bank Transfer (SWIFT)" }]
                        : [{ id: "nmb", name: "NMB Bank" }, { id: "crdb", name: "CRDB Bank" }]
                      ).map((p) => (
                        <button key={p.id} onClick={() => setBankProvider(p.id as BankProvider)}
                          className={cn("p-4 rounded-xl border-2 transition-all text-center font-bold",
                            bankProvider === p.id ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-stone-100 hover:border-stone-200")}
                        >{p.name}</button>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {lang === "sw"
                        ? "Tumia maelekezo rasmi ya benki ya taasisi yako na uweke namba ya udhibiti " + controlNumber + " kama rejea. Mfumo huu wa majaribio haujatoa maelezo ya akaunti wala kuthibitisha uhamisho."
                        : "Use your institution's official bank instructions and include control number " + controlNumber + " as the payment reference. This demo does not provide bank account details or verify a transfer."}
                    </div>
                  </div>
                ) : method === "card" ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {lang === "sw"
                        ? "Visa na Mastercard lazima zichakatwe kwenye ukurasa salama wa mtoa huduma wa malipo. Muunganisho bado haujawekwa; usiingize taarifa za kadi hapa."
                        : "Visa and Mastercard must be processed on a secure payment provider page. That integration is not configured; do not enter card details here."}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(["Visa", "Mastercard"] as const).map((network) => (
                        <button key={network} type="button" onClick={() => setCardNetwork(network)}
                          className={cn("p-4 rounded-xl border-2 font-bold transition-all",
                            cardNetwork === network ? "border-primary bg-primary/5" : "border-stone-100")}
                        >{network}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    {lang === "sw" ? "Njia hii haipatikani kwa aina ya akaunti yako." : "This payment method is not available for your account type."}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="payment-login-password" className="text-sm font-bold text-stone-700">
                    {lang === "sw" ? "Nenosiri la kuingia" : "Account login password"}
                  </label>
                  <input
                    id="payment-login-password"
                    type="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder={lang === "sw" ? "Thibitisha nenosiri lako" : "Confirm your password"}
                    className="w-full h-14 px-5 rounded-2xl border border-stone-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  />
                  <p className="text-xs text-stone-500">{lang === "sw" ? "Nenosiri halihifadhiwi." : "Your password is only used to verify your account and is not stored."}</p>
                </div>
                {paymentError && <p role="alert" className="text-sm font-semibold text-red-600">{paymentError}</p>}

                <button
                  disabled={
                    !loginPassword ||
                    (method === "mobile" && (applicantType === "diaspora" || !mobileProvider || !phoneNumber)) ||
                    (method === "bank" && !bankProvider) ||
                    (method === "paypal" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail))
                  }
                  onClick={handlePayment}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-tz-blue transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {t.payNow} <ArrowRight className="h-5 w-5" />
                </button>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-6"
              >
                <div className="relative inline-block">
                  <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-primary/40" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-heading font-extrabold text-stone-900">
                    {lang === "sw" ? "Tunachakata Malipo" : "Processing Payment"}
                  </h4>
                  <p className="text-stone-500">
                    {lang === "sw"
                      ? "Tafadhali usifunge dirisha hili..."
                      : "Please do not close this window..."}
                  </p>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-6"
              >
                <motion.div
                  className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <CheckCircle2 className="h-12 w-12" />
                </motion.div>
                <div>
                  <h4 className="text-2xl font-heading font-extrabold text-stone-900">
                    {lang === "sw" ? "Malipo Yamekamilika!" : "Payment Completed!"}
                  </h4>
                  <p className="text-stone-500">
                    {lang === "sw"
                      ? "Huu ni uigaji wa malipo tu. Hakuna mtoa huduma wa malipo aliyeshughulikia muamala huu."
                      : "This is a payment simulation only. No external payment provider processed this transaction."}
                  </p>
                </div>

                {/* Transaction Details */}
                {paymentResult && (
                  <div className="bg-stone-50 rounded-xl p-4 text-left space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">{lang === "sw" ? "Namba ya udhibiti:" : "Control number:"}</span>
                      <span className="font-mono font-bold text-stone-900">{controlNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">
                        {lang === "sw" ? "Namba ya Muamala:" : "Transaction ID:"}
                      </span>
                      <span className="font-bold text-stone-900">
                        {(paymentResult as Record<string, unknown>).transaction_id as string}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">{lang === "sw" ? "Kiasi:" : "Amount:"}</span>
                      <span className="font-bold text-emerald-600">
                        {displayAmount}
                      </span>
                    </div>
                  </div>
                )}

                {/* Download + Share + Go to Applications actions */}
                <div className="space-y-3 w-full">
                  <button
                    onClick={() =>
                      onSuccess(paymentResult as unknown as import("@/types").PaymentResult)
                    }
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {lang === "sw" ? "Thibitisha na umalize" : "Confirm and finish"}
                  </button>

                  {/* Go to My Applications — primary nav action */}
                  <button
                    onClick={() => {
                      onCancel(); // close the gateway modal
                      onGoToApplications?.(); // navigate to applications page
                    }}
                    className="w-full py-3.5 bg-stone-900 dark:bg-stone-100 hover:bg-black dark:hover:bg-white text-white dark:text-stone-900 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <FolderOpen className="h-4 w-4" />
                    {lang === "sw" ? "Nenda Maombi Yangu" : "Go to My Applications"}
                  </button>

                  <button
                    onClick={async () => {
                      const shareData = {
                        title:
                          serviceName || (lang === "sw" ? "Hati Rasmi" : "Official Certificate"),
                        text:
                          lang === "sw"
                            ? `Hati yangu rasmi ya ${serviceName} — Namba: ${applicationNumber}`
                            : `My official ${serviceName} certificate — Ref: ${applicationNumber}`,
                        url: `${window.location.origin}/verify?ref=${applicationNumber}`,
                      };
                      if (navigator.share && navigator.canShare?.(shareData)) {
                        try {
                          await navigator.share(shareData);
                        } catch {
                          /* user cancelled share */
                        }
                      } else {
                        await navigator.clipboard.writeText(shareData.url);
                        alert(lang === "sw" ? "Kiungo kimekopwa!" : "Link copied!");
                      }
                    }}
                    className="w-full py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    {lang === "sw" ? "Shiriki Cheti" : "Share Certificate"}
                  </button>
                  <button
                    onClick={onCancel}
                    className="w-full py-2 text-stone-400 hover:text-stone-600 text-sm transition-colors"
                  >
                    {lang === "sw" ? "Funga" : "Close"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-8 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest flex-wrap text-center">
          <ShieldCheck className="h-3 w-3" /> {lang === "sw" ? "Malipo ya majaribio · Hakuna GePG" : "Demo payment · No GePG connection"}
        </div>
      </motion.div>
    </div>
  );
};
