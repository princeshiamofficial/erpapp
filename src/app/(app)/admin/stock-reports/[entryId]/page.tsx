"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, FileText, Building, MapPin, Phone, User, CheckCircle, Clock, XCircle, Package } from 'lucide-react';
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
        <div className="min-h-screen bg-muted/30">
            {/* Navigation and Actions */}
            <div className="container mx-auto px-4 pt-6 max-w-4xl print:hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/admin/stock-reports')}
                        className="w-full sm:w-auto hover:bg-background/80 transition-all font-semibold"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Stock
                    </Button>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={handlePrint}
                            className="flex-1 sm:flex-none bg-background shadow-sm hover:shadow-md transition-all gap-2 h-10 px-4"
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                        <Button
                            onClick={handleDownload}
                            className="flex-1 sm:flex-none bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all gap-2 h-10 px-4"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                    </div>
                </div>
            </div>

            {/* Invoice Content */}
            <div className="container mx-auto p-3 sm:p-6 max-w-4xl">
                <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-card border border-border/40 rounded-xl shadow-2xl print:shadow-none print:border-none print:p-0">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-border/30 print:mb-4 print:pb-4">
                        <div>
                            <h2 className="text-3xl font-bold text-primary mb-2 flex items-center">
                                <FileText className="h-8 w-8 mr-3" /> SELL ENTRY
                            </h2>
                            <div className="mb-2">
                                <NextImage
                                    src="https://i.ibb.co/FFQMvkz/logo-02-01.jpg"
                                    alt="Color Hut Logo"
                                    width={160}
                                    height={40}
                                    priority
                                    className="object-contain rounded-md"
                                />
                            </div>
                            <p className="text-muted-foreground text-sm">House No. 14, Road No. A, Block A, Sontek Area, South Kajla, Jatrabari, Dhaka - 1236</p>
                            <p className="text-muted-foreground text-sm">colorhut.official@gmail.com | +8801919-760626</p>
                            <div className="text-sm text-muted-foreground mt-1.5">
                                Last Updated: {sellEntry.recordedByUserName} {format(new Date(sellEntry.createdAt), 'MMMM d, yyyy \'at\' hh:mm a')}
                            </div>
                        </div>
                        <div className="text-left sm:text-right mt-4 sm:mt-0">
                            <p className="text-lg font-semibold">Entry #: <span className="text-foreground">{sellEntry.entryId}</span></p>
                            <div className="text-sm text-muted-foreground">
                                Date: {format(new Date(sellEntry.createdAt), 'MMMM d, yyyy h:mm a')}
                            </div>
                            <div className="mt-2 flex justify-start sm:justify-end">
                                <svg ref={barcodeRef} className="max-w-full h-auto object-contain" data-ai-hint="barcode scan"></svg>
                            </div>
                        </div>
                    </div>

                    {/* Entry Details Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-4">
                        <div className="space-y-1 p-4 bg-secondary/40 border border-border/20 rounded-lg shadow-sm">
                            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                                <User className="h-4 w-4" /> Recorded:
                            </h4>
                            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                {sellEntry.recordedByUserName}
                            </p>
                            <p className="text-foreground/90 text-sm flex items-start gap-2">
                                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                {format(new Date(sellEntry.createdAt), 'MMM d, yyyy h:mm a')}
                            </p>
                        </div>

                        {sellEntry.approvedByUserName && (
                            <div className="space-y-1 p-4 bg-secondary/40 border border-border/20 rounded-lg shadow-sm">
                                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" /> Approved/Rejected:
                                </h4>
                                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    {sellEntry.approvedByUserName}
                                </p>
                                {sellEntry.approvedAt && (
                                    <p className="text-foreground/90 text-sm flex items-start gap-2">
                                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                        {format(new Date(sellEntry.approvedAt), 'MMM d, yyyy h:mm a')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Items Section */}
                    <div className="mb-6 print:mb-4">
                        <h3 className="text-lg font-semibold mb-3 text-foreground flex items-start">Entry Items</h3>

                        {/* Mobile Items View */}
                        <div className="md:hidden space-y-3">
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

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto rounded-lg border border-border/30 bg-background shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Product</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Quantity</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Status</TableHead>
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
                                                        <div>
                                                            <div className="font-bold">{item.productName}</div>
                                                            {product && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    Current Stock: {product.stockCount || 0}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-lg">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sellEntry.status === 'Approved' ? "bg-green-100 text-green-800" :
                                                        sellEntry.status === 'Rejected' ? "bg-red-100 text-red-800" :
                                                            "bg-amber-100 text-amber-800"
                                                        }`}>
                                                        {sellEntry.status.toUpperCase()}
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
                    <div className="flex justify-end mt-8 pt-6 border-t border-border/30 print:mt-4 print:pt-4 relative min-h-[150px]">
                        {showApprovedStamp && (
                            <div className="absolute left-4 top-4 sm:left-12 sm:top-8 transform -rotate-[20deg]">
                                <NextImage
                                    src="https://colorhutbd.xyz/image/approved-stamp.png"
                                    alt="Approved Stamp"
                                    width={150}
                                    height={150}
                                    className="opacity-80"
                                    unoptimized
                                />
                            </div>
                        )}
                        {showRejectedStamp && (
                            <div className="absolute left-4 top-4 sm:left-12 sm:top-8 transform -rotate-[20deg]">
                                <NextImage
                                    src="https://png.pngtree.com/png-vector/20250205/ourmid/pngtree-red-circular-stamp-rejected-text-distressed-images-png-image_15370676.png"
                                    alt="Rejected Stamp"
                                    width={150}
                                    height={150}
                                    className="opacity-80"
                                    unoptimized
                                />
                            </div>
                        )}

                        <div className="w-full max-w-xs sm:max-w-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-lg font-bold text-primary">Total Quantity:</span>
                                <span className="text-lg font-bold text-primary">{sellEntry.quantity} Units</span>
                            </div>
                            <Separator className="my-2 bg-border/50" />
                            <div className="text-xs text-right text-muted-foreground mt-4">
                                <p>This document is computer generated.</p>
                                <p>Signature is not required.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
