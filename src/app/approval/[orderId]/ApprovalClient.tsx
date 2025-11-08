
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { approveOrderAction, requestChangesAction } from './actions';
import type { TrackingLink, AdvancePaymentRecord } from '@/types';
import { CheckCircle, Edit, Loader2, FileText, StickyNote, Percent, Building, MapPin, Phone, ReceiptText, Truck, User } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import JsBarcode from 'jsbarcode';
import { Skeleton } from '@/components/ui/skeleton';
import { parseISO, format } from 'date-fns';

interface ApprovalClientProps {
  order: TrackingLink;
}

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


export function ApprovalClient({ order: initialOrder }: ApprovalClientProps) {
  const [order, setOrder] = useState(initialOrder);
  const [changes, setChanges] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'pending' | 'approved' | 'changes_requested' | 'error'>(
    initialOrder.currentStatus === 'approved-for-production' ? 'approved' : 'pending'
  );
  const [isConfirmingApproval, setIsConfirmingApproval] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

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
  }, [initialOrder]);

  const orderSubtotal = order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
  const effectiveDiscount = order.specialClientDiscount || 0;
  const netPayable = orderSubtotal - effectiveDiscount;
  const shippingCharge = order.shippingCharge || 0;
  
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
  const grandTotal = netPayable + shippingCharge;
  const amountDue = grandTotal - totalAdvancePaid;
  const showPaidBadge = (grandTotal > 0 && amountDue <= 0.01);


  const handleApprove = async () => {
    setIsSubmitting(true);
    const result = await approveOrderAction(order.id, order.crmUserId, order.crmUserName);
    if (result.success) {
      setSubmissionStatus('approved');
      toast({ title: "Order Approved", description: "The order has been approved for production." });
    } else {
      setSubmissionStatus('error');
      toast({ title: "Error", description: result.error || "Could not approve the order.", variant: "destructive" });
    }
    setIsSubmitting(false);
    setIsConfirmingApproval(false);
  };

  const handleRequestChanges = async () => {
    if (!changes.trim()) {
      toast({ title: "Changes Required", description: "Please describe the changes you would like to request.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await requestChangesAction(order.id, changes, order.crmUserId, order.crmUserName);
    if (result.success) {
      setSubmissionStatus('changes_requested');
      toast({ title: "Changes Requested", description: "Your requested changes have been submitted." });
    } else {
      setSubmissionStatus('error');
      toast({ title: "Error", description: result.error || "Could not submit your request.", variant: "destructive" });
    }
    setIsSubmitting(false);
    setIsRequestingChanges(false);
  };
  
  if (submissionStatus === 'approved') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 px-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold">Thank You!</h1>
        <p className="text-lg mt-2 text-muted-foreground">Your approval for order <span className="font-mono text-foreground">{order.id}</span> has been confirmed.</p>
      </div>
    );
  }

  if (submissionStatus === 'changes_requested') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 px-4">
        <Edit className="h-16 w-16 text-blue-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold">Changes Submitted</h1>
        <p className="text-lg mt-2 text-muted-foreground">Your requested changes for order <span className="font-mono text-foreground">{order.id}</span> have been sent to our team.</p>
      </div>
    );
  }

  return (
    <>
      <div ref={invoiceRef} className="max-w-4xl mx-auto p-0 sm:p-4 md:p-6 lg:p-8">
        <div className="bg-card border border-border/40 rounded-xl shadow-2xl">
           <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 p-6 sm:p-8 border-b border-border/30">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2 flex items-center"><FileText className="h-8 w-8 mr-3" /> INVOICE</h2>
              <div className="mb-2">
                  <Image
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
              <div className="text-sm text-muted-foreground mt-1.5">{order.updatedAt && order.updatedByUserName ? (isClient ? <>Last Updated: {order.updatedByUserName} {formatDate(order.updatedAt)}</> : <div className="h-4 w-64"><Skeleton className="h-full w-full" /></div>) : (isClient ? `Order Placed: ${order.crmUserName} on ${formatDate(order.createdAt)}` : <div className="h-4 w-64"><Skeleton className="h-full w-full" /></div>)}</div>
            </div>
            <div className="text-left sm:text-right mt-4 sm:mt-0">
              <p className="text-lg font-semibold">Invoice #: <span className="text-foreground">{order.id}</span></p>
              <div className="text-sm text-muted-foreground">Date: {isClient ? formatDate(order.createdAt) : <div className="h-4 w-56"><Skeleton className="h-full w-full" /></div>}</div>
              <div className="mt-2"><svg ref={barcodeRef} className="object-contain" data-ai-hint="barcode scan"></svg></div>
            </div>
          </div>
          
          <div className="px-6 sm:px-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1 p-4 bg-secondary/40 border border-border/20 rounded-lg shadow-sm">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2"><Building className="h-4 w-4"/>Bill To:</h4>
                  <p className="text-lg font-semibold text-foreground">{order.companyName}</p>
                  <p className="text-foreground/90 text-sm flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground"/>{order.address}</p>
                  <p className="text-foreground/90 text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{order.phoneNumber}</p>
                </div>
                {order.designerRepresentativeName && (<div className="space-y-1 p-4 bg-secondary/40 border border-border/20 rounded-lg shadow-sm">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Project Contact:</h4>
                  <p className="text-lg font-semibold text-foreground flex items-center"><UserCheck className="h-5 w-5 mr-2 text-green-500" /> {order.designerRepresentativeName}</p>
                  <p className="text-muted-foreground text-sm">Assigned Designer Representative</p>
                </div>)}
              </div>

              {Array.isArray(order.orderItems) && order.orderItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-foreground flex items-start">Order Items</h3>
                    <div className="overflow-x-auto rounded-lg border border-border/30 bg-background shadow-sm">
                      <Table><TableHeader><TableRow><TableHead>Model</TableHead><TableHead className="text-center">Quantity</TableHead><TableHead>Lamination</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Total Price</TableHead></TableRow></TableHeader>
                        <TableBody>{order.orderItems.map((item, index) => (<TableRow key={item.id || index} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="font-medium text-card-foreground">{item.model}</TableCell><TableCell className="text-center text-card-foreground">{item.quantity}</TableCell><TableCell className="text-card-foreground">{item.lamination}</TableCell><TableCell className="text-right text-card-foreground">{formatCurrency(item.unitPrice)}</TableCell><TableCell className="text-right font-semibold text-card-foreground">{formatCurrency(item.lineItemTotalPrice)}</TableCell>
                        </TableRow>))}</TableBody></Table>
                    </div>
                  </div>
              )}
          </div>
          
          {order.orderNotes && (<div className="px-6 sm:px-8 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center"><StickyNote className="mr-2 h-5 w-5 text-primary/80"/>Order Notes:</h3>
            <Card className="bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/40 shadow-sm"><CardContent className="p-4 text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{order.orderNotes}</CardContent></Card>
          </div>)}

          {allAdvancePaymentRecords.length > 0 && (
            <div className="px-6 sm:px-8 mb-8">
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

          <div className="px-6 sm:px-8 flex justify-end mt-8 pt-6 pb-6 border-t border-border/30">
            <div className="w-full max-w-xs sm:max-w-sm relative">
              <div className="flex justify-between mb-1"><span className="text-md text-muted-foreground">Order Items Total:</span><span className="text-md font-medium text-foreground">{formatCurrency(orderSubtotal)}</span></div>
              {effectiveDiscount > 0 && (<div className="flex justify-between mb-1"><span className="text-md text-muted-foreground flex items-center"><Percent className="h-4 w-4 mr-1 text-red-500"/>Special Client Discount:</span><span className="text-md font-medium text-red-500">- {formatCurrency(effectiveDiscount)}</span></div>)}
              <div className="flex justify-between mb-2 pt-1 border-t border-dashed border-border/40"><span className="text-md font-semibold text-foreground">Net Payable:</span><span className="text-md font-bold text-foreground">{formatCurrency(netPayable)}</span></div>
              {shippingCharge <= 0 && (
                <p className="text-sm font-semibold text-muted-foreground mb-2 text-right">(Excluding delivery charge)</p>
              )}
              
              {shippingCharge > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-md text-muted-foreground flex items-center"><Truck className="h-4 w-4 mr-1"/>Shipping Charge:</span>
                  <span className="text-md font-medium text-foreground">+ {formatCurrency(shippingCharge)}</span>
                </div>
              )}

              {totalAdvancePaid > 0 && (<div className="flex justify-between mb-2"><span className="text-md text-muted-foreground">Total Advance Paid:</span><span className="font-medium text-green-600">- {formatCurrency(totalAdvancePaid)}</span></div>)}
              {showPaidBadge ? (
                  <div className="absolute -left-16 -top-12 sm:-left-24 sm:-top-16 transform -rotate-[20deg]">
                      <Image
                          src="https://colorhutbd.xyz/image/paid-stamp.webp"
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
      </div>
      
      {/* Approval Form */}
      <Card className="max-w-4xl mx-auto mt-8 shadow-lg">
        <CardHeader>
          <CardTitle>Action Required</CardTitle>
          <CardDescription>
            Approve the order to send it to production.
          </CardDescription>
        </CardHeader>
        <CardFooter className="bg-muted/30 p-6 flex flex-col sm:flex-row justify-end gap-4">
            <Button size="lg" onClick={() => setIsConfirmingApproval(true)} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                Approve for Production
            </Button>
        </CardFooter>
      </Card>
      
      <AlertDialog open={isConfirmingApproval} onOpenChange={setIsConfirmingApproval}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this order for production? No further changes can be made after approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmingApproval(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isRequestingChanges} onOpenChange={setIsRequestingChanges}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit these change requests? Our team will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsRequestingChanges(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestChanges}>Submit Request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
