import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { calculateServiceFee, getApplicantType, splitFee } from '@/constants/serviceFees';
import type { DocumentPDFProps } from './types';
import { TANZANIA_EMBLEM_DATA_URL } from '@/constants/emblem';
import { formatPaidAmount } from '@/lib/currency';

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: { alignItems: 'center', marginBottom: 14 },
  logo: { width: 42, height: 42, marginBottom: 8 },
  title: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 8, color: '#4b5563', textAlign: 'center', marginBottom: 10 },
  box: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 9, color: '#374151' },
  value: { fontSize: 9, fontWeight: 'bold', color: '#111827' },
  amount: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 8 },
  footer: { fontSize: 7, color: '#6b7280', textAlign: 'center', marginTop: 8 },
});

export const RisitiMalipoPDF: React.FC<DocumentPDFProps> = ({ application, lang = 'sw' }) => {
  const formData = (application.form_data || {}) as Record<string, unknown>;
  const paymentData = (application.payment_data || {}) as Record<string, unknown>;
  const serviceName = application.service_name || 'Huduma';
  const applicantName =
    String(formData.applicant_name || '') ||
    [application.users?.first_name, application.users?.middle_name, application.users?.last_name]
      .filter(Boolean)
      .join(' ') ||
    'Mteja';
  const receiptNumber = String(paymentData.receipt_number || `RCP-${application.application_number}`);
  const totalFee = Number(
    paymentData.amount ?? formData.total_fee ?? formData.service_fee ?? formData.amount ?? 0,
  );
  const paidCurrency = String(paymentData.paid_currency || 'TZS');
  const paidAmount = Number(paymentData.paid_amount ?? totalFee);
  const applicantType = getApplicantType(formData);
  const celebrationCost = Number(formData.celebration_cost || 0);
  const breakdown = splitFee(
    totalFee || calculateServiceFee(serviceName, applicantType, celebrationCost),
  );
  const sw = lang === 'sw';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={TANZANIA_EMBLEM_DATA_URL} style={styles.logo} />
          <Text style={styles.title}>{sw ? 'JAMHURI YA MUUNGANO WA TANZANIA' : 'UNITED REPUBLIC OF TANZANIA'}</Text>
          <Text style={styles.subtitle}>{sw ? 'MTAANI KIGANJANI • RISITI YA MALIPO' : 'MTAANI KIGANJANI • PAYMENT RECEIPT'}</Text>
        </View>

        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>{sw ? 'Namba ya risiti' : 'Receipt no.'}</Text>
            <Text style={styles.value}>{receiptNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{sw ? 'Mteja' : 'Customer'}</Text>
            <Text style={styles.value}>{applicantName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{sw ? 'Huduma' : 'Service'}</Text>
            <Text style={styles.value}>{serviceName}</Text>
          </View>
        </View>

        <Text style={styles.amount}>{sw ? 'Jumla iliyolipwa' : 'Total paid'}: {formatPaidAmount(paidAmount, paidCurrency)}</Text>
        {paidCurrency !== 'TZS' && (
          <Text style={styles.subtitle}>TZS base: TSh {Number(totalFee || breakdown.totalFee).toLocaleString()}</Text>
        )}

        <View style={styles.box}>
          <View style={styles.row}><Text style={styles.label}>TRA (20%)</Text><Text style={styles.value}>TZS {breakdown.TRA!.toLocaleString()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{sw ? 'Halmashauri (10%)' : 'Council (10%)'}</Text><Text style={styles.value}>TZS {breakdown.Halmashauri!.toLocaleString()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{sw ? 'Maendeleo ya Jamii (40%)' : 'Community Development (40%)'}</Text><Text style={styles.value}>TZS {breakdown.MaendeleoYaJamii!.toLocaleString()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>{sw ? 'Ada ya Huduma (30%)' : 'Service Fee (30%)'}</Text><Text style={styles.value}>TZS {breakdown.ServiceFee!.toLocaleString()}</Text></View>
        </View>

        <Text style={styles.footer}>{sw ? 'Asante kwa kutumia huduma ya Mtaani Kiganjani.' : 'Thank you for using Mtaani Kiganjani services.'}</Text>
      </Page>
    </Document>
  );
};
