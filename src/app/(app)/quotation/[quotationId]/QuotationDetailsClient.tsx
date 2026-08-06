
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building, MapPin, Phone, UserCheck, FileText, StickyNote, Percent, ReceiptText, CheckCircle, Truck, User, Gift } from "lucide-react";
import JsBarcode from 'jsbarcode';
import type { CustomStatus, TrackingLink, User as UserType, AdvancePaymentRecord } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/auth-context';

const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Loading date...";
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day} ${month}, ${year} at ${time}`;
  } catch (e) {
    return "Invalid Date";
  }
};


interface QuotationDetailsClientProps {
  quotation: TrackingLink;
  allStatuses: CustomStatus[];
  allUsers: UserType[];
}

export function QuotationDetailsClient({ quotation: initialQuotation, allStatuses, allUsers }: QuotationDetailsClientProps) {
  const { currentUser } = useAuth();
  const isClientViewer = !currentUser || currentUser.role === 'Client';
  const [quotation, setQuotation] = useState(initialQuotation);
  const [isClient, setIsClient] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && quotation.id) {
      try {
        JsBarcode(barcodeRef.current, quotation.id, {
          format: "CODE128",
          displayValue: false,
          width: 1.4,
          height: 30,
          margin: 2,
        });
      } catch (e) {
        console.error("JsBarcode error:", e);
      }
    }
  }, [quotation.id]);

  useEffect(() => {
    setIsClient(true);
    setQuotation(initialQuotation);
  }, [initialQuotation]);

  const lastEditedByEntry = quotation.updatedAt && quotation.updatedByUserName ? { timestamp: quotation.updatedAt, changedByUserName: quotation.updatedByUserName } : null;
  const orderSubtotal = Array.isArray(quotation.orderItems)
    ? quotation.orderItems.reduce((acc, item) => acc + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0)
    : 0;
  const giftTotal = Array.isArray(quotation.orderItems)
    ? quotation.orderItems.reduce((acc, item) => acc + (item.isGift ? (Number(item.lineItemTotalPrice) || 0) : 0), 0)
    : 0;
  const effectiveDiscount = Number(quotation.specialClientDiscount) || 0;
  const netPayable = orderSubtotal - effectiveDiscount;

  const allAdvancePaymentRecords = useMemo(() => {
    const records: AdvancePaymentRecord[] = [];
    if (quotation.advancePayments && quotation.advancePayments.length > 0) {
      records.push(...quotation.advancePayments.map(r => ({ ...r, amount: Number(r.amount) })));
    } else if (quotation.advancePayment && Number(quotation.advancePayment) > 0) {
      records.push({
        id: 'legacy-advance',
        amount: Number(quotation.advancePayment),
        date: quotation.createdAt,
        paymentMethod: quotation.paymentMethod || "Unknown",
        notes: "Initial advance payment (legacy data).",
        recordedByUserId: quotation.crmUserId,
        recordedByUserName: quotation.crmUserName,
      });
    }
    return records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [quotation]);

  const totalAdvancePaid = allAdvancePaymentRecords.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  const shippingCharge = Number(quotation.shippingCharge) || 0;
  const grandTotal = netPayable + shippingCharge;
  const amountDue = grandTotal - totalAdvancePaid;

  const showPaidBadge = grandTotal > 0 && amountDue <= 0.01;
  const showApprovedStamp = quotation.currentStatus === 'Approved';

  const { contactPerson, businessName } = useMemo(() => {
    const parts = (quotation.companyName || '').split(' • ');
    if (parts.length > 1) {
      return { contactPerson: parts[0].trim(), businessName: parts.slice(1).join(' • ').trim() };
    }
    return { contactPerson: quotation.companyName, businessName: '' };
  }, [quotation.companyName]);


  return (
    <>
      <div ref={invoiceRef} className="max-w-4xl mx-auto p-4 sm:p-6 bg-card border border-border/40 rounded-xl shadow-2xl invoice-page print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:bg-transparent print:text-[13px] print:leading-tight">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 pb-4 border-b border-border/30 print:mb-2 print:pb-2 print:border-border/50 print:break-inside-avoid">
          <div>
            <div className="mb-2">
              <Image
                src="/logo.png"
                alt="Color Hut Logo"
                width={160}
                height={40}
                priority
                className="object-contain print:w-32 print:h-auto"
              />
            </div>
            <p className="text-muted-foreground text-xs">House No. 14, Road No. A, Block A, Sontek Area, South Kajla, Jatrabari, Dhaka - 1236</p>
            <p className="text-muted-foreground text-xs">colorhut.official@gmail.com | +8801919-760626</p>
            <div className="text-xs text-muted-foreground mt-1.5">{lastEditedByEntry ? (isClient ? <>Last Updated: {lastEditedByEntry.changedByUserName} {formatDate(lastEditedByEntry.timestamp)}</> : <div className="h-3.5 w-64"><Skeleton className="h-full w-full" /></div>) : (isClient ? `Quotation Placed: ${quotation.crmUserName} on ${formatDate(quotation.createdAt)}` : <div className="h-3.5 w-64"><Skeleton className="h-full w-full" /></div>)}</div>
          </div>
          <div className="text-left sm:text-right mt-4 sm:mt-0">
            <p className="text-base font-semibold">Quotation #: <span className="text-foreground">{quotation.id}</span></p>
            <div className="text-xs text-muted-foreground">Date: {isClient ? formatDate(quotation.createdAt) : <div className="h-3.5 w-56"><Skeleton className="h-full w-full" /></div>}</div>
            <div className="mt-1.5 flex sm:justify-end"><svg ref={barcodeRef} className="object-contain h-[30px] max-w-full" data-ai-hint="barcode scan"></svg></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:mb-2 print:break-inside-avoid">
          <div className="space-y-1 p-3 bg-secondary/40 border border-border/20 rounded-lg shadow-sm print:p-2">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2"><Building className="h-4 w-4" />Bill To:</h4>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{contactPerson}</p>
            {businessName && <p className="text-xs font-medium text-foreground/90 flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" />{businessName}</p>}
            <p className="text-foreground/90 text-sm flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />{quotation.address}</p>
            <p className="text-foreground/90 text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{quotation.phoneNumber}</p>
          </div>
          {(quotation.designerRepresentativeName || quotation.crmUserName) && (
            <div className="space-y-3 p-3 bg-secondary/40 border border-border/20 rounded-lg shadow-sm print:p-2">
              {quotation.crmUserName && (
                <div className="space-y-1">
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CR Manager:</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={quotation.assigneeAvatarUrl || undefined} alt={quotation.crmUserName} />
                      <AvatarFallback className="text-[9px] font-medium bg-primary/10 text-primary">
                        {(quotation.crmUserName || "").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold text-foreground">{quotation.crmUserName}</span>
                  </div>
                </div>
              )}
              {quotation.designerRepresentativeName && (
                <div className="space-y-1">
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Assigned Designer:</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={quotation.designerRepresentativeAvatarUrl || undefined} alt={quotation.designerRepresentativeName} />
                      <AvatarFallback className="text-[9px] font-medium bg-primary/10 text-primary">
                        {(quotation.designerRepresentativeName || "").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold text-foreground">{quotation.designerRepresentativeName}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {Array.isArray(quotation.orderItems) && quotation.orderItems.length > 0 && (
          <div className="mb-6 print:mb-2 print:break-inside-auto">
            <h3 className="text-base font-semibold mb-3 print:mb-1 text-foreground flex items-start">Quotation Items</h3>
            <div className="overflow-x-auto rounded-lg border border-border/30 bg-background shadow-sm">
              <Table><TableHeader><TableRow><TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Model</TableHead><TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Quantity</TableHead><TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lamination</TableHead><TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Unit Price</TableHead><TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Total Price</TableHead></TableRow></TableHeader>
                <TableBody>{quotation.orderItems.map((item, index) => (<TableRow key={item.id || index} className="hover:bg-muted/50 transition-colors print:break-inside-avoid">
                  <TableCell className="font-medium text-card-foreground">{item.unit ? `${item.unit} • ` : ''}{item.model}{item.variation ? ` — ${item.variation}` : ''}</TableCell>
                  <TableCell className="text-center text-card-foreground">{item.quantity}</TableCell>
                  <TableCell className="text-card-foreground">{item.lamination}</TableCell>
                  <TableCell className="text-right text-card-foreground">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-semibold text-card-foreground">
                    <span style={item.isGift ? { textDecoration: 'line-through', textDecorationColor: '#ef4444', color: '#6b7280' } : undefined}>
                      {formatCurrency(item.lineItemTotalPrice)}
                    </span>
                    {item.isGift && " (Gift)"}
                  </TableCell>
                </TableRow>))}</TableBody></Table>
            </div>
          </div>
        )}

        {quotation.orderNotes && (<div className="mb-8 print:mb-2">
          <h3 className="text-base font-semibold text-foreground mb-2 print:mb-1 flex items-center"><StickyNote className="mr-2 h-5 w-5 text-primary/80" />Quotation Notes:</h3>
          <Card className="bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40 shadow-sm"><CardContent className="p-4 print:p-2 text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{quotation.orderNotes}</CardContent></Card>
        </div>)}

        {allAdvancePaymentRecords.length > 0 && (
          <div className="mb-8 print:mb-2">
            <h3 className="text-base font-semibold text-foreground mb-3 print:mb-1 flex items-center"><ReceiptText className="mr-2 h-5 w-5 text-primary/80" />Payments History</h3>
            <div className="overflow-x-auto rounded-lg border border-border/30 bg-background shadow-sm print:shadow-none">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Notes</TableHead><TableHead>Recorded By</TableHead></TableRow></TableHeader>
                <TableBody>
                  {allAdvancePaymentRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{isClient ? formatDate(record.date) : <Skeleton className="h-4 w-24" />}</TableCell>
                      <TableCell className="font-medium text-green-600 print:text-green-700">{formatCurrency(record.amount)}</TableCell>
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

        <div className="flex justify-end mt-6 pt-4 border-t border-border/30 print:mt-2 print:pt-2 print:break-inside-avoid">
          <div className="w-full max-w-xs sm:max-w-sm relative">
            <div className="flex justify-between mb-1"><span className="text-md text-muted-foreground">Order Items Total:</span><span className="text-md font-medium text-foreground">{formatCurrency(orderSubtotal)}</span></div>
            {giftTotal > 0 && (
              <div className="flex justify-between mb-1">
                <span className="text-md text-muted-foreground flex items-center">
                  <Gift className="h-4 w-4 mr-1 text-yellow-500" />
                  Gift Value:
                </span>
                <span className="text-md font-medium text-yellow-500">
                  {formatCurrency(giftTotal)}
                </span>
              </div>
            )}
            {effectiveDiscount > 0 && (<div className="flex justify-between mb-1"><span className="text-md text-muted-foreground flex items-center"><Percent className="h-4 w-4 mr-1 text-red-500" />Special Client Discount:</span><span className="text-md font-medium text-red-500">- {formatCurrency(effectiveDiscount)}</span></div>)}
            <div className="flex justify-between mb-2 pt-1 border-t border-dashed border-border/40"><span className="text-md font-semibold text-foreground">Net Payable:</span><span className="text-md font-bold text-foreground">{formatCurrency(netPayable)}</span></div>
            {shippingCharge <= 0 && (
              <p className="text-sm font-semibold text-muted-foreground mb-2 text-right">(Excluding delivery charge)</p>
            )}

            {shippingCharge > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-md text-muted-foreground flex items-center"><Truck className="h-4 w-4 mr-1" />Shipping Charge:</span>
                <span className="text-md font-medium text-foreground">+ {formatCurrency(shippingCharge)}</span>
              </div>
            )}

            {totalAdvancePaid > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-md text-muted-foreground">{showPaidBadge ? "Total Paid:" : "Total Advance Paid:"}</span>
                <span className="font-medium text-green-600">- {formatCurrency(totalAdvancePaid)}</span>
              </div>
            )}

            {showApprovedStamp ? (
              <div className="absolute -left-16 -top-12 sm:-left-24 sm:-top-16 transform -rotate-[20deg]">
                <Image
                  src="/approved-stamp.png"
                  alt="Approved Stamp"
                  width={150}
                  height={150}
                  className="opacity-80"
                  unoptimized
                />
              </div>
            ) : showPaidBadge ? (
              <div className="absolute -left-16 -top-12 sm:-left-24 sm:-top-16 transform -rotate-[20deg]">
                <Image
                  src="/paid-stamp.png"
                  alt="Paid Stamp"
                  width={150}
                  height={150}
                  className="opacity-80"
                  unoptimized
                />
              </div>
            ) : (grandTotal > 0 && amountDue > 0.01) && (
              <><Separator className="my-2 bg-border/50" /><div className="flex justify-between"><span className="text-lg font-bold text-primary">Amount Due:</span><span className="text-lg font-bold text-primary">{formatCurrency(amountDue)}</span></div></>
            )}
          </div>
        </div>
      </div>

      {isClientViewer && (
        <div className="max-w-4xl mx-auto mt-6 print:hidden">
          <Card className="border border-border/40 bg-card/60 backdrop-blur-md rounded-xl shadow-xl p-5 sm:p-6 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="p-0 pb-3 mb-3 border-b border-border/30 flex flex-row items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">Terms & Conditions</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Important guidelines for our clients</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <span className="font-semibold text-primary/80 mt-0.5">•</span>
                <p>
                  <strong>Advance Payment:</strong> A minimum of 50% advance payment is required to process and lock the quotation/order. The remaining balance must be paid before or upon delivery.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="font-semibold text-primary/80 mt-0.5">•</span>
                <p>
                  <strong>Design & Changes:</strong> Once the design is approved by the client, it will proceed directly to the production queue. No alterations can be made post-approval.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="font-semibold text-primary/80 mt-0.5">•</span>
                <p>
                  <strong>Delivery & Timelines:</strong> While we strive to meet all estimated delivery dates, shipping delays caused by couriers, weather, or unexpected circumstances are beyond our control.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="font-semibold text-primary/80 mt-0.5">•</span>
                <p>
                  <strong>Cancellations:</strong> Custom order requests cannot be cancelled or refunded once production has begun.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

