import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font, Svg, Path } from '@react-pdf/renderer';
import type { TrackingLink, AdvancePaymentRecord } from '@/types';
import { format, parseISO } from 'date-fns';
import JsBarcode from 'jsbarcode';

// Create a barcode component using local canvas rendering
const Barcode = ({ value, width = 100, height = 30 }: { value: string; width?: number; height?: number }) => {
  if (!value) return null;
  
  let barcodeDataUrl = '';
  if (typeof window !== 'undefined') {
    try {
      const canvas = window.document.createElement('canvas');
      JsBarcode(canvas, value, {
        format: "CODE128",
        displayValue: false,
        width: 3,       // High contrast thicker lines
        height: 60,      // Higher height ratio
        margin: 12,      // Clear quiet zone on sides so scanners can find start/stop signals
      });
      barcodeDataUrl = canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Failed to generate barcode locally:", error);
    }
  }

  if (!barcodeDataUrl) {
    // Fallback to bwip API if local generation failed or during SSR
    barcodeDataUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(value)}&scale=2&rotate=N&includetext=false`;
  }

  return (
    <View style={{ height: height + 10, width: width + 20, alignItems: 'center', justifyContent: 'center' }}>
      <Image 
        src={barcodeDataUrl} 
        style={{ width: width, height: height, objectFit: 'contain' }} 
      />
    </View>
  );
};

const GiftIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
    <Path 
      d="M3 11h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11z" 
      fill="none" 
      stroke="#CA8A04" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <Path 
      d="M12 2v20" 
      fill="none" 
      stroke="#CA8A04" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <Path 
      d="M2 11h20" 
      fill="none" 
      stroke="#CA8A04" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <Path 
      d="M7.5 7.5a2.5 2.5 0 0 1 0-5C10 2.5 12 7.5 12 7.5s2-5 4.5-5a2.5 2.5 0 0 1 0 5c0 0-2 5-4.5 5s-4.5-5-4.5-5z" 
      fill="none" 
      stroke="#CA8A04" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </Svg>
);

const BuildingIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
    <Path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill="#94A3B8" />
  </Svg>
);

const MapPinIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#94A3B8" />
  </Svg>
);

const PhoneIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
    <Path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#94A3B8" />
  </Svg>
);

const ReceiptTextIcon = () => (
  <Svg width="12" height="12" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
    <Path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" fill="#94A3B8" />
  </Svg>
);

const StickyNoteIcon = () => (
  <Svg width="12" height="12" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
    <Path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="#94A3B8" />
  </Svg>
);

const AvatarFallback = ({ name }: { name: string }) => {
  if (!name) return null;
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  return (
    <View style={{
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#FFEAD2', 
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    }}>
      <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#FF8000' }}>{initials}</Text>
    </View>
  );
};

// Register Bangla font support
Font.register({
  family: 'Hind Siliguri',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/hindsiliguri/HindSiliguri-Regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/hindsiliguri/HindSiliguri-Bold.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 30,
    paddingTop: 18,
    paddingBottom: 10,
    fontSize: 9,
    color: '#444',
    fontFamily: 'Hind Siliguri',
    backgroundColor: '#FFFFFF',
  },
  container: {
    border: '1pt solid #E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  logo: {
    width: 120,
    marginBottom: 8,
  },
  companyAddress: {
    fontSize: 8,
    color: '#64748B',
    lineHeight: 1.4,
    maxWidth: 350,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerRightTop: {
    marginBottom: 7,
  },
  invoiceNo: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  dateText: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2,
  },
  billingAndRepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 15,
  },
  billToSection: {
    backgroundColor: '#F8FAFC',
    border: '1pt solid #E2E8F0',
    borderRadius: 8,
    padding: 12,
    flex: 1,
  },
  repSection: {
    backgroundColor: '#F8FAFC',
    border: '1pt solid #E2E8F0',
    borderRadius: 8,
    padding: 12,
    flex: 1,
  },
  billToLabel: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  billToItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  billToText: {
    fontSize: 9,
    color: '#1E293B',
    fontWeight: 'medium',
  },
  repLabel: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  repItem: {
    marginBottom: 6,
  },
  repName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'medium',
    color: '#0F172A',
  },
  noteHeading: {
    fontSize: 11,
    fontWeight: 'medium',
    color: '#0F172A',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 8.5,
    color: '#334155',
  },
  // Column Widths for Order Items
  colModel: { width: '40%', paddingRight: 8 },
  colQty: { width: '12%', textAlign: 'center', paddingLeft: 4, paddingRight: 4 },
  colLam: { width: '18%', textAlign: 'left', paddingLeft: 8, paddingRight: 4 },
  colPrice: { width: '15%', textAlign: 'right', paddingRight: 8 },
  colTotal: { width: '15%', textAlign: 'right', paddingRight: 4 },

  // Column Widths for Payment History
  colPayDate: { width: '28%', paddingRight: 8 },
  colPayAmount: { width: '18%', paddingRight: 8 },
  colPayMethod: { width: '20%', paddingRight: 8 },
  colPayNotes: { width: '18%', paddingRight: 8 },
  colPayBy: { width: '16%' },

  summarySection: {
    marginTop: 20,
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  netPayableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderTopStyle: 'dashed',
    marginTop: 4,
  },
  amountDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderTopStyle: 'dashed',
  },
  amountDueLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF8000',
  },
  amountDueValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF8000',
  },
  discountValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  percentIcon: {
    color: '#EF4444',
    fontSize: 9,
    marginRight: 4,
    fontWeight: 'bold',
  },
  giftValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#CA8A04',
  },
  stamp: {
    position: 'absolute',
    left: -130,
    top: 5,
    width: 100,
    height: 100,
    opacity: 0.8,
    transform: 'rotate(-20deg)',
  },
  noteWrapper: {
    marginTop: 10,
  },
  noteCard: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderStyle: 'solid',
    backgroundColor: '#FFFEF0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noteText: {
    fontSize: 8,
    color: '#92400E',
    lineHeight: 1.5,
  },
});

interface InvoicePageProps {
  order: TrackingLink;
}

const InvoicePage = ({ order }: InvoicePageProps) => {
  const orderSubtotal = Array.isArray(order.orderItems)
    ? order.orderItems.reduce((acc, item) => acc + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0)
    : 0;
  const giftTotal = Array.isArray(order.orderItems)
    ? order.orderItems.reduce((acc, item) => acc + (item.isGift ? (Number(item.lineItemTotalPrice) || 0) : 0), 0)
    : 0;
  const effectiveDiscount = Number(order.specialClientDiscount) || 0;
  const netPayable = orderSubtotal - effectiveDiscount;
  const shippingCharge = Number(order.shippingCharge) || 0;
  const grandTotal = netPayable + shippingCharge;

  const allAdvancePaymentRecords: AdvancePaymentRecord[] = [];
  if (order.advancePayments && order.advancePayments.length > 0) {
    allAdvancePaymentRecords.push(...order.advancePayments.map(r => ({ ...r, amount: Number(r.amount) })));
  } else if (order.advancePayment && Number(order.advancePayment) > 0) {
    allAdvancePaymentRecords.push({
      id: 'legacy-advance',
      amount: Number(order.advancePayment),
      date: order.createdAt,
      paymentMethod: order.paymentMethod || "Unknown",
      notes: "Initial advance payment (legacy data).",
      recordedByUserId: order.crmUserId,
      recordedByUserName: order.crmUserName,
    });
  }
  const sortedPaymentRecords = allAdvancePaymentRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalAdvancePaid = sortedPaymentRecords.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  const amountDue = grandTotal - totalAdvancePaid;
  const showPaidBadge = grandTotal > 0 && amountDue <= 0.01;

  const formatDateFull = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day} ${month}, ${year} at ${time}`;
    } catch (e) {
      return dateStr;
    }
  };

  const numItems = Array.isArray(order.orderItems) ? order.orderItems.length : 0;
  const numPayments = sortedPaymentRecords.length;
  const hasNotes = !!order.orderNotes;
  const totalItemCount = numItems + numPayments;

  // Layout sizing based on content density to fit exactly on a single page
  let baseFontSize = 9;
  let cellFontSize = 8.5;
  let headerFontSize = 8;
  let titleFontSize = 11;
  let logoWidth = 120;
  let cardPadding = 12;
  let itemPadding = 8;
  let marginTopNormal = 15;
  let marginTopSmall = 10;
  let notePadding = 8;
  let barcodeHeight = 30;
  let barcodeWidth = 140;
  let itemRowHeight = 24;
  let paymentRowHeight = 20;

  if (totalItemCount > 8 || (totalItemCount > 5 && hasNotes)) {
    // Ultra-compact
    baseFontSize = 7.2;
    cellFontSize = 6.8;
    headerFontSize = 6;
    titleFontSize = 9;
    logoWidth = 85;
    cardPadding = 6;
    itemPadding = 4;
    marginTopNormal = 8;
    marginTopSmall = 5;
    notePadding = 4;
    barcodeHeight = 20;
    barcodeWidth = 110;
    itemRowHeight = 15;
    paymentRowHeight = 13;
  } else if (totalItemCount > 4 || (totalItemCount > 2 && hasNotes)) {
    // Compact
    baseFontSize = 8.2;
    cellFontSize = 7.8;
    headerFontSize = 7;
    titleFontSize = 10;
    logoWidth = 105;
    cardPadding = 9;
    itemPadding = 6;
    marginTopNormal = 11;
    marginTopSmall = 7;
    notePadding = 6;
    barcodeHeight = 25;
    barcodeWidth = 125;
    itemRowHeight = 19;
    paymentRowHeight = 16;
  }

  // Calculate dynamic page height to force single-page display.
  // Standard A4 width is 595.28 pt, standard A4 height is 841.89 pt.
  const baseFixedHeights = 310 + cardPadding * 2 + marginTopNormal * 2;
  const notesHeight = hasNotes ? (notePadding * 2 + baseFontSize * 2 + marginTopNormal) : 0;
  const itemsTableHeight = 22 + numItems * itemRowHeight;
  const paymentsTableHeight = numPayments > 0 ? (22 + numPayments * paymentRowHeight + marginTopNormal) : 0;
  const estimatedContentHeight = baseFixedHeights + notesHeight + itemsTableHeight + paymentsTableHeight;

  // Standard A4 height is 841.89. Grow page height dynamically if content overflows.
  const pageHeight = Math.max(841.89, estimatedContentHeight + 35);

  return (
    <Page size={[595.28, pageHeight]} style={styles.page}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src="/logo.png" style={[styles.logo, { width: logoWidth }]} />
            <Text style={[styles.companyAddress, { fontSize: baseFontSize - 1 }]}>
              House No. 14, Road No. A, Block A, Sontek Area, South Kajla, Jatrabari, Dhaka - 1236
            </Text>
            <Text style={[styles.companyAddress, { marginTop: 2, fontSize: baseFontSize - 1 }]}>
              colorhut.official@gmail.com | +8801919-760626
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerRightTop}>
              <Text style={[styles.invoiceNo, { fontSize: titleFontSize + 1 }]}>Invoice #: {order.id}</Text>
              <Text style={[styles.dateText, { fontSize: baseFontSize - 1 }]}>Order Date: {formatDateFull(order.createdAt)}</Text>
            </View>
            <Barcode value={order.id} width={barcodeWidth} height={barcodeHeight} />
          </View>
        </View>

        {/* Bill To Info */}
        <View style={styles.billingAndRepContainer}>
          <View style={[styles.billToSection, { padding: cardPadding }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <BuildingIcon />
              <Text style={[styles.billToLabel, { marginLeft: 2, marginBottom: 0, fontSize: baseFontSize - 1 }]}>BILL TO:</Text>
            </View>
            <Text style={[styles.billToText, { fontWeight: 'bold', fontSize: baseFontSize + 1.5, marginBottom: marginTopSmall - 5 > 2 ? marginTopSmall - 5 : 2 }]}>{order.companyName}</Text>
            <View style={styles.billToItem}>
              <MapPinIcon />
              <Text style={[styles.billToText, { marginLeft: 2, fontSize: baseFontSize }]}>{order.address}</Text>
            </View>
            <View style={styles.billToItem}>
              <PhoneIcon />
              <Text style={[styles.billToText, { marginLeft: 2, fontSize: baseFontSize }]}>{order.phoneNumber}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: marginTopNormal, marginBottom: marginTopSmall }}>
          <Text style={[styles.sectionTitle, { fontSize: titleFontSize, marginTop: 0, marginBottom: 0 }]}>Order Items</Text>
        </View>
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colModel}><Text style={[styles.tableHeaderText, { fontSize: headerFontSize }]}>MODEL</Text></View>
            <View style={styles.colQty}><Text style={[styles.tableHeaderText, { textAlign: 'center', fontSize: headerFontSize }]}>QUANTITY</Text></View>
            <View style={styles.colLam}><Text style={[styles.tableHeaderText, { fontSize: headerFontSize }]}>LAMINATION</Text></View>
            <View style={styles.colPrice}><Text style={[styles.tableHeaderText, { textAlign: 'right', fontSize: headerFontSize }]}>UNIT PRICE</Text></View>
            <View style={styles.colTotal}><Text style={[styles.tableHeaderText, { textAlign: 'right', fontSize: headerFontSize }]}>TOTAL PRICE</Text></View>
          </View>

          {Array.isArray(order.orderItems) && order.orderItems.map((item, index) => (
            <View key={index} style={[styles.tableRow, { paddingVertical: itemPadding }]}>
              <View style={styles.colModel}><Text style={[styles.tableCell, { fontWeight: 'bold', fontSize: cellFontSize }]}>{item.unit ? `${item.unit} • ` : ''}{item.model}{(item.variation || (item.lamination && item.lamination !== 'None' && item.lamination !== 'N/A' ? item.lamination : '')) ? ` — ${item.variation || item.lamination}` : ''}</Text></View>
              <View style={styles.colQty}><Text style={[styles.tableCell, { fontSize: cellFontSize }]}>{item.quantity}</Text></View>
              <View style={styles.colLam}><Text style={[styles.tableCell, { fontSize: cellFontSize }]}>{item.lamination || 'None'}</Text></View>
              <View style={styles.colPrice}><Text style={[styles.tableCell, { fontSize: cellFontSize }]}>BDT {Number(item.unitPrice).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text></View>
              <View style={styles.colTotal}>
                {item.isGift ? (
                  <Text style={[styles.tableCell, { fontWeight: 'bold', fontSize: cellFontSize }]}>
                    <Text style={{ textDecoration: 'line-through', color: '#6B7280' }}>
                      BDT {Number(item.lineItemTotalPrice).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={{ color: '#334155' }}> (Gift)</Text>
                  </Text>
                ) : (
                  <Text style={[styles.tableCell, { fontWeight: 'bold', fontSize: cellFontSize }]}>
                    BDT {Number(item.lineItemTotalPrice).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Notes Section */}
        {order.orderNotes && (
          <View style={[styles.noteWrapper, { marginTop: marginTopNormal }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <StickyNoteIcon />
              <Text style={[styles.noteHeading, { marginBottom: 0, fontSize: titleFontSize - 0.5 }]}>Order Notes:</Text>
            </View>
            <View style={[styles.noteCard, { paddingHorizontal: notePadding + 2, paddingVertical: notePadding }]}>
              <Text style={[styles.noteText, { fontSize: baseFontSize - 1 }]}>{order.orderNotes}</Text>
            </View>
          </View>
        )}

        {/* Payments History Table */}
        {sortedPaymentRecords.length > 0 && (
          <View style={{ marginTop: marginTopNormal }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <ReceiptTextIcon />
              <Text style={[styles.sectionTitle, { fontSize: titleFontSize, marginTop: 0, marginBottom: 0 }]}>Payments History</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={styles.colPayDate}><Text style={[styles.tableHeaderText, { fontSize: headerFontSize }]}>Date</Text></View>
                <View style={styles.colPayAmount}><Text style={[styles.tableHeaderText, { fontSize: headerFontSize }]}>Amount</Text></View>
                <View style={styles.colPayMethod}><Text style={[styles.tableHeaderText, { fontSize: headerFontSize }]}>Method</Text></View>
                <View style={styles.colPayNotes}><Text style={[styles.tableHeaderText, { fontSize: headerFontSize }]}>Notes</Text></View>
                <View style={styles.colPayBy}><Text style={[styles.tableHeaderText, { fontSize: headerFontSize }]}>Recorded By</Text></View>
              </View>

              {sortedPaymentRecords.map((record, index) => (
                <View key={index} style={[styles.tableRow, { paddingVertical: itemPadding - 1 > 3 ? itemPadding - 1 : 3 }]}>
                  <View style={styles.colPayDate}><Text style={[styles.tableCell, { fontSize: cellFontSize }]}>{formatDateFull(record.date)}</Text></View>
                  <View style={styles.colPayAmount}><Text style={[styles.tableCell, { fontWeight: 'bold', color: '#16A34A', fontSize: cellFontSize }]}>BDT {Number(record.amount).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text></View>
                  <View style={styles.colPayMethod}><Text style={[styles.tableCell, { fontSize: cellFontSize }]}>{record.paymentMethod || 'N/A'}</Text></View>
                  <View style={styles.colPayNotes}><Text style={[styles.tableCell, { color: '#64748B', fontSize: cellFontSize }]}>{record.notes || 'N/A'}</Text></View>
                  <View style={styles.colPayBy}><Text style={[styles.tableCell, { color: '#64748B', fontSize: cellFontSize }]}>{record.recordedByUserName || 'N/A'}</Text></View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Summary Section */}
        <View style={[styles.summarySection, { marginTop: marginTopNormal }]}>
          <View style={{ position: 'relative', width: 200 }}>
            {showPaidBadge && (
              <Image src="/paid-stamp.png" style={styles.stamp} />
            )}
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontSize: baseFontSize }]}>Order Items Total:</Text>
              <Text style={[styles.summaryValue, { fontSize: baseFontSize }]}>BDT {orderSubtotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
            </View>
            
            {giftTotal > 0 && (
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <GiftIcon />
                  <Text style={[styles.summaryLabel, { color: '#CA8A04', fontSize: baseFontSize }]}>Gift Value:</Text>
                </View>
                <Text style={[styles.giftValue, { fontSize: baseFontSize }]}>BDT {giftTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}
            
            {effectiveDiscount > 0 && (
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.percentIcon, { fontSize: baseFontSize }]}>%</Text>
                  <Text style={[styles.summaryLabel, { color: '#EF4444', fontSize: baseFontSize }]}>Special Client Discount:</Text>
                </View>
                <Text style={[styles.discountValue, { fontSize: baseFontSize }]}>
                  - BDT {effectiveDiscount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}

            <View style={styles.netPayableRow}>
              <Text style={[styles.summaryLabel, { fontWeight: 'bold', fontSize: baseFontSize }]}>Net Payable:</Text>
              <Text style={[styles.summaryValue, { fontSize: baseFontSize }]}>BDT {netPayable.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
            </View>

            {shippingCharge <= 0 && (
              <View style={[styles.summaryRow, { marginTop: -2, marginBottom: 4 }]}>
                <Text style={{ fontSize: baseFontSize - 2, fontWeight: 'semibold', color: '#94A3B8', width: '100%', textAlign: 'right' }}>
                  (Excluding delivery charge)
                </Text>
              </View>
            )}

            {shippingCharge > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: baseFontSize }]}>Shipping Charge:</Text>
                <Text style={[styles.summaryValue, { fontSize: baseFontSize }]}>+ BDT {shippingCharge.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}

            {totalAdvancePaid > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: baseFontSize }]}>{showPaidBadge ? "Total Paid:" : "Total Advance Paid:"}</Text>
                <Text style={[styles.summaryValue, { color: '#16A34A', fontSize: baseFontSize }]}>- BDT {totalAdvancePaid.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}

            {!showPaidBadge && amountDue > 0.01 && (
              <View style={styles.amountDueRow}>
                <Text style={[styles.amountDueLabel, { fontSize: titleFontSize }]}>Amount Due:</Text>
                <Text style={[styles.amountDueValue, { fontSize: titleFontSize }]}>BDT {amountDue.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer Note */}
        <View style={{ marginTop: 'auto', paddingTop: 6 }}>
           <Text style={{ fontSize: 7, color: '#94A3B8', textAlign: 'center' }}>
             This is a system generated invoice by Color Hut ERP.
           </Text>
        </View>
      </View>
    </Page>
  );
};

interface InvoicePDFProps {
  orders: TrackingLink[];
}

export const InvoicePDF = ({ orders }: InvoicePDFProps) => {
  return (
    <Document>
      {orders.map((order) => (
        <InvoicePage key={order.id} order={order} />
      ))}
    </Document>
  );
};
