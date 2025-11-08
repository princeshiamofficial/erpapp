
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { approveOrderAction, requestChangesAction } from './actions';
import type { TrackingLink } from '@/types';
import { CheckCircle, Edit, Loader2, FileText, StickyNote } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

interface ApprovalClientProps {
  order: TrackingLink;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export function ApprovalClient({ order }: ApprovalClientProps) {
  const [changes, setChanges] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'pending' | 'approved' | 'changes_requested' | 'error'>(
    order.currentStatus === 'approved-for-production' ? 'approved' : 'pending'
  );
  const [isConfirmingApproval, setIsConfirmingApproval] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);

  const { toast } = useToast();
  
  const orderSubtotal = order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);

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
      <Card className="max-w-4xl mx-auto shadow-2xl overflow-hidden border-border/40 bg-card">
        <CardHeader className="bg-muted/30 p-6 sm:p-8 border-b">
          <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl"><FileText className="h-8 w-8 text-primary"/>Order Approval</CardTitle>
          <CardDescription>
            Please review the details for order <span className="font-mono font-semibold text-foreground">{order.id}</span> and approve or request changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center">Order Items</h3>
              <div className="overflow-x-auto rounded-lg border bg-background shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead>Lamination</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.model}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{item.lamination}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.lineItemTotalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {order.orderNotes && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center"><StickyNote className="mr-2 h-5 w-5 text-primary/80"/>Order Notes:</h3>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-800 whitespace-pre-wrap">
                  {order.orderNotes}
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>{formatCurrency(orderSubtotal)}</span></div>
                    {order.specialClientDiscount && (
                        <div className="flex justify-between text-destructive"><span className="">Discount:</span><span>- {formatCurrency(order.specialClientDiscount)}</span></div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Net Total:</span>
                        <span>{formatCurrency(orderSubtotal - (order.specialClientDiscount || 0))}</span>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <Label htmlFor="changes" className="text-base font-semibold">Request Changes</Label>
              <Textarea
                id="changes"
                value={changes}
                onChange={(e) => setChanges(e.target.value)}
                placeholder="If you need any changes, please describe them here..."
                rows={4}
                className="bg-background"
                disabled={isSubmitting}
              />
            </div>
        </CardContent>
        <CardFooter className="bg-muted/30 p-6 flex flex-col sm:flex-row justify-end gap-4">
            <Button variant="outline" size="lg" onClick={() => setIsRequestingChanges(true)} disabled={isSubmitting || !changes.trim()}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Edit className="mr-2 h-4 w-4" />}
                Request Changes
            </Button>
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
