export type ApplicantType = 'citizen' | 'foreigner' | 'diaspora';

export interface FeeStructure {
  citizen: number;
  foreigner: number;
  diaspora: number;
  percentageAddon?: {
    citizen: number;
    foreigner: number;
    diaspora: number;
  };
}

export const SERVICE_NAMES = {
  BURIAL: 'Kibali cha Mazishi',
  CELEBRATION: 'Kibali cha Sherehe',
  INTRO_LETTER: 'Barua ya Utambulisho',
  DISPUTE: 'Taarifa ya Mgogoro',
} as const;

const SERVICE_KEY_ALIASES: Record<string, string> = {
  kibali_mazishi: 'kibali_mazishi',
  kibali_cha_mazishi: 'kibali_mazishi',
  'kibali cha mazishi': 'kibali_mazishi',
  'kibari cha mazishi': 'kibali_mazishi',

  kibali_sherehe: 'kibali_sherehe',
  kibali_cha_sherehe: 'kibali_sherehe',
  'kibali cha sherehe': 'kibali_sherehe',
  'kibari cha sherehe': 'kibali_sherehe',

  barua_utambulisho: 'barua_utambulisho',
  barua_ya_utambulisho: 'barua_utambulisho',
  'barua ya utambulisho': 'barua_utambulisho',

  taarifa_mgogoro: 'taarifa_mgogoro',
  taarifa_ya_mgogoro: 'taarifa_mgogoro',
  'taarifa ya mgogoro': 'taarifa_mgogoro',
};

export const SERVICE_PRICING: Record<string, FeeStructure> = {
  kibali_mazishi: {
    citizen: 2000,
    foreigner: 20000,
    diaspora: 10000,
  },
  kibali_sherehe: {
    citizen: 0,
    foreigner: 0,
    diaspora: 0,
    percentageAddon: {
      citizen: 0.05,
      foreigner: 0.10,
      diaspora: 0.10,
    },
  },
  barua_utambulisho: {
    citizen: 2000,
    foreigner: 10000,
    diaspora: 10000,
  },
  taarifa_mgogoro: {
    citizen: 1000,
    foreigner: 10000,
    diaspora: 20000,
  },
};

export function getApplicantType(profile?: {
  applicant_type?: string | null;
  is_diaspora?: boolean | null;
  nationality?: string | null;
  country_of_citizenship?: string | null;
} | null): ApplicantType {
  if (
    profile?.applicant_type === "citizen" ||
    profile?.applicant_type === "foreigner" ||
    profile?.applicant_type === "diaspora"
  ) {
    return profile.applicant_type;
  }
  if (profile?.is_diaspora) return "diaspora";

  const nationality = (profile?.nationality || profile?.country_of_citizenship || "")
    .trim()
    .toLowerCase();
  return nationality && !["tanzanian", "tanzania", "tz"].includes(nationality)
    ? "foreigner"
    : "citizen";
}

export interface FeeBreakdown {
  baseFee: number;
  totalFee: number;
  traShare: number;
  halmashauriShare: number;
  maendeleoShare: number;
  serviceFeeShare: number;
  TRA: number;
  Halmashauri: number;
  MaendeleoYaJamii: number;
  ServiceFee: number;
}

function normalizeServiceKey(serviceKey: string): string {
  const normalized = String(serviceKey ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return SERVICE_KEY_ALIASES[normalized] ?? normalized;
}

export function calculateServiceFee(
  serviceKey: string,
  applicantType: ApplicantType = 'citizen',
  customBaseAmount: number = 0,
): number {
  const normalized = normalizeServiceKey(serviceKey);
  const config = SERVICE_PRICING[normalized] ?? {
    citizen: 2000,
    foreigner: 10000,
    diaspora: 10000,
  };

  const base = config[applicantType] ?? config.citizen;

  if (config.percentageAddon) {
    const rate = config.percentageAddon[applicantType] ?? 0.05;
    // Celebration fees are a percentage of the declared event cost. The event
    // cost itself is never added to the amount the applicant owes.
    return customBaseAmount > 0 ? Math.round(customBaseAmount * rate) : 0;
  }

  return Number(base.toFixed(2));
}

export function splitFee(totalFee: number): FeeBreakdown {
  const breakdown: FeeBreakdown = {
    baseFee: totalFee,
    totalFee,
    traShare: totalFee * 0.20,
    halmashauriShare: totalFee * 0.10,
    maendeleoShare: totalFee * 0.40,
    serviceFeeShare: totalFee * 0.30,
    TRA: totalFee * 0.20,
    Halmashauri: totalFee * 0.10,
    MaendeleoYaJamii: totalFee * 0.40,
    ServiceFee: totalFee * 0.30,
  };

  return breakdown;
}

export const computeFee = calculateServiceFee;
export const getServiceFee = calculateServiceFee;
export const FEE_CONFIG = SERVICE_PRICING;
export default calculateServiceFee;
