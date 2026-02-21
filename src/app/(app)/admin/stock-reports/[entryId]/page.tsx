"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Building, MapPin, Phone, User, CheckCircle, Clock, XCircle, Package } from 'lucide-react';
import { getSellEntries } from '@/lib/sell-entry-service';
import { getStockItems } from '@/lib/stock-service';
import type { SellEntry, ServiceModelItem } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import NextImage from 'next/image';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from "@/components/ui/separator";
import JsBarcode from 'jsbarcode';

export default function SellEntryInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const entryId = params?.entryId as string;
    const barcodeRef = useRef<SVGSVGElement>(null);

    const [sellEntry, setSellEntry] = useState<SellEntry | null>(null);
    const [allProducts, setAllProducts] = useState<ServiceModelItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [entries, products] = await Promise.all([
                    getSellEntries(),
                    getStockItems()
                ]);

                const entry = entries.find(e => e.entryId === entryId);
                if (entry) {
                    setSellEntry(entry);
                    setAllProducts(products);
                }
            } catch (error) {
                console.error("Error fetching sell entry:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [entryId]);

    useEffect(() => {
        if (barcodeRef.current && sellEntry?.entryId) {
            try {
                JsBarcode(barcodeRef.current, sellEntry.entryId, {
                    format: "CODE128",
                    displayValue: false,
                    width: 2,
                    height: 50,
                    margin: 10,
                });
            } catch (e) {
                console.error("JsBarcode error:", e);
            }
        }
    }, [sellEntry]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Skeleton className="h-[800px] w-full" />
            </div>
        );
    }

    if (!sellEntry) {
        return (
            <div className="container mx-auto p-6 max-w-4xl">
                <Card>
                    <CardContent className="p-12 text-center">
                        <h2 className="text-2xl font-bold mb-4">Sell Entry Not Found</h2>
                        <p className="text-muted-foreground mb-6">
                            The sell entry "{entryId}" could not be found.
                        </p>
                        <Button onClick={() => router.push('/admin/stock-reports')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Stock Reports
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const showApprovedStamp = sellEntry.status === 'Approved';
    const showRejectedStamp = sellEntry.status === 'Rejected';

    return (
        <div className="min-h-screen bg-muted/30 print:bg-white print:min-h-0 print:p-0">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: letter;
                        margin: 0;
                    }
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 10mm !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}} />

            {/* Invoice Content */}
            <div className="flex flex-col items-center p-4 sm:p-8 print:p-0">
                {/* Print Toolbar - Screen Only */}
                <div className="w-full max-w-4xl mx-auto p-6 sm:p-8 bg-card border border-border/40 rounded-xl shadow-2xl print:shadow-none print:border-none print:p-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-10 pb-8 border-b border-border/20 print:mb-6 print:pb-6">
                        <div className="flex items-center gap-6">
                            <div className="p-3 bg-primary/5 rounded-2xl print:p-0 print:bg-transparent">
                                <NextImage
                                    src="https://i.ibb.co/FFQMvkz/logo-02-01.jpg"
                                    alt="Color Hut Logo"
                                    width={140}
                                    height={35}
                                    priority
                                    className="object-contain"
                                />
                            </div>
                            <div className="h-10 w-[1px] bg-border/30 hidden sm:block"></div>
                            <div>
                                <h2 className="text-2xl font-light tracking-tight text-foreground/80 uppercase">
                                    Logistics <span className="font-bold text-primary">Invoice</span>
                                </h2>
                                <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-1">Movement of Inventory</p>
                            </div>
                        </div>
                        <div className="text-right mt-6 sm:mt-0 flex flex-col items-end">
                            <div className="bg-primary/5 px-4 py-2 rounded-lg mb-2 print:bg-transparent print:p-0">
                                <span className="text-xs text-muted-foreground uppercase tracking-widest mr-2">Entry ID</span>
                                <span className="text-sm font-bold text-foreground">#{sellEntry.entryId}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {format(new Date(sellEntry.createdAt), 'MMM d, yyyy • h:mm a')}
                            </div>
                        </div>
                    </div>

                    {/* Address & Contacts */}
                    <div className="flex justify-between mb-12 text-[11px] text-muted-foreground/80">
                        <div className="max-w-[250px] leading-relaxed">
                            <p className="font-semibold text-foreground/70 mb-1 uppercase tracking-wider">Company Registered Office</p>
                            <p>House 14, Road A, Block A, Sontek Area</p>
                            <p>South Kajla, Jatrabari, Dhaka - 1236</p>
                            <p className="mt-1">colorhut.official@gmail.com</p>
                            <p>+8801919-760626</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <p className="font-semibold text-foreground/70 mb-1 uppercase tracking-wider">Authentication Details</p>
                            <div className="mt-1 flex flex-col items-end gap-1">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] uppercase tracking-tighter">Recorded:</span>
                                    <span className="text-foreground font-medium">{sellEntry.recordedByUserName}</span>
                                </div>
                                {sellEntry.approvedByUserName && (
                                    <div className="flex gap-2 items-center">
                                        <span className="text-[10px] uppercase tracking-tighter">{sellEntry.status === 'Approved' ? 'Approved' : 'Rejected'}:</span>
                                        <span className="text-foreground font-medium">{sellEntry.approvedByUserName}</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4">
                                <svg ref={barcodeRef} className="h-10 opacity-70" data-ai-hint="barcode scan"></svg>
                            </div>
                        </div>
                    </div>



                    {/* Items Section */}
                    <div className="mb-10">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/40 mb-6 flex items-center gap-3">
                            Inventory Specification
                            <div className="h-[1px] flex-1 bg-border/20"></div>
                        </h3>

                        {/* Mobile Items View - Hidden on Print */}
                        <div className="md:hidden space-y-3 print:hidden">
                            {(sellEntry.items && sellEntry.items.length > 0 ? sellEntry.items : [{ productId: sellEntry.productId || '', productName: sellEntry.productName || 'Unknown', quantity: sellEntry.quantity || 0 }]).map((item, idx) => {
                                const product = allProducts.find(p => p.id === item.productId);
                                return (
                                    <div key={idx} className="p-4 bg-muted/20 border border-border/30 rounded-lg space-y-3 shadow-sm">
                                        <div className="flex gap-3">
                                            {product?.imageUrl ? (
                                                <NextImage
                                                    src={product.imageUrl}
                                                    alt={item.productName || 'Product'}
                                                    width={50}
                                                    height={50}
                                                    unoptimized={true}
                                                    className="rounded-md object-cover h-14 w-14"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                                                    <Package className="h-6 w-6 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-foreground text-sm leading-tight break-words">{item.productName}</div>
                                                {product && (
                                                    <div className="text-[10px] text-muted-foreground mt-1">
                                                        Current Stock: {product.stockCount || 0}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-border/20">
                                            <div className="text-sm font-medium text-muted-foreground">Quantity: <span className="text-foreground font-bold">{item.quantity}</span></div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sellEntry.status === 'Approved' ? "bg-green-100 text-green-800" :
                                                sellEntry.status === 'Rejected' ? "bg-red-100 text-red-800" :
                                                    "bg-amber-100 text-amber-800"
                                                }`}>
                                                {sellEntry.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View - Forced on Print */}
                        <div className="hidden md:block print:block overflow-hidden rounded-xl border border-border/20 bg-background/50">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-b border-border/10">
                                        <TableHead className="text-[10px] uppercase font-bold tracking-widest h-10 px-6">Model Description</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-widest text-center h-10">Units</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-widest text-right h-10 px-6">Verification</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(sellEntry.items && sellEntry.items.length > 0 ? sellEntry.items : [{ productId: sellEntry.productId || '', productName: sellEntry.productName || 'Unknown', quantity: sellEntry.quantity || 0 }]).map((item, idx) => {
                                        const product = allProducts.find(p => p.id === item.productId);
                                        return (
                                            <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-medium text-card-foreground">
                                                    <div className="flex items-center gap-3">
                                                        {product?.imageUrl ? (
                                                            <NextImage
                                                                src={product.imageUrl}
                                                                alt={item.productName || 'Product'}
                                                                width={40}
                                                                height={40}
                                                                unoptimized={true}
                                                                className="rounded-md object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                                                                <span className="text-muted-foreground text-[10px]">No Img</span>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="font-bold text-foreground/90 text-[13px]">{item.productName}</div>
                                                            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">SKU-{item.productId.slice(-6).toUpperCase()}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-foreground/80">{item.quantity}</TableCell>
                                                <TableCell className="text-right px-6">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${sellEntry.status === 'Approved' ? "text-green-600/80 bg-green-500/5" :
                                                        sellEntry.status === 'Rejected' ? "text-red-600/80 bg-red-500/5" :
                                                            "text-amber-600/80 bg-amber-500/5"
                                                        }`}>
                                                        {sellEntry.status}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Footer Stamps and Totals */}
                    <div className="flex justify-between items-end mt-16 print:mt-10 pt-10 border-t border-border/10">
                        <div className="relative">
                            {showApprovedStamp && (
                                <div className="transform -rotate-[15deg] scale-90 opacity-40 grayscale-[0.2]">
                                    <NextImage
                                        src="https://colorhutbd.xyz/image/approved-stamp.png"
                                        alt="Approved Stamp"
                                        width={140}
                                        height={140}
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            )}
                            {showRejectedStamp && (
                                <div className="transform -rotate-[15deg] scale-90 opacity-40">
                                    <NextImage
                                        src="https://png.pngtree.com/png-vector/20250205/ourmid/pngtree-red-circular-stamp-rejected-text-distressed-images-png-image_15370676.png"
                                        alt="Rejected Stamp"
                                        width={140}
                                        height={140}
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-end gap-10">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Cumulative Units</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-light text-foreground">{sellEntry.quantity}</span>
                                    <span className="text-xs font-bold text-primary uppercase tracking-widest">PCS</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className="mb-2">
                                    <NextImage
                                        src="https://i.postimg.cc/MHShWWsQ/owner-signature.png"
                                        alt="Owner Signature"
                                        width={160}
                                        height={50}
                                        unoptimized
                                        className="object-contain mix-blend-multiply opacity-90"
                                    />
                                </div>
                                <div className="flex flex-col items-end">
                                    <p className="text-[9px] font-bold text-foreground/80 uppercase tracking-[0.2em]">Authorized Signature</p>
                                    <div className="h-[2px] w-24 bg-primary/20 mt-1"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
