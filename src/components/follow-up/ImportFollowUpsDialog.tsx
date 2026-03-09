
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
import { addFollowUpsBatchAction } from '@/app/(app)/follow-up/actions';
import { Loader2, UploadCloud, FileCheck2, AlertTriangle, TableIcon, Search, Info, Download } from 'lucide-react';
import type { FollowUp, User } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportFollowUpsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFollowUpsImported: () => void;
  currentUser: User;
}

const REQUIRED_HEADERS = ["date", "name", "phone"];
const OPTIONAL_HEADERS = ["address", "job id"];

export function ImportFollowUpsDialog({ isOpen, onOpenChange, onFollowUpsImported, currentUser }: ImportFollowUpsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Omit<FollowUp, 'id' | 'crmId' | 'crmName'>[]>([]);
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
      if (!selectedFile.name.endsWith('.csv')) {
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

        const validItems: Omit<FollowUp, 'id' | 'crmId' | 'crmName'>[] = [];
        const validationErrors: string[] = [];

        results.data.forEach((row, index) => {
          if (!row.name || !row.date || !row.phone) {
            validationErrors.push(`Row ${index + 2}: Missing required data (name, date, or phone).`);
            return;
          }
          const parsedDate = new Date(row.date);
          if (isNaN(parsedDate.getTime())) {
            validationErrors.push(`Row ${index + 2}: Invalid date format for "${row.date}". Use YYYY-MM-DD.`);
            return;
          }

          validItems.push({
            date: parsedDate.toISOString(),
            contactName: row.name,
            businessName: '',
            phone: row.phone,
            address: row.address || '',
            district: '',
            division: '',
            status: 'New Lead',
            jobId: row['job id'] || '',
            history: [],
          });
        });

        if (validationErrors.length > 0) {
          setError(validationErrors.slice(0, 3).join('\n'));
          setParsedData([]);
        } else {
          setParsedData(validItems);
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
      toast({ title: "No Data", description: "No valid items to import.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await addFollowUpsBatchAction(parsedData, currentUser);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.createdCount} new follow-up records.`,
      });
      onFollowUpsImported();
      onOpenChange(false);
    } else {
      toast({
        title: "Import Partially Failed",
        description: `Imported ${result.createdCount} items. ${result.errorCount} failed. Errors: ${result.errors.slice(0, 2).join(', ')}`,
        variant: "destructive",
        duration: 8000
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if (!open) resetState(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background border-none shadow-2xl rounded-3xl">
        <DialogHeader className="p-8 pb-4 bg-muted/5 relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <UploadCloud className="h-24 w-24" />
            </div>
          <DialogTitle className="text-2xl font-semibold tracking-wide flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <FileCheck2 className="h-6 w-6" />
            </div>
            Import CSV File
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Upload a CSV file to add multiple records to your follow up stages. 
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
          <div className="bg-muted/30 p-4 rounded-2xl border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-4 py-8">
            <input
              type="file"
              id="csv-file-input"
              className="hidden"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              disabled={isParsing || isSubmitting}
            />
            <Label 
                htmlFor="csv-file-input" 
                className={cn(
                    "flex flex-col items-center gap-3 cursor-pointer group hover:opacity-80 transition-all",
                    (isParsing || isSubmitting) && "pointer-events-none opacity-50"
                )}
            >
                <div className="h-16 w-16 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-border/50 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all">
                    {isParsing ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <UploadCloud className="h-8 w-8 text-primary" />}
                </div>
                <div className="text-center">
                    <p className="font-semibold text-lg">{file ? file.name : "Choose CSV File"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports UTF-8 CSV files up to 10MB</p>
                </div>
            </Label>
          </div>



          {error && (
            <div className="px-5 py-4 bg-destructive/10 text-destructive text-sm rounded-2xl flex items-start gap-3 border border-destructive/20 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-tight text-xs mb-1">Configuration Error</p>
                <p className="whitespace-pre-wrap leading-relaxed">{error}</p>
              </div>
            </div>
          )}
          

        </div>

        <DialogFooter className="p-8 border-t bg-muted/5">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting}
            className="rounded-2xl h-11 px-6 font-semibold"
          >
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
                const csvContent = "date,name,phone,address,job id\n2024-03-09,John Doe,01700000000,Dhaka Bangladesh,JOB-123";
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'follow_up_template.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }}
            className="rounded-2xl h-11 px-6 font-semibold border-dashed hover:border-primary hover:text-primary transition-all gap-2"
          >
            <Download className="h-4 w-4" />
            Sample CSV
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isParsing || parsedData.length === 0 || !!error}
            className="rounded-2xl h-11 px-8 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Finalizing...</>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" /> Import {parsedData.length > 0 ? parsedData.length : ''} Records
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { cn } from '@/lib/utils';
