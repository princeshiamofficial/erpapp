
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Printer, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ReportData } from '@/lib/report-service';
import { generateReportAction } from './actions';
import { format } from 'date-fns';

export default function PrintReportPage() {
  const [reportTitle, setReportTitle] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim()) {
      toast({ title: "Validation Error", description: "Report Title is required.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGeneratedReport(null);
    try {
      const result = await generateReportAction(reportTitle, reportContent);
      if (result) {
        setGeneratedReport(result);
        toast({ title: "Report Generated", description: "Your custom report is ready to be printed." });
      } else {
        toast({ title: "Error", description: "Could not generate the report data.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred while generating the report.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="print:hidden">
        <Card className="shadow-xl border bg-card rounded-lg">
          <CardHeader>
            <CardTitle>Create Custom Report</CardTitle>
            <CardDescription>Enter custom information to generate a printable report.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="reportTitle">Report Title *</Label>
                <Input
                  id="reportTitle"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g., Monthly Sales Summary"
                  required
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reportContent">Report Content / Notes (Optional)</Label>
                <Textarea
                  id="reportContent"
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="Add any details, notes, or custom information for your report..."
                  rows={8}
                  disabled={isGenerating}
                />
              </div>
              <Button type="submit" disabled={isGenerating || !reportTitle.trim()}>
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Generating...</> : "Generate Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {generatedReport && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4 print:hidden">
            <h2 className="text-xl font-bold">Generated Report Preview</h2>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print Report
            </Button>
          </div>
          <div className="print-area p-8 border rounded-lg bg-white text-black shadow-lg">
            <header className="text-center mb-8 border-b pb-4">
               <h1 className="text-3xl font-bold text-gray-800">{generatedReport.title}</h1>
               <p className="text-sm text-gray-500">Generated on: {format(new Date(generatedReport.generatedAt), "PPP p")}</p>
            </header>
            <main>
              {generatedReport.customContent && (
                <section className="mb-8">
                  <h2 className="text-xl font-semibold border-b pb-2 mb-3">Notes & Details</h2>
                  <div className="prose max-w-none whitespace-pre-wrap">
                    {generatedReport.customContent}
                  </div>
                </section>
              )}
               <section>
                  <h2 className="text-xl font-semibold border-b pb-2 mb-3">Order Summary Data</h2>
                   <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Order ID</th>
                                <th scope="col" className="px-6 py-3">Company</th>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {generatedReport.orders.map(order => (
                                <tr key={order.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{order.id}</td>
                                    <td className="px-6 py-4">{order.companyName}</td>
                                    <td className="px-6 py-4">{format(new Date(order.createdAt), "d MMM, yyyy")}</td>
                                    <td className="px-6 py-4">{order.currentStatus}</td>
                                    <td className="px-6 py-4 font-mono text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format((order.orderItems || []).reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                   </div>
                   {generatedReport.orders.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No order data to display for this report.</p>
                   )}
               </section>
            </main>
             <footer className="text-center mt-12 pt-4 border-t">
                <p className="text-xs text-gray-500">Color Hut - Report</p>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
