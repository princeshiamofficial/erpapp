
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font, Svg, Path } from '@react-pdf/renderer';
import type { TrackingLink } from '@/types';
import { format, parseISO } from 'date-fns';

// Create a simple barcode component using SVG/Views
const Barcode = ({ value }: { value: string }) => {
  if (!value) return null;
  
  // Using bwip-js API to generate a real Code-128 barcode
  // This ensures a valid, scannable barcode is rendered in the PDF
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(value)}&scale=2&rotate=N&includetext=false`;

  return (
    <View style={{ height: 40, width: 120, alignItems: 'center', justifyContent: 'center' }}>
      <Image 
        src={barcodeUrl} 
        style={{ width: 100, height: 30 }} 
      />
    </View>
  );
};

const UserIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24">
    <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#94A3B8" />
  </Svg>
);

const BuildingIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24">
    <Path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill="#94A3B8" />
  </Svg>
);

const MapPinIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#94A3B8" />
  </Svg>
);

const PhoneIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 24 24">
    <Path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#94A3B8" />
  </Svg>
);

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
  // Main Container with Shadow-like border
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
  quotationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quotationIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  quotationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF8000', // Orange color from screenshot
    letterSpacing: 1,
  },
  logo: {
    width: 120,
    marginBottom: 8,
  },
  companyAddress: {
    fontSize: 8,
    color: '#64748B',
    lineHeight: 1.4,
    maxWidth: 250,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerRightTop: {
    marginBottom: 7,
  },
  quotationNo: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  dateText: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2,
  },
  // Bill To Section
  billToSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    width: '50%',
  },
  billToLabel: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  billToItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  billToIcon: {
    width: 10,
    height: 10,
    marginRight: 8,
    opacity: 0.6,
  },
  billToText: {
    fontSize: 10,
    color: '#1E293B',
    fontWeight: 'medium',
  },
  // Table Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'medium',
    color: '#0F172A',
    marginTop: 15,
    marginBottom: 7,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  // Column Widths
  colModel: { width: '35%' },
  colQty: { width: '12%', textAlign: 'center' },
  colLam: { width: '18%', textAlign: 'center' },
  colPrice: { width: '17%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },

  // Summary Section
  summarySection: {
    marginTop: 30,
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  netPayableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderTopStyle: 'dashed',
    marginTop: 5,
  },
  amountDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 10,
    marginTop: 10,
  },
  amountDueLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF8000',
  },
  amountDueValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF8000',
  },
  discountValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  percentIcon: {
    color: '#EF4444',
    fontSize: 10,
    marginRight: 4,
    fontWeight: 'bold',
  },
  stamp: {
    position: 'absolute',
    left: -130,
    top: 10,
    width: 100,
    height: 100,
    opacity: 0.4,
    transform: 'rotate(-20deg)',
  },
  // Note Section — matches web UI exactly (no icon, "Order Notes:" heading)
  noteWrapper: {
    marginTop: 14,
  },
  noteHeading: {
    fontSize: 14,
    fontWeight: 'medium',
    color: '#0F172A',
    marginBottom: 6,
  },
  noteCard: {
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderStyle: 'solid',
    backgroundColor: '#FFFEF0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteText: {
    fontSize: 9,
    color: '#92400E',
    lineHeight: 1.6,
  },
});

interface QuotationPDFProps {
  quotation: TrackingLink;
}

export const QuotationPDF = ({ quotation }: QuotationPDFProps) => {
  const subtotal = quotation.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
  const discount = quotation.specialClientDiscount || 0;
  const shipping = quotation.shippingCharge || 0;
  const total = subtotal - discount + shipping;

  const totalAdvancePaid = (quotation.advancePayments || []).reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  const amountDue = total - totalAdvancePaid;
  const showPaidBadge = total > 0 && amountDue <= 0.01;
  const showApprovedStamp = quotation.currentStatus === 'Approved';
  const showCanceledStamp = quotation.currentStatus === 'Canceled' || quotation.currentStatus === 'Cancelled';

  const formatDateFull = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy @ hh:mm a');
    } catch (e) {
      return dateStr;
    }
  };

  const contactPerson = (quotation.companyName || '').split(' • ')[0].trim();
  const businessName = (quotation.companyName || '').split(' • ').length > 1 
    ? (quotation.companyName || '').split(' • ').slice(1).join(' • ').trim() 
    : '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image src="/logo.png" style={styles.logo} />
              
              <Text style={styles.companyAddress}>
                House No. 14, Road No. A, Block A, Sontek Area, South Kajla, Jatrabari, Dhaka - 1236
              </Text>
              <Text style={[styles.companyAddress, { marginTop: 2 }]}>
                colorhut.official@gmail.com | +8801919-760626
              </Text>
              <Text style={[styles.companyAddress, { marginTop: 8, color: '#94A3B8' }]}>
                Last Updated: {quotation.crmUserName} {formatDateFull(quotation.updatedAt || quotation.createdAt)}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.headerRightTop}>
                <Text style={styles.quotationNo}>Quotation #: {quotation.id}</Text>
                <Text style={styles.dateText}>Date: {formatDateFull(quotation.createdAt)}</Text>
              </View>
              <Barcode value={quotation.id} />
            </View>
          </View>

          {/* Bill To */}
          <View style={styles.billToSection}>
            <Text style={styles.billToLabel}>BILL TO:</Text>
            <View style={styles.billToItem}>
              <UserIcon />
              <Text style={[styles.billToText, { marginLeft: 8 }]}>{contactPerson}</Text>
            </View>
            {businessName && (
              <View style={styles.billToItem}>
                <BuildingIcon />
                <Text style={[styles.billToText, { marginLeft: 8 }]}>{businessName}</Text>
              </View>
            )}
            <View style={styles.billToItem}>
              <MapPinIcon />
              <Text style={[styles.billToText, { marginLeft: 8 }]}>{quotation.address}</Text>
            </View>
            <View style={styles.billToItem}>
              <PhoneIcon />
              <Text style={[styles.billToText, { marginLeft: 8 }]}>{quotation.phoneNumber}</Text>
            </View>
          </View>

          {/* Items Table */}
          <Text style={styles.sectionTitle}>Quotation Items</Text>
          
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={styles.colModel}><Text style={styles.tableHeaderText}>Model</Text></View>
              <View style={styles.colQty}><Text style={styles.tableHeaderText}>Quantity</Text></View>
              <View style={styles.colLam}><Text style={styles.tableHeaderText}>Lamination</Text></View>
              <View style={styles.colPrice}><Text style={styles.tableHeaderText}>Unit Price</Text></View>
              <View style={styles.colTotal}><Text style={styles.tableHeaderText}>Total Price</Text></View>
            </View>

            {quotation.orderItems.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.colModel}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{item.model}</Text></View>
                <View style={styles.colQty}><Text style={styles.tableCell}>{item.quantity}</Text></View>
                <View style={styles.colLam}><Text style={styles.tableCell}>{item.lamination || 'None'}</Text></View>
                <View style={styles.colPrice}><Text style={styles.tableCell}>BDT {item.unitPrice.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text></View>
                <View style={styles.colTotal}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>BDT {item.lineItemTotalPrice.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text></View>
              </View>
            ))}
          </View>

          {/* Note Section */}
          {quotation.orderNotes && (
            <View style={styles.noteWrapper}>
              <Text style={styles.noteHeading}>Notes</Text>
              <View style={styles.noteCard}>
                <Text style={styles.noteText}>{quotation.orderNotes}</Text>
              </View>
            </View>
          )}

          {/* Summary Section */}
          <View style={styles.summarySection}>
            <View style={{ position: 'relative', width: 200 }}>
              {showCanceledStamp ? (
                <Image src="/cancelled-stamp.png" style={styles.stamp} />
              ) : showApprovedStamp ? (
                <Image src="/approved-stamp.png" style={styles.stamp} />
              ) : showPaidBadge ? (
                <Image src="/paid-stamp.png" style={styles.stamp} />
              ) : null}
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Total:</Text>
                <Text style={styles.summaryValue}>BDT {subtotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
              </View>
              
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.percentIcon}>%</Text>
                    <Text style={styles.summaryLabel}>Special Discount:</Text>
                  </View>
                  <Text style={styles.discountValue}>
                    - BDT {discount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}

              {shipping > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping:</Text>
                  <Text style={styles.summaryValue}>BDT {shipping.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
                </View>
              )}

              <View style={styles.netPayableRow}>
                <Text style={[styles.summaryLabel, { fontWeight: 'bold' }]}>Net Payable:</Text>
                <Text style={styles.summaryValue}>BDT {total.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
              </View>

              {totalAdvancePaid > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Advance Paid:</Text>
                  <Text style={[styles.summaryValue, { color: '#16A34A' }]}>- BDT {totalAdvancePaid.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
                </View>
              )}

              <View style={styles.amountDueRow}>
                <Text style={styles.amountDueLabel}>Amount Due:</Text>
                <Text style={styles.amountDueValue}>BDT {amountDue.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
          </View>

          {/* Footer Note */}
          <View style={{ marginTop: 'auto', paddingTop: 6 }}>
             <Text style={{ fontSize: 7, color: '#94A3B8', textAlign: 'center' }}>
               This is a system generated quotation by Color Hut ERP.
             </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
