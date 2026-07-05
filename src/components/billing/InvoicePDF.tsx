import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { getLocalizedName } from '@/lib/translit';

// Register Noto Sans Devanagari font for supporting English and Hindi (Devanagari) characters
Font.register({
  family: 'Noto Sans Devanagari',
  fonts: [
    {
      src: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf',
      fontWeight: 'bold',
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Noto Sans Devanagari',
    padding: 30,
    fontSize: 10,
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
    paddingBottom: 15,
    marginBottom: 20,
  },
  dairyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#064e3b',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metaBlock: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    marginBottom: 6,
  },
  textRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 80,
    color: '#64748b',
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    padding: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 6,
  },
  colDate: { width: '22%' },
  colQty: { width: '22%', textAlign: 'center' },
  colRate: { width: '18%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  colRemarks: { width: '18%', paddingLeft: 6 },
  
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  qrContainer: {
    width: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
  },
  qrImage: {
    width: 100,
    height: 100,
    marginBottom: 6,
  },
  qrText: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },
  totalsBlock: {
    width: '50%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    backgroundColor: '#ecfdf5',
    borderTopWidth: 1,
    borderTopColor: '#10b981',
    borderBottomWidth: 1,
    borderBottomColor: '#10b981',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  grandTotalLabel: {
    fontWeight: 'bold',
    color: '#064e3b',
    fontSize: 12,
  },
  grandTotalValue: {
    fontWeight: 'bold',
    color: '#064e3b',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    fontSize: 8,
  },
});

interface InvoicePDFProps {
  invoice: any;
  entries: any[];
  qrCodeDataUrl?: string;
  lang?: string;
}

