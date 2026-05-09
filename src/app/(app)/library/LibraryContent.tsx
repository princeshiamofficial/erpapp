"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  Book,
  CreditCard,
  Folder,
  Lightbulb,
  Newspaper,
  Package,
  Pin,
  UtensilsCrossed
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import * as data from './data';
import { LibraryPDF } from '@/components/library/LibraryPDF';

// Use React.lazy for PDFDownloadLink to avoid SSR issues
const PDFDownloadLink = React.lazy(() => import('@react-pdf/renderer').then(mod => ({ default: mod.PDFDownloadLink })));

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}

const Section = ({ title, icon, children, delay = 0 }: SectionProps) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="mb-12"
  >
    <div className="flex items-center gap-3 mb-6 border-b-2 border-orange-400 pb-3">
      <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
    </div>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  </motion.section>
);

const TableHead = ({ headers }: { headers: string[] }) => (
  <thead className="bg-gradient-to-r from-orange-400 to-orange-600 text-white">
    <tr>
      {headers.map((header, i) => (
        <th key={i} className="py-4 px-6 text-left text-sm font-semibold capitalize tracking-wider whitespace-nowrap">
          {header}
        </th>
      ))}
    </tr>
  </thead>
);

const TableRow = ({ children, index }: { children: React.ReactNode, index: number }) => (
  <tr className={cn(
    "hover:bg-orange-50/50 transition-colors duration-200",
    index % 2 === 1 ? "bg-gray-50/50" : "bg-white"
  )}>
    {children}
  </tr>
);

const Cell = ({ children, className, isBold = false }: { children: React.ReactNode, className?: string, isBold?: boolean }) => (
  <td className={cn("py-4 px-6 text-sm leading-relaxed whitespace-nowrap", isBold ? "font-semibold text-gray-900" : "text-gray-600", className)}>
    {children}
  </td>
);

const PriceCell = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <td className={cn("py-4 px-6 text-sm font-medium text-gray-700 whitespace-nowrap", className)}>
    {children}
  </td>
);

