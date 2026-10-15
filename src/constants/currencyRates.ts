/**
 * currencyRates.ts — TZS-based exchange rates.
 *
 * Base currency is TZS. Each value is "how many units of that currency
 * per 1 TZS". To convert 10,000 TZS to USD: 10_000 * TZS_BASE_RATES.USD.
 *
 * UPDATE THESE VALUES whenever rates move materially. Admin edits this
 * file and redeploys. No DB or API needed for now.
 *
 * Last updated: 2026-10-14
 */

export const SUPPORTED_CURRENCIES = ["TZS", "USD", "EUR", "CNY"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Conversion: 1 TZS = X units of target currency.
 * Update manually. Values below are approximations for demo purposes.
 */
export const TZS_BASE_RATES: Record<SupportedCurrency, number> = {
  TZS: 1,
  USD: 1 / 2600, // 1 USD ~= 2600 TZS
  EUR: 1 / 2850, // 1 EUR ~= 2850 TZS
  CNY: 1 / 360,  // 1 CNY ~= 360 TZS
};

/**
 * Currency rules by applicant type.
 */
export const ALLOWED_CURRENCIES: Record<
  "citizen" | "diaspora" | "foreigner",
  readonly SupportedCurrency[]
> = {
  citizen:   ["TZS"],
  diaspora:  ["TZS", "USD", "EUR", "CNY"],
  foreigner: ["TZS", "USD", "EUR", "CNY"],
};

/**
 * Currency symbol map for display.
 */
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  TZS: "TSh",
  USD: "$",
  EUR: "EUR",
  CNY: "CNY",
};

/**
 * Convert an amount in TZS to the target currency.
 * Rounds to 2 decimals for foreign currencies, whole numbers for TZS.
 */
export function convertFromTZS(amountTZS: number, target: SupportedCurrency): number {
  const converted = amountTZS * TZS_BASE_RATES[target];
  return target === "TZS" ? Math.round(converted) : Math.round(converted * 100) / 100;
}

/**
 * Format an amount in the target currency with proper symbol and decimals.
 */
export function formatInCurrency(amountTZS: number, target: SupportedCurrency): string {
  const value = convertFromTZS(amountTZS, target);
  const symbol = CURRENCY_SYMBOLS[target];
  if (target === "TZS") {
    return `${symbol} ${value.toLocaleString("en-US")}`;
  }
  return `${symbol} ${value.toFixed(2)}`;
}