export function InvoiceDocument({ invoice, entries, qrCodeDataUrl, lang = 'hi' }: InvoicePDFProps) {
  const isHi = lang === 'hi';
  
  // Format Date String helper
  const formatDate = (dateVal: Date | string) => {
    const d = new Date(dateVal);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.dairyName}>{invoice.dairy.name}</Text>
            <Text>{invoice.dairy.address || ''}</Text>
            <Text>{isHi ? 'मोबाइल' : 'Mobile'}: {invoice.dairy.phone || ''}</Text>
            {invoice.dairy.gstNumber && (
              <Text>GSTIN: {invoice.dairy.gstNumber}</Text>
            )}
          </View>
          <View>
            <Text style={styles.title}>{isHi ? 'दुग्ध बिल / इनवॉइस' : 'Milk Invoice'}</Text>
            <Text style={{ textAlign: 'right', marginTop: 4 }}>
              {isHi ? 'बिल नंबर' : 'Bill No'}: {invoice.invoiceNumber}
            </Text>
            <Text style={{ textAlign: 'right' }}>
              {isHi ? 'दिनांक' : 'Date'}: {formatDate(invoice.createdAt)}
            </Text>
          </View>
        </View>

        {/* Customer and Bill Details */}
        <View style={styles.metaContainer}>
          {/* Customer details */}
          <View style={styles.metaBlock}>
            <Text style={styles.sectionTitle}>{isHi ? 'ग्राहक का विवरण' : 'Customer Details'}</Text>
            <View style={styles.textRow}>
              <Text style={styles.label}>{isHi ? 'नाम' : 'Name'}:</Text>
              <Text style={styles.value}>{getLocalizedName(invoice.customer.name, lang)}</Text>
            </View>
            <View style={styles.textRow}>
              <Text style={styles.label}>ID:</Text>
              <Text style={styles.value}>{invoice.customer.customerId}</Text>
            </View>
            <View style={styles.textRow}>
              <Text style={styles.label}>{isHi ? 'फोन' : 'Phone'}:</Text>
              <Text style={styles.value}>{invoice.customer.phone}</Text>
            </View>
            {invoice.customer.village && (
              <View style={styles.textRow}>
                <Text style={styles.label}>{isHi ? 'गांव / क्षेत्र' : 'Village'}:</Text>
                <Text style={styles.value}>{invoice.customer.village}</Text>
              </View>
            )}
          </View>

          {/* Period Details */}
          <View style={styles.metaBlock}>
            <Text style={styles.sectionTitle}>{isHi ? 'बिल की अवधि' : 'Billing Period'}</Text>
            <View style={styles.textRow}>
              <Text style={styles.label}>{isHi ? 'अवधि' : 'Period'}:</Text>
              <Text style={styles.value}>
                {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
              </Text>
            </View>
            <View style={styles.textRow}>
              <Text style={styles.label}>{isHi ? 'दूध का प्रकार' : 'Milk Type'}:</Text>
              <Text style={styles.value}>
                {invoice.customer.milkType === 'COW' && (isHi ? 'गाय' : 'Cow')}
                {invoice.customer.milkType === 'BUFFALO' && (isHi ? 'भैंस' : 'Buffalo')}
                {invoice.customer.milkType === 'MIXED' && (isHi ? 'मिश्रित' : 'Mixed')}
              </Text>
            </View>
            <View style={styles.textRow}>
              <Text style={styles.label}>{isHi ? 'अंतिम तिथि' : 'Due Date'}:</Text>
              <Text style={[styles.value, { color: '#e11d48', fontWeight: 'bold' }]}>
                {formatDate(invoice.dueDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Statement Table */}
        <Text style={styles.sectionTitle}>{isHi ? 'दैनिक दूध विवरण' : 'Daily Milk Record'}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDate}>{isHi ? 'तारीख' : 'Date'}</Text>
            <Text style={styles.colQty}>{isHi ? 'सुबह' : 'Morning'}</Text>
            <Text style={styles.colQty}>{isHi ? 'शाम' : 'Evening'}</Text>
            <Text style={styles.colRate}>{isHi ? 'दर' : 'Rate'}</Text>
            <Text style={styles.colTotal}>{isHi ? 'कुल राशि' : 'Total'}</Text>
            <Text style={styles.colRemarks}>{isHi ? 'टिप्पणी' : 'Remarks'}</Text>
          </View>

          {entries.map((item, idx) => {
            const dailyTotal = (item.morningQty + item.eveningQty) * item.ratePerLiter + item.extraCharges - item.discount;
            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colDate}>{formatDate(item.date)}</Text>
                <Text style={styles.colQty}>{item.isHoliday ? '-' : `${item.morningQty.toFixed(1)} L`}</Text>
                <Text style={styles.colQty}>{item.isHoliday ? '-' : `${item.eveningQty.toFixed(1)} L`}</Text>
                <Text style={styles.colRate}>₹{item.ratePerLiter.toFixed(1)}</Text>
                <Text style={styles.colTotal}>₹{dailyTotal.toFixed(2)}</Text>
                <Text style={styles.colRemarks}>{item.remarks || ''}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary and Payment QR */}
        <View style={styles.summaryContainer}>
          {/* QR Code payment option */}
          <View style={styles.qrContainer}>
            {qrCodeDataUrl ? (
              <>
                <Image src={qrCodeDataUrl} style={styles.qrImage} />
                <Text style={styles.qrText}>UPI ID: {invoice.dairy.upiId || ''}</Text>
                <Text style={[styles.qrText, { fontWeight: 'bold', marginTop: 2 }]}>
                  {isHi ? 'भुगतान करने के लिए स्कैन करें' : 'Scan to Pay'}
                </Text>
              </>
            ) : (
              <Text style={[styles.qrText, { marginTop: 40 }]}>
                {isHi ? 'UPI भुगतान उपलब्ध नहीं है' : 'UPI Payment Not Configured'}
              </Text>
            )}
          </View>

          {/* Detailed Totals */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: 'bold' }}>{isHi ? 'सुबह कुल दूध' : 'Total Morning Qty'}:</Text>
              <Text>{invoice.totalMorningQty.toFixed(1)} L</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: 'bold' }}>{isHi ? 'शाम कुल दूध' : 'Total Evening Qty'}:</Text>
              <Text>{invoice.totalEveningQty.toFixed(1)} L</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: 'bold' }}>{isHi ? 'कुल दूध मात्रा' : 'Total Milk'}:</Text>
              <Text>{invoice.totalQty.toFixed(1)} L</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: 'bold' }}>{isHi ? 'दूध का मूल्य' : 'Milk Cost'}:</Text>
              <Text>₹{invoice.milkAmount.toFixed(2)}</Text>
            </View>
            {invoice.extraCharges > 0 && (
              <View style={styles.totalRow}>
                <Text>{isHi ? 'अतिरिक्त शुल्क' : 'Extra Charges'}:</Text>
                <Text>+ ₹{invoice.extraCharges.toFixed(2)}</Text>
              </View>
            )}
            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text>{isHi ? 'छूट' : 'Discount'}:</Text>
                <Text>- ₹{invoice.discount.toFixed(2)}</Text>
              </View>
            )}
            {invoice.previousBalance > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#e11d48' }}>{isHi ? 'पिछला बकाया' : 'Prev Balance'}:</Text>
                <Text style={{ color: '#e11d48' }}>+ ₹{invoice.previousBalance.toFixed(2)}</Text>
              </View>
            )}
            {invoice.advancePayment > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: '#16a34a' }}>{isHi ? 'अग्रिम भुगतान' : 'Advance Paid'}:</Text>
                <Text style={{ color: '#16a34a' }}>- ₹{invoice.advancePayment.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>{isHi ? 'कुल देय राशि' : 'Grand Total'}:</Text>
              <Text style={styles.grandTotalValue}>₹{invoice.grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {isHi 
            ? `हमारे साथ व्यापार करने के लिए धन्यवाद! ${invoice.dairy.name}`
            : `Thank you for choosing ${invoice.dairy.name}!`}
        </Text>

      </Page>
    </Document>
  );
}
