export type CurrencyCode = "TZS" | "USD" | "EUR" | "GBP" | "KES";

export const formatCurrency = (amount: number, currency: string = "TZS") => {
  return new Intl.NumberFormat("sw-TZ", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getCurrencyForUser = (
  isDiaspora?: boolean,
  countryOfResidence?: string | null,
): CurrencyCode => {
  if (isDiaspora) return "USD";
  if (
    countryOfResidence &&
    countryOfResidence.trim() !== "" &&
    countryOfResidence.trim().toLowerCase() !== "tanzania"
  ) {
    return "USD";
  }
  return "TZS";
};


// --- Applicant-type aware currency helpers ---------------------------------
// Added for the multi-currency release. These coexist with the older
// formatCurrency / getCurrencyForUser exports above.

import type { ApplicantType } from "@/types";
import {
  ALLOWED_CURRENCIES,
  TZS_BASE_RATES,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/constants/currencyRates";

/** Returns the currencies a given applicant type can pay with. */
export function getAllowedCurrencies(applicantType: ApplicantType): readonly SupportedCurrency[] {
  return ALLOWED_CURRENCIES[applicantType] ?? ALLOWED_CURRENCIES.citizen;
}

/** Convert an amount in TZS to the target currency. */
export function convertFromTZS(amountTZS: number, currency: SupportedCurrency): number {
  const rate = TZS_BASE_RATES[currency] ?? 1;
  const value = amountTZS * rate;
  return currency === "TZS" ? Math.round(value) : Math.round(value * 100) / 100;
}

/** Format a TZS amount into the target currency string. */
export function formatInCurrency(amountTZS: number, currency: SupportedCurrency): string {
  const value = convertFromTZS(amountTZS, currency);
  if (currency === "TZS") return `TSh ${value.toLocaleString("en-US")}`;
  if (currency === "USD") return `$ ${value.toFixed(2)}`;
  if (currency === "EUR") return `EUR ${value.toFixed(2)}`;
  if (currency === "CNY") return `CNY ${value.toFixed(2)}`;
  return `${currency} ${value.toFixed(2)}`;
}

export function formatPaidAmount(amount: number, currency: string = "TZS"): string {
  const symbols: Record<string, string> = {
    TZS: "TSh",
    USD: "$",
    EUR: "EUR",
    CNY: "CNY",
    GBP: "GBP",
    KES: "KES",
  };
  const value = currency === "TZS" ? amount.toLocaleString("en-US") : amount.toFixed(2);
  return `${symbols[currency] ?? currency} ${value}`;
}

export { SUPPORTED_CURRENCIES, TZS_BASE_RATES, ALLOWED_CURRENCIES };
export type { SupportedCurrency };