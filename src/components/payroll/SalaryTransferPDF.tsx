
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Svg, Path, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Employee } from '@/types';

const MapPinIcon = ({ color = "#dc2626" }) => (
  <Svg width="10" height="10" viewBox="0 0 24 24">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={color} />
  </Svg>
);

const PhoneIcon = ({ color = "white" }) => (
  <Svg width="8" height="8" viewBox="0 0 24 24">
    <Path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill={color} />
  </Svg>
);

const EmailIcon = ({ color = "white" }) => (
  <Svg width="8" height="8" viewBox="0 0 24 24">
    <Path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill={color} />
  </Svg>
);

const FacebookIcon = ({ color = "white" }) => (
  <Svg width="8" height="8" viewBox="0 0 24 24">
    <Path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m13 2h-2.5A3.5 3.5 0 0 0 12 8.5V11h-2v3h2v7h3v-7h3v-3h-3V9a1 1 0 0 1 1-1h2V5z" fill={color} />
  </Svg>
);

const GlobeIcon = ({ color = "white" }) => (
  <Svg width="8" height="8" viewBox="0 0 24 24">
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill={color} />
  </Svg>
);

const styles = StyleSheet.create({
  page: {
    paddingTop: 65,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  pdfHeader: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBlackBox: {
    backgroundColor: '#000000',
    width: 80,
    height: 28,
  },
  headerLogoSection: {
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 140,
    height: 'auto',
  },
  headerRedBar: {
    backgroundColor: '#dc2626',
    flex: 1,
    height: 28,
  },
  header: {
    textAlign: 'center',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 9,
    color: '#ef4444', // text-red-500
    marginBottom: 5,
  },
  titleSection: {
    borderTop: '1pt solid #ccc',
    borderBottom: '1pt solid #ccc',
    paddingVertical: 6,
    marginTop: 5,
    marginBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontWeight: 'bold',
  },
  month: {
    color: '#dc2626', // text-red-600
    fontWeight: 'bold',
  },
  bankInfo: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffedd5',
    borderBottom: '1pt solid #ccc',
    borderTop: '1pt solid #ccc',
    minHeight: 25,
    alignItems: 'stretch',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ccc',
    minHeight: 25,
    alignItems: 'stretch',
  },
  tableCell: {
    padding: 4,
    borderLeft: '1pt solid #ccc',
    fontSize: 8.5,
    justifyContent: 'center',
  },
  tableCellLast: {
    padding: 4,
    borderLeft: '1pt solid #ccc',
    borderRight: '1pt solid #ccc',
    fontSize: 8.5,
    justifyContent: 'center',
  },
  cellSl: { width: '5%', textAlign: 'center' },
  cellId: { width: '13%' },
  cellName: { width: '24%' },
  cellDesignation: { width: '24%' },
  cellAccount: { width: '24%' },
  cellAmount: { width: '10%', textAlign: 'right' },
  headerText: {
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ccc',
    minHeight: 25,
    alignItems: 'stretch',
    backgroundColor: '#f9fafb',
  },
  footerLabelCell: {
    width: '90%',
    padding: 4,
    borderLeft: '1pt solid #ccc',
    justifyContent: 'center',
    textAlign: 'right',
  },
  footerValueCell: {
    width: '10%',
    padding: 4,
    borderLeft: '1pt solid #ccc',
    borderRight: '1pt solid #ccc',
    justifyContent: 'center',
    textAlign: 'right',
  },
  pdfFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerBlackBar: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  footerInfoText: {
    color: '#FFFFFF',
    fontSize: 8,
    marginLeft: 4,
  },
  footerRedBar: {
    backgroundColor: '#dc2626',
    height: 12,
  },
});

interface SalaryTransferPDFProps {
  data: (Employee & { payableAmount: number })[];
  selectedDate: Date;
  totalAmount: number;
}

export const SalaryTransferPDF = ({ data, selectedDate, totalAmount }: SalaryTransferPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.pdfHeader} fixed>
        <View style={styles.headerBlackBox} />
        <View style={styles.headerLogoSection}>
          <Image src="/logo.png" style={styles.logoImage} />
        </View>
        <View style={styles.headerRedBar} />
      </View>

      <View style={styles.header}>
        <Text style={styles.companyName}>COMPANY NAME: COLOR HUT</Text>
        <Text style={styles.companyAddress}>
          House No. 14, Road No. A, Block A, Sontek Area, South Kajla, Jatrabari, Dhaka - 1236
        </Text>
      </View>

      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Salary Transfer To Bank</Text>
          <Text>Salary Month : <Text style={styles.month}>{format(selectedDate, 'MMMM yyyy')}</Text></Text>
        </View>
        <View style={{ marginTop: 2 }}>
          <Text>Bank Name : <Text style={styles.bankInfo}>UNITED COMM. BANK (A/C 0872101000007053)</Text></Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={[styles.tableCell, styles.cellSl]}><Text style={styles.headerText}>Sl. No.</Text></View>
          <View style={[styles.tableCell, styles.cellId]}><Text style={styles.headerText}>ID No.</Text></View>
          <View style={[styles.tableCell, styles.cellName]}><Text style={styles.headerText}>Name of the Employees</Text></View>
          <View style={[styles.tableCell, styles.cellDesignation]}><Text style={styles.headerText}>Designation</Text></View>
          <View style={[styles.tableCell, styles.cellAccount]}><Text style={styles.headerText}>Accounts No.</Text></View>
          <View style={[styles.tableCellLast, styles.cellAmount]}><Text style={styles.headerText}>Amount</Text></View>
        </View>

        {data.map((employee, index) => (
          <View key={employee.id} style={styles.tableRow}>
            <View style={[styles.tableCell, styles.cellSl]}><Text>{index + 1}</Text></View>
            <View style={[styles.tableCell, styles.cellId]}><Text>{employee.nationalId || 'N/A'}</Text></View>
            <View style={[styles.tableCell, styles.cellName]}><Text>{employee.name}</Text></View>
            <View style={[styles.tableCell, styles.cellDesignation]}><Text>{employee.designation}</Text></View>
            <View style={[styles.tableCell, styles.cellAccount]}><Text>{employee.accountNo || 'N/A'}</Text></View>
            <View style={[styles.tableCellLast, styles.cellAmount]}><Text>{Math.floor(employee.payableAmount).toLocaleString()}</Text></View>
          </View>
        ))}

        {/* Empty rows to maintain 10 rows minimum if needed, though usually PDF only shows real data */}

        <View style={styles.footerRow}>
          <View style={styles.footerLabelCell}>
            <Text style={styles.headerText}>Grand Total:</Text>
          </View>
          <View style={styles.footerValueCell}>
            <Text style={styles.headerText}>{Math.floor(totalAmount).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.pdfFooter} fixed>
        <View style={styles.footerBlackBar}>
          <View style={styles.footerInfoItem}>
            <PhoneIcon />
            <Text style={styles.footerInfoText}>01919-760626</Text>
          </View>
          <View style={styles.footerInfoItem}>
            <EmailIcon />
            <Text style={styles.footerInfoText}>colorhut.official@gmail.com</Text>
          </View>
          <View style={styles.footerInfoItem}>
            <FacebookIcon />
            <Text style={styles.footerInfoText}>colorhut</Text>
          </View>
          <View style={styles.footerInfoItem}>
            <GlobeIcon />
            <Text style={styles.footerInfoText}>colorhut.xyz</Text>
          </View>
        </View>
        <View style={styles.footerRedBar} />
      </View>
    </Page>
  </Document>
);
