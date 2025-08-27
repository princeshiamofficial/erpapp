
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, MapPin, Phone, UserCheck, FileText, StickyNote, Percent, ReceiptText, CheckCircle, Truck } from "lucide-react";
import JsBarcode from 'jsbarcode';
import type { CustomStatus, TrackingLink, User, AdvancePaymentRecord } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { getPackzyDeliveryStatusAction } from '../actions';

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(value);
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Loading date...";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return "Invalid Date";
  }
};


interface InvoiceDetailsClientProps {
  order: TrackingLink;
  allStatuses: CustomStatus[];
  allUsers: User[];
}

export function InvoiceDetailsClient({ order: initialOrder, allStatuses, allUsers }: InvoiceDetailsClientProps) {
  const [order, setOrder] = useState(initialOrder);
  const [isClient, setIsClient] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [packzyDeliveryStatus, setPackzyDeliveryStatus] = useState<string | null>(null);

  useEffect(() => {
    if (barcodeRef.current && order.id) {
      try {
        JsBarcode(barcodeRef.current, order.id, {
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
  }, [order.id]);

  useEffect(() => {
    setIsClient(true);
    setOrder(initialOrder);

    const fetchPackzyStatus = async () => {
      if (initialOrder.packzyTrackingCode) {
        const result = await getPackzyDeliveryStatusAction(initialOrder.packzyTrackingCode);
        if ('delivery_status' in result) {
          setPackzyDeliveryStatus(result.delivery_status);
        } else {
          console.warn("Could not fetch Steadfast status for invoice:", result.error);
        }
      }
    };
    fetchPackzyStatus();

  }, [initialOrder]);
  
  const lastEditedByEntry = order.updatedAt && order.updatedByUserName ? { timestamp: order.updatedAt, changedByUserName: order.updatedByUserName } : null;
  const orderSubtotal = Array.isArray(order.orderItems) ? order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0) : 0;
  const effectiveDiscount = order.specialClientDiscount || 0;
  const netPayable = orderSubtotal - effectiveDiscount;

  const allAdvancePaymentRecords = useMemo(() => {
    const records: AdvancePaymentRecord[] = [];
    if (order.advancePayments && order.advancePayments.length > 0) {
      records.push(...order.advancePayments);
    } else if (order.advancePayment && order.advancePayment > 0) {
      records.push({
        id: 'legacy-advance',
        amount: order.advancePayment,
        date: order.createdAt,
        paymentMethod: order.paymentMethod || "Unknown",
        notes: "Initial advance payment (legacy data).",
        recordedByUserId: order.crmUserId,
        recordedByUserName: order.crmUserName,
      });
    }
    return records.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [order]);

  const totalAdvancePaid = allAdvancePaymentRecords.reduce((sum, record) => sum + record.amount, 0);
  const shippingCharge = order.shippingCharge || 0;
  const grandTotal = netPayable + shippingCharge;
  const amountDue = grandTotal - totalAdvancePaid;

  const isDeliveredByCourier = packzyDeliveryStatus === 'delivered';
  const showPaidBadge = (grandTotal > 0 && amountDue <= 0.01) || isDeliveredByCourier;


  return (
    <div ref={invoiceRef} className="max-w-4xl mx-auto p-6 sm:p-8 bg-card border border-border/40 rounded-xl shadow-2xl print:shadow-none print:border-none print:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-border/30 print:mb-4 print:pb-4">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2 flex items-center"><FileText className="h-8 w-8 mr-3" /> INVOICE</h2>
          <p className="font-bold text-foreground">Color Hut</p>
          <p className="text-muted-foreground text-sm">House No. 14, Road No. A, Block A, Sontek Area, South Kajla, Jatrabari, Dhaka - 1236</p>
          <p className="text-muted-foreground text-sm">colorhut.official@gmail.com | +8801919-760626</p>
          <div className="text-sm text-muted-foreground mt-1.5">{lastEditedByEntry ? (isClient ? <>Last Updated: {lastEditedByEntry.changedByUserName} {formatDate(lastEditedByEntry.timestamp)}</> : <div className="h-4 w-64"><Skeleton className="h-full w-full" /></div>) : (isClient ? `Order Placed: ${formatDate(order.createdAt)} ${order.crmUserName}` : <div className="h-4 w-64"><Skeleton className="h-full w-full" /></div>)}</div>
        </div>
        <div className="text-left sm:text-right mt-4 sm:mt-0">
          <p className="text-lg font-semibold">Invoice #: <span className="text-foreground">{order.id}</span></p>
          <div className="text-sm text-muted-foreground">Date: {isClient ? formatDate(order.createdAt) : <div className="h-4 w-56"><Skeleton className="h-full w-full" /></div>}</div>
          <div className="mt-2"><svg ref={barcodeRef} className="object-contain" data-ai-hint="barcode scan"></svg></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-4">
        <div className="space-y-1 p-4 bg-secondary/40 border border-border/20 rounded-lg shadow-sm">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2"><Building className="h-4 w-4"/>Bill To:</h4>
          <p className="text-lg font-semibold text-foreground">{order.companyName}</p>
          <p className="text-foreground/90 text-sm flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground"/>{order.address}</p>
          <p className="text-foreground/90 text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{order.phoneNumber}</p>
        </div>
        {order.designerRepresentativeName && (<div className="space-y-1 p-4 bg-secondary/40 border border-border/20 rounded-lg shadow-sm print:hidden">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Project Contact:</h4>
          <p className="text-lg font-semibold text-foreground flex items-center"><UserCheck className="h-5 w-5 mr-2 text-green-500" /> {order.designerRepresentativeName}</p>
          <p className="text-muted-foreground text-sm">Assigned Designer Representative</p>
        </div>)}
      </div>

      {Array.isArray(order.orderItems) && order.orderItems.length > 0 && (
          <div className="mb-6 print:mb-4">
            <h3 className="text-lg font-semibold mb-3 text-foreground flex items-start">Order Items</h3>
            <div className="overflow-x-auto rounded-lg border border-border/30 bg-background shadow-sm">
              <Table><TableHeader><TableRow><TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Model</TableHead><TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Quantity</TableHead><TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lamination</TableHead><TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Unit Price</TableHead><TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Total Price</TableHead></TableRow></TableHeader>
                <TableBody>{order.orderItems.map((item, index) => (<TableRow key={item.id || index} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-card-foreground">{item.model}</TableCell><TableCell className="text-center text-card-foreground">{item.quantity}</TableCell><TableCell className="text-card-foreground">{item.lamination}</TableCell><TableCell className="text-right text-card-foreground">{formatCurrency(item.unitPrice)}</TableCell><TableCell className="text-right font-semibold text-card-foreground">{formatCurrency(item.lineItemTotalPrice)}</TableCell>
                </TableRow>))}</TableBody></Table>
            </div>
          </div>
      )}
      
      {order.orderNotes && (<div className="mb-8 print:mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center"><StickyNote className="mr-2 h-5 w-5 text-primary/80"/>Order Notes:</h3>
        <Card className="bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40 shadow-sm"><CardContent className="p-4 text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{order.orderNotes}</CardContent></Card>
      </div>)}

      {allAdvancePaymentRecords.length > 0 && (
        <div className="mb-8 print:mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center"><ReceiptText className="mr-2 h-5 w-5 text-primary/80"/>Payments History</h3>
          <div className="overflow-x-auto rounded-lg border border-border/30 bg-background shadow-sm">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Notes</TableHead><TableHead>Recorded By</TableHead></TableRow></TableHeader>
              <TableBody>
                {allAdvancePaymentRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs text-muted-foreground">{isClient ? formatDate(record.date) : <Skeleton className="h-4 w-24"/>}</TableCell>
                    <TableCell className="font-medium text-green-600">{formatCurrency(record.amount)}</TableCell>
                    <TableCell className="text-card-foreground">{record.paymentMethod || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{record.notes || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{record.recordedByUserName || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-8 pt-6 border-t border-border/30 print:mt-4 print:pt-4">
        <div className="w-full max-w-xs sm:max-w-sm relative">
          <div className="flex justify-between mb-1"><span className="text-md text-muted-foreground">Order Items Total:</span><span className="text-md font-medium text-foreground">{formatCurrency(orderSubtotal)}</span></div>
          {effectiveDiscount > 0 && (<div className="flex justify-between mb-1"><span className="text-md text-muted-foreground flex items-center"><Percent className="h-4 w-4 mr-1 text-red-500"/>Special Client Discount:</span><span className="text-md font-medium text-red-500">- {formatCurrency(effectiveDiscount)}</span></div>)}
          <div className="flex justify-between mb-2 pt-1 border-t border-dashed border-border/40"><span className="text-md font-semibold text-foreground">Net Payable:</span><span className="text-md font-bold text-foreground">{formatCurrency(netPayable)}</span></div>
          
          {shippingCharge > 0 && (
            <div className="flex justify-between mb-2">
              <span className="text-md text-muted-foreground flex items-center"><Truck className="h-4 w-4 mr-1"/>Shipping Charge:</span>
              <span className="text-md font-medium text-foreground">+ {formatCurrency(shippingCharge)}</span>
            </div>
          )}

          {totalAdvancePaid > 0 && (
            <div className="flex justify-between mb-2">
              <span className="text-md text-muted-foreground">Total Advance Paid:</span>
              <span className="font-medium text-green-600">- {formatCurrency(totalAdvancePaid)}</span>
            </div>
          )}

          {showPaidBadge ? (<div className="mt-3 pt-3 border-t border-dashed border-border/40 relative flex justify-end"><div className="absolute -left-8 -top-4 sm:-left-12 sm:-top-6 transform -rotate-[15deg] border-4 border-green-500 text-green-500 font-bold uppercase text-3xl sm:text-4xl px-3 py-1 rounded-md shadow-lg bg-background/80 dark:bg-card/80 backdrop-blur-sm flex items-center gap-2"><CheckCircle className="h-8 w-8"/>PAID</div></div>)
          : (grandTotal > 0 && amountDue > 0.01) && (<><Separator className="my-2 bg-border/50" /><div className="flex justify-between"><span className="text-lg font-bold text-primary">Amount Due:</span><span className="text-lg font-bold text-primary">{formatCurrency(amountDue)}</span></div></>)}
        </div>
      </div>
    </div>
  );
}
