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
  UtensilsCrossed,
  Download,
  Search,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const filterData = React.useCallback((rows: any[][]) => {
    if (!searchQuery.trim()) return rows;
    const query = searchQuery.toLowerCase().trim();
    return rows.filter(row => 
      row.some(cell => cell && cell.toString().toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const filteredMenuBook = React.useMemo(() => filterData(data.MENU_BOOK_DATA), [filterData]);
  const filteredMenuCard = React.useMemo(() => filterData(data.MENU_CARD_DATA), [filterData]);
  const filteredCoverBill = React.useMemo(() => filterData(data.COVER_BILL_DATA), [filterData]);
  const filteredVisitingCard = React.useMemo(() => filterData(data.VISITING_CARD_DATA), [filterData]);
  const filteredBannerSticker = React.useMemo(() => filterData(data.BANNER_STICKER_DATA), [filterData]);
  const filteredLeafletBushier = React.useMemo(() => filterData(data.LEAFLET_BUSHIER_DATA), [filterData]);
  const filteredLightingBoard = React.useMemo(() => filterData(data.LIGHTING_BOARD_DATA), [filterData]);
  const filteredReadymadeBoxes = React.useMemo(() => filterData(data.READYMADE_BOXES_DATA), [filterData]);
  const filteredCustomizedBoxes = React.useMemo(() => filterData(data.CUSTOMIZED_BOXES_DATA), [filterData]);

  const totalResults = React.useMemo(() => {
    return filteredMenuBook.length + 
           filteredMenuCard.length + 
           filteredCoverBill.length + 
           filteredVisitingCard.length + 
           filteredBannerSticker.length + 
           filteredLeafletBushier.length + 
           filteredLightingBoard.length + 
           filteredReadymadeBoxes.length + 
           filteredCustomizedBoxes.length;
  }, [
    filteredMenuBook, filteredMenuCard, filteredCoverBill, 
    filteredVisitingCard, filteredBannerSticker, filteredLeafletBushier, 
    filteredLightingBoard, filteredReadymadeBoxes, filteredCustomizedBoxes
  ]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-gray-50/80 backdrop-blur-md sticky top-0 z-20 py-4 px-4 border border-gray-150 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products, details, prices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all text-sm text-gray-800 placeholder-gray-400 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4 justify-between w-full sm:w-auto">
          {searchQuery && (
            <span className="text-xs sm:text-sm text-gray-500 font-medium whitespace-nowrap">
              Found {totalResults} {totalResults === 1 ? 'match' : 'matches'}
            </span>
          )}
          
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
                    {loading ? "Preparing PDF..." : "Download"}
                  </button>
                )}
              </PDFDownloadLink>
            </React.Suspense>
          )}
        </div>
      </div>

      {searchQuery && totalResults === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm w-full">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-1">No results found</h3>
          <p className="text-sm text-gray-500 px-4">
            We couldn't find any products matching "{searchQuery}". Try adjusting your search query.
          </p>
        </div>
      ) : (
        <>
          {/* Menu Book Section */}
          {filteredMenuBook.length > 0 && (
            <Section title="Menu Book" icon={<Book className="w-6 h-6" />} delay={0.1}>
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Design Charge", "Unit Price", "With Design"]} />
                <tbody className="divide-y divide-gray-100">
                  {filteredMenuBook.map((row, i) => (
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
          )}

          {/* Menu Card Section */}
          {filteredMenuCard.length > 0 && (
            <Section title="Menu Card" icon={<UtensilsCrossed className="w-6 h-6" />} delay={0.2}>
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Design Charge", "Unit Price", "With Design"]} />
                <tbody className="divide-y divide-gray-100">
                  {filteredMenuCard.map((row, i) => (
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
          )}

          {/* Only Cover / Bill Folder Section */}
          {filteredCoverBill.length > 0 && (
            <Section title="Only Cover / Bill Folder" icon={<Folder className="w-6 h-6" />} delay={0.3}>
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Logo / Design Charge", "Unit Price", "With Logo"]} />
                <tbody className="divide-y divide-gray-100">
                  {filteredCoverBill.map((row, i) => (
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
          )}

          {/* Visiting Card Section */}
          {filteredVisitingCard.length > 0 && (
            <Section title="Visiting Card / Membership Card" icon={<CreditCard className="w-6 h-6" />} delay={0.4}>
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Price"]} />
                <tbody className="divide-y divide-gray-100">
                  {filteredVisitingCard.map((row, i) => (
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
          )}

          {/* Banner / Sticker Section */}
          {filteredBannerSticker.length > 0 && (
            <Section title="X Banner / Banner / Sticker" icon={<Pin className="w-6 h-6" />} delay={0.5}>
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Price"]} />
                <tbody className="divide-y divide-gray-100">
                  {filteredBannerSticker.map((row, i) => (
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
          )}

          {/* Leaflet Section */}
          {filteredLeafletBushier.length > 0 && (
            <Section title="Leaflet / Bushier" icon={<Newspaper className="w-6 h-6" />} delay={0.6}>
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Price"]} />
                <tbody className="divide-y divide-gray-100">
                  {filteredLeafletBushier.map((row, i) => (
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
          )}

          {/* Lighting Board Section */}
          {filteredLightingBoard.length > 0 && (
            <Section title="Wall & Stand Lighting Board" icon={<Lightbulb className="w-6 h-6" />} delay={0.7}>
              <table className="min-w-full divide-y divide-gray-200">
                <TableHead headers={["Product", "Details", "Order Rules / Notes", "Unit Price"]} />
                <tbody className="divide-y divide-gray-100">
                  {filteredLightingBoard.map((row, i) => (
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
          )}

          {/* Packaging Box Section */}
          {(filteredReadymadeBoxes.length > 0 || filteredCustomizedBoxes.length > 0) && (
            <Section title="Packaging Box" icon={<Package className="w-6 h-6" />} delay={0.8}>
              <div className="p-6 space-y-10">
                {filteredReadymadeBoxes.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-5 text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      Readymade Boxes
                    </h3>
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <table className="min-w-full divide-y divide-gray-200">
                        <TableHead headers={["Product", "Details", "Order Rules / Notes", "Unit Price"]} />
                        <tbody className="divide-y divide-gray-100">
                          {filteredReadymadeBoxes.map((row, i) => (
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
                )}

                {filteredCustomizedBoxes.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-5 text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      Customized Boxes
                    </h3>
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <table className="min-w-full divide-y divide-gray-200">
                        <TableHead headers={["Product", "Details", "Order Rules / Notes", "Unit Price"]} />
                        <tbody className="divide-y divide-gray-100">
                          {filteredCustomizedBoxes.map((row, i) => (
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
                )}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
