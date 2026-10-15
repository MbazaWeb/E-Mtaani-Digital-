import React from "react";
import { Text, View } from "@react-pdf/renderer";

interface RecipientNoticeProps {
  lang: "sw" | "en";
  recipient: string;
  context?: string;
}

/** Printed notice tying an issued document to the recipient recorded in its application. */
export const RecipientNotice: React.FC<RecipientNoticeProps> = ({ lang, recipient, context }) => {
  const sw = lang === "sw";
  const recipientName = recipient.trim() || (sw ? "aliyetajwa kwenye maombi" : "the person named in the application");
  const contextText = context?.trim() ? ` (${context.trim()})` : "";

  return (
    <View
      style={{
        borderWidth: 0.6,
        borderColor: "#9a7b36",
        backgroundColor: "#faf8f2",
        padding: 6,
        marginTop: 7,
        marginBottom: 4,
      }}
    >
      <Text style={{ fontSize: 7, lineHeight: 1.35, color: "#3a3326" }}>
        {sw
          ? `TAARIFA KWA MPOKEAJI: Hati hii imetolewa kwa ajili ya ${recipientName}${contextText} kama ilivyo kwenye maombi haya. Inatumika kwa mpokeaji na madhumuni yaliyoainishwa hapa pekee; hairuhusiwi kutumika tena kwa mtu au mpokeaji mwingine.`
          : `RECIPIENT NOTICE: This document is issued only for ${recipientName}${contextText}, as recorded in this application. It is valid only for the recipient and purpose stated here and must not be reused for another person or recipient.`}
      </Text>
    </View>
  );
};
