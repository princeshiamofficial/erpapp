
"use client";

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { addLeadsBatchAction } from '@/app/(app)/pipeline/actions';
import { Loader2, UploadCloud, FileCheck2, AlertTriangle, TableIcon } from 'lucide-react';
import type { Lead } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportLeadsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadsImported: () => void;
}

const REQUIRED_HEADERS = ["date", "contactName", "businessName", "phone", "source", "address", "category"];

export function ImportLeadsDialog({ isOpen, onOpenChange, onLeadsImported }: ImportLeadsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Omit<Lead, 'id'>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setIsParsing(false);
    setIsSubmitting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        setError("Invalid file type. Please upload a CSV file.");
        resetState();
        return;
      }
      setError(null);
      setFile(selectedFile);
      handleParseFile(selectedFile);
    }
  };

  const handleParseFile = (fileToParse: File) => {
    setIsParsing(true);
    Papa.parse<any>(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setError(`Missing required columns in CSV: ${missingHeaders.join(', ')}`);
          setParsedData([]);
          setIsParsing(false);
          return;
        }

        const validLeads: Omit<Lead, 'id'>[] = [];
        const validationErrors: string[] = [];

        results.data.forEach((row, index) => {
          if (!row.contactName || !row.date || !row.phone) {
            validationErrors.push(`Row ${index + 2}: Missing required data (contactName, date, or phone).`);
            return;
          }
          const parsedDate = new Date(row.date);
          if (isNaN(parsedDate.getTime())) {
            validationErrors.push(`Row ${index + 2}: Invalid date format for "${row.date}". Use YYYY-MM-DD.`);
            return;
          }

          validLeads.push({
            date: parsedDate.toISOString(),
            contactName: row.contactName,
            businessName: row.businessName || '',
            phone: row.phone,
            source: row.source || 'CSV Import',
            address: row.address || '',
            category: row.category || 'POG',
            notes: row.notes || null,
            schedule: row.schedule ? new Date(row.schedule).toISOString() : null,
          });
        });

        if (validationErrors.length > 0) {
          setError(validationErrors.slice(0, 3).join('\n'));
          setParsedData([]);
        } else {
          setParsedData(validLeads);
          setError(null);
        }

        setIsParsing(false);
      },
      error: (err) => {
        setError(`CSV Parsing Error: ${err.message}`);
        setIsParsing(false);
      }
    });
  };

  const handleSubmit = async () => {
    if (parsedData.length === 0) {
      toast({ title: "No Data", description: "No valid leads to import.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await addLeadsBatchAction(parsedData);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.createdCount} new leads.`,
      });
      onLeadsImported();
      onOpenChange(false);
    } else {
      toast({
        title: "Import Partially Failed",
        description: `Imported ${result.createdCount} leads. ${result.errorCount} failed. Errors: ${result.errors.slice(0, 2).join(', ')}`,
        variant: "destructive",
        duration: 8000
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Leads from Sheet</DialogTitle>
          <DialogDescription>
            Upload a CSV file to add multiple leads at once. The file must contain the headers: {REQUIRED_HEADERS.join(', ')}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              disabled={isParsing || isSubmitting}
            />
          </div>

          {isParsing && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing file...
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          )}
          
          {parsedData.length > 0 && !error && (
            <div className="p-3 bg-green-500/10 text-green-700 text-sm rounded-md flex items-center gap-2">
              <FileCheck2 className="h-5 w-5" />
              <p>Successfully parsed <span className="font-semibold">{parsedData.length}</span> leads. Review the preview below and confirm.</p>
            </div>
          )}
          
          {parsedData.length > 0 && (
             <ScrollArea className="h-64 border rounded-md">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                        <TableRow>
                            <TableHead>Contact</TableHead>
                            <TableHead>Business</TableHead>
                            <TableHead>Category</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedData.slice(0, 10).map((lead, index) => (
                            <TableRow key={index}>
                                <TableCell>{lead.contactName}</TableCell>
                                <TableCell>{lead.businessName}</TableCell>
                                <TableCell>{lead.category}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {parsedData.length > 10 && <p className="text-center text-xs text-muted-foreground p-2">...and {parsedData.length - 10} more rows.</p>}
             </ScrollArea>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isParsing || parsedData.length === 0 || !!error}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" /> Import {parsedData.length > 0 ? parsedData.length : ''} Leads
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