export function LibraryContent() {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
      <div className="flex justify-end mb-8">
        {isClient && (
          <React.Suspense fallback={<div className="h-10 w-40 bg-gray-100 animate-pulse rounded-full" />}>
            <PDFDownloadLink
              document={
                <LibraryPDF 
                  sections={[
                    { title: "Menu Book", headers: ["Product", "Details", "Order Rules / Notes", "Design Charge", "Unit Price", "With Design"], data: data.MENU_BOOK_DATA },
                    { title: "Menu Card", headers: ["Product", "Details", "Order Rules / Notes", "Design Charge", "Unit Price", "With Design"], data: data.MENU_CARD_DATA },
                    { title: "Only Cover / Bill Folder", headers: ["Product", "Details", "Order Rules / Notes", "Logo / Design Charge", "Unit Price", "With Logo"], data: data.COVER_BILL_DATA },
                    { title: "Visiting Card", headers: ["Product", "Details", "Order Rules / Notes", "Price"], data: data.VISITING_CARD_DATA },
                    { title: "Banner / Sticker", headers: ["Product", "Details", "Order Rules / Notes", "Price"], data: data.BANNER_STICKER_DATA },
                    { title: "Leaflet / Bushier", headers: ["Product", "Details", "Order Rules / Notes", "Price"], data: data.LEAFLET_BUSHIER_DATA },
                    { title: "Lighting Board", headers: ["Product", "Details", "Order Rules / Notes", "Unit Price"], data: data.LIGHTING_BOARD_DATA },
                    { title: "Readymade Boxes", headers: ["Product", "Details", "Order Rules / Notes", "Unit Price"], data: data.READYMADE_BOXES_DATA },
                    { title: "Customized Boxes", headers: ["Product", "Details", "Order Rules / Notes", "Unit Price"], data: data.CUSTOMIZED_BOXES_DATA },
                  ]} 
                />
              }
              fileName="Color-Hut-Product-Knowledge.pdf"
            >
              {({ loading }: { loading: boolean }) => (
                <button
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-full font-semibold shadow-lg hover:bg-orange-700 transition-all active:scale-95",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Download className="w-4 h-4" />
                  {loading ? "Preparing PDF..." : "Download Full PDF"}
                </button>
              )}
            </PDFDownloadLink>
          </React.Suspense>
        )}
      </div>

      {/* Menu Book Section */}
      <Section title="Menu Book" icon={<Book className="w-6 h-6" />} delay={0.1}>
        <table className="min-w-full divide-y divide-gray-200">
          <TableHead headers={["Product", "Details", "Order Rules / Notes", "Design Charge", "Unit Price", "With Design"]} />
          <tbody className="divide-y divide-gray-100">
            {data.MENU_BOOK_DATA.map((row, i) => (
              <TableRow key={i} index={i}>
                <Cell isBold>{row[0]}</Cell>
                <Cell>{row[1]}</Cell>
                <Cell>{row[2]}</Cell>
                <Cell className="font-medium text-gray-700">{row[3]}</Cell>
                <PriceCell>{row[4]}</PriceCell>
                <PriceCell>{row[5]}</PriceCell>
              </TableRow>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Menu Card Section */}
      <Section title="Menu Card" icon={<UtensilsCrossed className="w-6 h-6" />} delay={0.2}>
        <table className="min-w-full divide-y divide-gray-200">
          <TableHead headers={["Product", "Details", "Order Rules / Notes", "Design Charge", "Unit Price", "With Design"]} />
          <tbody className="divide-y divide-gray-100">
            {data.MENU_CARD_DATA.map((row, i) => (
              <TableRow key={i} index={i}>
                <Cell isBold>{row[0]}</Cell>
                <Cell>{row[1]}</Cell>
                <Cell>{row[2]}</Cell>
                <Cell className="font-medium text-gray-700">{row[3]}</Cell>
                <PriceCell>{row[4]}</PriceCell>
                <PriceCell>{row[5]}</PriceCell>
              </TableRow>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Only Cover / Bill Folder Section */}
      <Section title="Only Cover / Bill Folder" icon={<Folder className="w-6 h-6" />} delay={0.3}>
        <table className="min-w-full divide-y divide-gray-200">
          <TableHead headers={["Product", "Details", "Order Rules / Notes", "Logo / Design Charge", "Unit Price", "With Logo"]} />
          <tbody className="divide-y divide-gray-100">
            {data.COVER_BILL_DATA.map((row, i) => (
              <TableRow key={i} index={i}>
                <Cell isBold>{row[0]}</Cell>
                <Cell>{row[1]}</Cell>
                <Cell>{row[2]}</Cell>
                <Cell className="font-medium text-gray-700">{row[3]}</Cell>
                <PriceCell>{row[4]}</PriceCell>
                <PriceCell>{row[5]}</PriceCell>
              </TableRow>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Visiting Card Section */}
      <Section title="Visiting Card / Membership Card" icon={<CreditCard className="w-6 h-6" />} delay={0.4}>
        <table className="min-w-full divide-y divide-gray-200">
          <TableHead headers={["Product", "Details", "Order Rules / Notes", "Price"]} />
          <tbody className="divide-y divide-gray-100">
            {data.VISITING_CARD_DATA.map((row, i) => (
              <TableRow key={i} index={i}>
                <Cell isBold>{row[0]}</Cell>
                <Cell>{row[1]}</Cell>
                <Cell>{row[2]}</Cell>
                <PriceCell>{row[3]}</PriceCell>
              </TableRow>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Banner / Sticker Section */}
      <Section title="X Banner / Banner / Sticker" icon={<Pin className="w-6 h-6" />} delay={0.5}>
        <table className="min-w-full divide-y divide-gray-200">
          <TableHead headers={["Product", "Details", "Order Rules / Notes", "Price"]} />
          <tbody className="divide-y divide-gray-100">
            {data.BANNER_STICKER_DATA.map((row, i) => (
              <TableRow key={i} index={i}>
                <Cell isBold>{row[0]}</Cell>
                <Cell>{row[1]}</Cell>
                <Cell>{row[2]}</Cell>
                <PriceCell>{row[3]}</PriceCell>
              </TableRow>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Leaflet Section */}
      <Section title="Leaflet / Bushier" icon={<Newspaper className="w-6 h-6" />} delay={0.6}>
        <table className="min-w-full divide-y divide-gray-200">
          <TableHead headers={["Product", "Details", "Order Rules / Notes", "Price"]} />
          <tbody className="divide-y divide-gray-100">
            {data.LEAFLET_BUSHIER_DATA.map((row, i) => (
              <TableRow key={i} index={i}>
                <Cell isBold>{row[0]}</Cell>
                <Cell>{row[1]}</Cell>
                <Cell>{row[2]}</Cell>
                <PriceCell>{row[3]}</PriceCell>
              </TableRow>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Lighting Board Section */}
      <Section title="Wall & Stand Lighting Board" icon={<Lightbulb className="w-6 h-6" />} delay={0.7}>
        <table className="min-w-full divide-y divide-gray-200">
          <TableHead headers={["Product", "Details", "Order Rules / Notes", "Unit Price"]} />
          <tbody className="divide-y divide-gray-100">
            {data.LIGHTING_BOARD_DATA.map((row, i) => (
              <TableRow key={i} index={i}>
                <Cell isBold>{row[0]}</Cell>
                <Cell>{row[1]}</Cell>
                <Cell>{row[2]}</Cell>
                <PriceCell>{row[3]}</PriceCell>
              </TableRow>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Packaging Box Section */}
      <Section title="Packaging Box" icon={<Package className="w-6 h-6" />} delay={0.8}>
        <div className="p-6 space-y-10">
          <div>
            <h3 className="text-xl font-bold mb-5 text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Readymade Boxes
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Unit Price"]} />
                <tbody className="divide-y divide-gray-100">
                  {data.READYMADE_BOXES_DATA.map((row, i) => (
                    <TableRow key={i} index={i}>
                      <Cell isBold>{row[0]}</Cell>
                      <Cell>{row[1]}</Cell>
                      <Cell>{row[2]}</Cell>
                      <PriceCell>{row[3]}</PriceCell>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-5 text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Customized Boxes
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Unit Price"]} />
                <tbody className="divide-y divide-gray-100">
                  {data.CUSTOMIZED_BOXES_DATA.map((row, i) => (
                    <TableRow key={i} index={i}>
                      <Cell isBold>{row[0]}</Cell>
                      <Cell>{row[1]}</Cell>
                      <Cell>{row[2]}</Cell>
                      <PriceCell>{row[3]}</PriceCell>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
