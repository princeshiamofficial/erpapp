
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Svg, Path, Image } from '@react-pdf/renderer';

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
    paddingTop: 70,
    paddingBottom: 60,
    paddingHorizontal: 30,
    fontSize: 9,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottom: '2pt solid #fb923c', // orange-400
    paddingBottom: 4,
    marginBottom: 8,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937', // gray-800
  },
  table: {
    width: '100%',
    border: '1pt solid #e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#ea580c', // orange-600
    color: 'white',
    fontWeight: 'bold',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRowEven: {
    backgroundColor: '#f9fafb',
  },
  cell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  cellBold: {
    fontWeight: 'bold',
    color: '#111827',
  },
  cellText: {
    color: '#4b5563',
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

interface LibraryPDFProps {
  sections: {
    title: string;
    headers: string[];
    data: string[][];
  }[];
}

const Table = ({ headers, data }: { headers: string[], data: string[][] }) => (
  <View style={styles.table}>
    <View style={styles.tableHead}>
      {headers.map((h, i) => (
        <Text key={i} style={[styles.cell, { flex: i === 0 ? 1.5 : 1 }]}>{h}</Text>
      ))}
    </View>
    {data.map((row, rowIndex) => (
      <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 1 ? styles.tableRowEven : {}]}>
        {row.map((cell, cellIndex) => (
          <Text key={cellIndex} style={[styles.cell, cellIndex === 0 ? styles.cellBold : styles.cellText, { flex: cellIndex === 0 ? 1.5 : 1 }]}>
            {cell}
          </Text>
        ))}
      </View>
    ))}
  </View>
);

export const LibraryPDF = ({ sections }: LibraryPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.pdfHeader} fixed>
        <View style={styles.headerBlackBox} />
        <View style={styles.headerLogoSection}>
          <Image src="/logo.png" style={styles.logoImage} />
        </View>
        <View style={styles.headerRedBar} />
      </View>


      {sections.map((section, index) => (
        <View key={index} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <Table headers={section.headers} data={section.data} />
        </View>
      ))}

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
