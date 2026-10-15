import { describe, expect, it } from "vitest";
import {
  calculateServiceFee,
  getApplicantType,
  SERVICE_NAMES,
  splitFee,
} from "@/constants/serviceFees";
import { CITIZEN_VISIBLE_SERVICES } from "@/constants/services";
import { convertFromTZS } from "@/constants/currencyRates";
import { distributeFee } from "@/lib/feeDistribution";

describe("service pricing catalog", () => {
  it("includes the required public services with the requested citizen pricing", () => {
    expect(CITIZEN_VISIBLE_SERVICES.map((service) => service.title)).toEqual([
      "Kibali cha Mazishi",
      "Kibali cha Sherehe",
      "Barua ya Utambulisho",
      "Taarifa ya Mgogoro",
    ]);

    expect(calculateServiceFee(SERVICE_NAMES.BURIAL, "citizen")).toBe(2000);
    expect(calculateServiceFee(SERVICE_NAMES.CELEBRATION, "citizen")).toBe(10000);
    expect(calculateServiceFee(SERVICE_NAMES.INTRO_LETTER, "citizen")).toBe(2000);
    expect(calculateServiceFee(SERVICE_NAMES.DISPUTE, "citizen")).toBe(1000);
  });

  it("applies the correct foreigner and diaspora flat charges", () => {
    expect(calculateServiceFee(SERVICE_NAMES.BURIAL, "foreigner")).toBe(20000);
    expect(calculateServiceFee(SERVICE_NAMES.BURIAL, "diaspora")).toBe(10000);
    expect(calculateServiceFee(SERVICE_NAMES.INTRO_LETTER, "foreigner")).toBe(10000);
    expect(calculateServiceFee(SERVICE_NAMES.INTRO_LETTER, "diaspora")).toBe(10000);
    expect(calculateServiceFee(SERVICE_NAMES.DISPUTE, "foreigner")).toBe(10000);
    expect(calculateServiceFee(SERVICE_NAMES.DISPUTE, "diaspora")).toBe(20000);
  });

  it("charges the celebration percentage of the event cost with a TSh 10,000 minimum", () => {
    expect(calculateServiceFee(SERVICE_NAMES.CELEBRATION, "citizen", 100000)).toBe(10000);
    expect(calculateServiceFee(SERVICE_NAMES.CELEBRATION, "citizen", 500000)).toBe(25000);
    expect(calculateServiceFee(SERVICE_NAMES.CELEBRATION, "foreigner", 500000)).toBe(50000);
    expect(calculateServiceFee(SERVICE_NAMES.CELEBRATION, "diaspora", 500000)).toBe(50000);
  });

  it("resolves applicant type and converts the base TZS amount", () => {
    expect(getApplicantType({ applicant_type: "foreigner" })).toBe("foreigner");
    expect(getApplicantType({ is_diaspora: true })).toBe("diaspora");
    expect(getApplicantType({ nationality: "Kenyan" })).toBe("foreigner");
    expect(convertFromTZS(20000, "USD")).toBe(7.69);
  });

  it("keeps the mandated revenue split percentages", () => {
    const breakdown = splitFee(10000);
    expect(breakdown.traShare).toBe(2000);
    expect(breakdown.halmashauriShare).toBe(1000);
    expect(breakdown.maendeleoShare).toBe(4000);
    expect(breakdown.serviceFeeShare).toBe(3000);
  });

  it("keeps document receipt allocations aligned with the canonical split", () => {
    expect(distributeFee(10000).map(({ percent, amount }) => [percent, amount])).toEqual([
      [20, 2000],
      [10, 1000],
      [40, 4000],
      [30, 3000],
    ]);
  });
});
