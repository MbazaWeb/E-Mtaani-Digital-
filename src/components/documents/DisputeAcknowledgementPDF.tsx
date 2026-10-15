import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Application } from "@/lib/supabase";
import { formatDate } from "./types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 50,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    color: "#1c1917",
    fontSize: 10,
  },
  brand: { fontSize: 9, fontWeight: "bold", color: "#047857", textAlign: "center" },
  title: { marginTop: 24, fontSize: 17, fontWeight: "bold", textAlign: "center" },
  subtitle: { marginTop: 5, fontSize: 10, color: "#57534e", textAlign: "center" },
  refBox: {
    marginTop: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
    alignItems: "center",
  },
  refLabel: { fontSize: 8, color: "#047857", textTransform: "uppercase" },
  refNumber: { marginTop: 5, fontSize: 14, fontWeight: "bold", fontFamily: "Courier" },
  intro: { marginTop: 20, fontSize: 10, lineHeight: 1.5 },
  section: { marginTop: 18, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: "#d6d3d1" },
  sectionTitle: { fontSize: 9, fontWeight: "bold", color: "#047857", textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4" },
  label: { width: "34%", fontSize: 8.5, color: "#78716c" },
  value: { flex: 1, fontSize: 9, fontWeight: "bold", lineHeight: 1.35 },
  description: { marginTop: 8, padding: 10, backgroundColor: "#fafaf9", fontSize: 9, lineHeight: 1.5 },
  notice: { marginTop: 22, padding: 12, borderWidth: 1, borderColor: "#fcd34d", backgroundColor: "#fffbeb" },
  noticeTitle: { fontSize: 9, fontWeight: "bold", color: "#92400e", marginBottom: 4 },
  noticeBody: { fontSize: 8.5, color: "#78350f", lineHeight: 1.45 },
  footer: { position: "absolute", bottom: 22, left: 48, right: 48, borderTopWidth: 0.5, borderTopColor: "#d6d3d1", paddingTop: 6 },
  footerText: { fontSize: 7, color: "#78716c", textAlign: "center" },
});

const value = (input: unknown) => {
  if (input == null || input === "") return "—";
  if (typeof input === "string" || typeof input === "number") return String(input);
  return "—";
};

export function DisputeAcknowledgementPDF({
  application,
  lang = "en",
}: {
  application: Application;
  lang: "sw" | "en";
}) {
  const sw = lang === "sw";
  const data = (application.form_data || {}) as Record<string, unknown>;
  const user = application.users;
  const applicant = [user?.first_name, user?.middle_name, user?.last_name].filter(Boolean).join(" ");
  const respondent =
    value(data.respondent_name || data.respondent_name_manual) === "—"
      ? "—"
      : value(data.respondent_name || data.respondent_name_manual);
  const date = formatDate(application.created_at);

  const Row = ({ label, content }: { label: string; content: unknown }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value(content)}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>E-MTAA · {sw ? "HUDUMA ZA SERIKALI ZA MITAA" : "LOCAL GOVERNMENT SERVICES"}</Text>
        <Text style={styles.title}>
          {sw ? "UTHIBITISHO WA OMBI LA MGOGORO" : "DISPUTE APPLICATION ACKNOWLEDGEMENT"}
        </Text>
        <Text style={styles.subtitle}>
          {sw ? "Uthibitisho wa kupokelewa kwa taarifa yako" : "Confirmation that your dispute report was received"}
        </Text>

        <View style={styles.refBox}>
          <Text style={styles.refLabel}>{sw ? "Namba ya maombi" : "Application reference"}</Text>
          <Text style={styles.refNumber}>{application.application_number}</Text>
        </View>

        <Text style={styles.intro}>
          {sw
            ? `Tunathibitisha kuwa ofisi imepokea ombi lako la huduma ya mgogoro tarehe ${date}. Hifadhi barua hii na utumie namba ya maombi unapofuatilia.`
            : `This confirms that your dispute service application was received on ${date}. Keep this letter and use the application reference when following up.`}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sw ? "TAARIFA ZA OMBI" : "APPLICATION DETAILS"}</Text>
        </View>
        <Row label={sw ? "Mwombaji" : "Applicant"} content={applicant || data.complainant_name} />
        <Row label={sw ? "Aina ya mgogoro" : "Dispute type"} content={data.dispute_type} />
        <Row label={sw ? "Mlalamikiwa" : "Respondent"} content={respondent} />
        <Row label={sw ? "Kichwa" : "Title"} content={data.title} />
        <Row label={sw ? "Tarehe ya tukio" : "Incident date"} content={data.incident_date} />
        <Row label={sw ? "Eneo / kata" : "Location / ward"} content={data.issue_location || user?.ward || application.ward} />
        <Row label={sw ? "Hali ya ombi" : "Application status"} content={application.status} />

        <Text style={styles.sectionTitle}>
          {sw ? "MAELEZO YA MGOGORO" : "DISPUTE DESCRIPTION"}
        </Text>
        <Text style={styles.description}>{value(data.description)}</Text>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>{sw ? "TAARIFA MUHIMU" : "IMPORTANT NOTICE"}</Text>
          <Text style={styles.noticeBody}>
            {sw
              ? "Barua hii inathibitisha kupokelewa kwa ombi pekee. Si uamuzi wa mgogoro, hati ya kuitwa, wala uthibitisho kwamba madai yamehakikiwa. Ofisi itawasiliana nawe kuhusu hatua zinazofuata."
              : "This letter confirms receipt of the application only. It is not a decision on the dispute, a summons, or verification of the claims. The office will contact you about the next steps."}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {sw ? "Imetengenezwa na mfumo wa E-MTAA · Hifadhi namba yako ya maombi" : "Generated by the E-MTAA portal · Keep your application reference safe"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
