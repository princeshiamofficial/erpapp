
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Svg, Path, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ea580c', // orange-600
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280', // gray-500
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  logo: {
    width: 120,
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
      {headers.map((h, i) => {
        let flexValue = 1;
        if (i === 0) flexValue = 1.2;
        else if (
          h.toLowerCase().includes('detail') || 
          h.toLowerCase().includes('rule') || 
          h.toLowerCase().includes('note') ||
          h.toLowerCase().includes('charge')
        ) flexValue = 2.5;
        else flexValue = 1;

        return (
          <Text 
            key={i} 
            style={[
              styles.cell, 
              { 
                flex: flexValue,
                fontSize: 7,
                fontWeight: 'bold'
              }
            ]} 
            wrap={false}
          >
            {h}
          </Text>
        );
      })}
    </View>
    {data.map((row, rowIndex) => (
      <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 1 ? styles.tableRowEven : {}]}>
        {row.map((cell, cellIndex) => {
          const h = headers[cellIndex];
          let flexValue = 1;
          if (cellIndex === 0) flexValue = 1.2;
          else if (
            h.toLowerCase().includes('detail') || 
            h.toLowerCase().includes('rule') || 
            h.toLowerCase().includes('note') ||
            h.toLowerCase().includes('charge')
          ) flexValue = 2.5;
          else flexValue = 1;

          return (
            <Text 
              key={cellIndex} 
              style={[
                styles.cell, 
                cellIndex === 0 ? styles.cellBold : styles.cellText, 
                { 
                  flex: flexValue,
                  fontSize: 7
                }
              ]}
            >
              {cell}
            </Text>
          );
        })}
      </View>
    ))}
  </View>
);

export const LibraryPDF = ({ sections }: LibraryPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.logoContainer}>
        <Image src="/logo.png" style={styles.logo} />
        <Text style={styles.title}>Product Knowledge</Text>
      </View>
      <Text style={styles.subtitle}>Standardized pricing and product specifications library</Text>

      {sections.map((section, index) => (
        <View key={index} wrap={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <Table headers={section.headers} data={section.data} />
        </View>
      ))}
    </Page>
  </Document>
);
