/**
 * feeDistribution.ts — Government fee allocation
 *
 * Receipt compatibility helper backed by the canonical service fee split.
 */

import { splitFee } from "@/constants/serviceFees";

export interface FeeShare {
  key: string;
  label: { sw: string; en: string };
  percent: number;
  amount: number;
}

export const FEE_DISTRIBUTION: {
  key: string;
  label: { sw: string; en: string };
  percent: number;
}[] = [
  { key: "tra", label: { sw: "TRA", en: "TRA" }, percent: 20 },
  { key: "council", label: { sw: "Halmashauri", en: "Council" }, percent: 10 },
  { key: "community", label: { sw: "Maendeleo ya Jamii", en: "Community Development" }, percent: 40 },
  { key: "service", label: { sw: "Ada ya Huduma", en: "Service Fee" }, percent: 30 },
];

/**
 * Split a total amount into its constituent shares.
 * The canonical splitter reconciles rounding so the parts sum exactly.
 */
export function distributeFee(total: number): FeeShare[] {
  const t = Math.max(0, Math.round(Number(total) || 0));
  const breakdown = splitFee(t);
  const amounts = [
    breakdown.TRA,
    breakdown.Halmashauri,
    breakdown.MaendeleoYaJamii,
    breakdown.ServiceFee,
  ];
  return FEE_DISTRIBUTION.map((share, index) => ({ ...share, amount: amounts[index] }));
}
