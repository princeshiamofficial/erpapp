
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
import { Loader2, UploadCloud, FileCheck2, AlertTriangle, TableIcon, Search } from 'lucide-react';
import type { FollowUp, User } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportFollowUpsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFollowUpsImported: () => void;
  currentUser: User;
}

const REQUIRED_HEADERS = ["date", "contactName", "businessName", "phone", "address", "district", "division", "status", "category"];

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
          if (!row.contactName || !row.date || !row.phone) {
            validationErrors.push(`Row ${index + 2}: Missing required data (contactName, date, or phone).`);
            return;
          }
          const parsedDate = new Date(row.date);
          if (isNaN(parsedDate.getTime())) {
            validationErrors.push(`Row ${index + 2}: Invalid date format for "${row.date}". Use YYYY-MM-DD.`);
            return;
          }

          validItems.push({
            date: parsedDate.toISOString(),
            contactName: row.contactName,
            businessName: row.businessName || '',
            phone: row.phone,
            address: row.address || '',
            district: row.district || '',
            division: row.division || '',
            status: row.status || 'New Lead',
            category: row.category || 'POG',
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
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <FileCheck2 className="h-6 w-6" />
            </div>
            Import Follow-Up Data
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Upload a CSV file to add multiple records to your pipeline stages. 
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

          {!file && (
             <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-border/50">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <TableIcon className="h-3.5 w-3.5" />
                    Required CSV Headers
                </p>
                <div className="flex flex-wrap gap-2">
                    {REQUIRED_HEADERS.map(h => (
                        <span key={h} className="inline-flex px-3 py-1 bg-white dark:bg-slate-800 border border-border/50 rounded-lg text-xs font-mono font-medium shadow-sm">
                            {h}
                        </span>
                    ))}
                </div>
             </div>
          )}

          {error && (
            <div className="px-5 py-4 bg-destructive/10 text-destructive text-sm rounded-2xl flex items-start gap-3 border border-destructive/20 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-tight text-xs mb-1">Configuration Error</p>
                <p className="whitespace-pre-wrap leading-relaxed">{error}</p>
              </div>
            </div>
          )}
          
          {parsedData.length > 0 && !error && (
            <div className="space-y-4">
                <div className="px-5 py-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm rounded-2xl flex items-center gap-3 border border-emerald-500/20">
                    <FileCheck2 className="h-5 w-5 shrink-0" />
                    <p className="font-medium">Ready to import <span className="font-bold underline decoration-2">{parsedData.length}</span> records. Please review the preview.</p>
                </div>

                <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-sm">
                    <div className="bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40">
                        Data Preview (showing top 10)
                    </div>
                    <ScrollArea className="h-64">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border/40">
                                    <TableHead className="text-[10px] font-bold">Contact</TableHead>
                                    <TableHead className="text-[10px] font-bold">Business</TableHead>
                                    <TableHead className="text-[10px] font-bold">Status</TableHead>
                                    <TableHead className="text-[10px] font-bold text-right">Phone</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedData.slice(0, 10).map((item, index) => (
                                    <TableRow key={index} className="hover:bg-muted/20 border-b border-border/40">
                                        <TableCell className="font-semibold text-xs py-3">{item.contactName}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{item.businessName}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                                                {item.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">{item.phone}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    {parsedData.length > 10 && (
                        <div className="p-3 text-center text-[10px] text-muted-foreground italic bg-muted/5 border-t border-border/40">
                            + {parsedData.length - 10} more records in file
                        </div>
                    )}
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
