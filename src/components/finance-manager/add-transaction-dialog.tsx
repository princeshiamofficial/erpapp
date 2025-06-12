
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TransactionType, User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { addTransactionAction } from '@/app/(app)/finance-manager/actions';
import { Loader2, CalendarIcon, Users, ChevronsUpDown, Check, UploadCloud, Paperclip, XCircle, ImagePlus } from 'lucide-react';
import { format } from 'date-fns';
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface AddTransactionDialogProps {
  currentUser: User;
  onTransactionAdded: () => void;
  children: React.ReactNode;
  isSendMoneyFlow?: boolean;
  allUsersForDropdown?: User[];
}

export function AddTransactionDialog({
  currentUser,
  onTransactionAdded,
  children,
  isSendMoneyFlow = false,
  allUsersForDropdown = []
}: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(isSendMoneyFlow ? 'expense' : 'expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const documentFileRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);


  const [selectedSentToUserId, setSelectedSentToUserId] = useState<string | undefined>(undefined);
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const availableTransactionTypes = useMemo(() => {
    const baseTypes = [
      { value: 'expense', label: 'Expense' },
      { value: 'purchase', label: 'Purchase' },
    ];
    if (currentUser?.role === 'SYSTEM_ADMIN') {
      return [{ value: 'income', label: 'Income' }, ...baseTypes];
    }
    return baseTypes;
  }, [currentUser?.role]);

  const resetForm = useCallback(() => {
    const defaultType = isSendMoneyFlow ? 'expense' : (currentUser?.role === 'SYSTEM_ADMIN' ? 'income' : 'expense');
    setType(defaultType);
    setAmount('');
    setDescription('');
    setDate(new Date());
    setSelectedSentToUserId(undefined);
    setIsUserPopoverOpen(false);
    setUserSearchQuery("");
    setCategory(isSendMoneyFlow ? "Sent Money" : "");
    setSelectedDocumentFile(null);
    if (documentFileRef.current) documentFileRef.current.value = "";
    setIsUploadingDocument(false);
    setIsSubmitting(false);
    setIsDraggingOver(false);
  }, [isSendMoneyFlow, currentUser?.role]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);


  useEffect(() => {
    if (isOpen && isSendMoneyFlow) {
      if (selectedSentToUserId) {
        const recipient = allUsersForDropdown.find(u => u.id === selectedSentToUserId);
        if (recipient) {
          setCategory(`Sent Money to ${recipient.name}`);
        } else {
          setCategory("Sent Money");
        }
      } else {
        setCategory("Sent Money");
      }
    } else if (isOpen && !isSendMoneyFlow && (type === 'expense' || type === 'purchase')) {
      if (category === "Sent Money") setCategory("");
    }
  }, [isOpen, isSendMoneyFlow, selectedSentToUserId, allUsersForDropdown, type, category]);


  useEffect(() => {
    if (!availableTransactionTypes.some(t => t.value === type)) {
      setType(availableTransactionTypes[0]?.value || 'expense');
    }
  }, [availableTransactionTypes, type]);

  const processFile = (file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Please select a file smaller than 5MB.", variant: "destructive" });
        return false;
      }
      if (!file.type.match(/image.*|application\/pdf|\.doc|\.docx|\.xls|\.xlsx|\.txt/)) {
        toast({ title: "Invalid file type", description: "Allowed types: Images, PDF, DOC, XLS, TXT.", variant: "destructive" });
        return false;
      }
      setSelectedDocumentFile(file);
      return true;
    }
    return false;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    processFile(file || null);
  };
  
  const handleRemoveSelectedFile = () => {
    setSelectedDocumentFile(null);
    if (documentFileRef.current) documentFileRef.current.value = "";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true); // Keep it true while dragging over
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };
  
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!isOpen || !isDocumentRequired) return; // Only handle paste if dialog is open and doc is needed
      
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (file) {
               const processed = processFile(file);
               if (processed) {
                 toast({title: "Image Pasted", description: "Image from clipboard has been attached."});
               }
               event.preventDefault(); // Prevent default paste action if we handled it
               return;
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, isDocumentRequired, processFile, toast]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) {
      toast({ title: "Validation Error", description: "Amount and Date are required.", variant: "destructive" });
      return;
    }
    if (isSendMoneyFlow && !selectedSentToUserId) {
      toast({ title: "Validation Error", description: "Recipient is required for sending money.", variant: "destructive" });
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: "Validation Error", description: "Amount must be a positive number.", variant: "destructive" });
      return;
    }

    let uploadedDocumentUrl: string | null = null;
    if ((type === 'expense' || type === 'purchase') && !isSendMoneyFlow) {
      if (!selectedDocumentFile) {
        toast({ title: "Validation Error", description: "A document attachment is required for expenses and purchases.", variant: "destructive" });
        return;
      }
      setIsUploadingDocument(true);
      const formData = new FormData();
      formData.append('file', selectedDocumentFile);
      try {
        const response = await fetch('https://erp.colorhutbd.xyz/file/upload.php', {
          method: 'POST',
          body: formData,
        });
        setIsUploadingDocument(false);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Upload failed with status: " + response.status }));
          toast({ title: "Document Upload Failed", description: errorData.message || "Could not upload document.", variant: "destructive" });
          return;
        }
        const result = await response.json();
        if (result.success && result.file_url) {
          uploadedDocumentUrl = result.file_url;
          toast({ title: "Document Uploaded", description: "Document successfully attached." });
        } else {
          toast({ title: "Document Upload Failed", description: result.message || "Could not get file URL from server.", variant: "destructive" });
          return;
        }
      } catch (uploadError) {
        setIsUploadingDocument(false);
        console.error("Document upload error:", uploadError);
        toast({ title: "Document Upload Error", description: "An error occurred while uploading the document.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    const finalCategory = category.trim();

    const transactionPayload = {
      type: isSendMoneyFlow ? 'expense' : type,
      amount: numericAmount,
      category: finalCategory,
      description: description.trim() || null,
      date: date.toISOString(),
      sentToUserId: isSendMoneyFlow ? selectedSentToUserId : null,
      sentToUserName: isSendMoneyFlow && selectedSentToUserId ? allUsersForDropdown.find(u => u.id === selectedSentToUserId)?.name || null : null,
      documentUrl: uploadedDocumentUrl,
    };

    const result = await addTransactionAction(currentUser, transactionPayload);
    setIsSubmitting(false);

    if (result.success && result.transaction) {
      const successType = isSendMoneyFlow ? 'Payment' : (type.charAt(0).toUpperCase() + type.slice(1));
      toast({ title: `${successType} Recorded`, description: `${finalCategory} of ${numericAmount} recorded.` });
      if (result.error) {
        toast({ title: "Notice", description: result.error, variant: "default", duration: 7000 });
      }
      onTransactionAdded();
      setIsOpen(false);
    } else {
      toast({ title: "Error", description: result.error || "Could not add transaction.", variant: "destructive" });
    }
  };

  const getCategoryPlaceholder = () => {
    if (type === 'income') return "e.g., Salary, Sales";
    if (type === 'purchase') return "e.g., Inventory, Supplies, Groceries";
    return "e.g., Utilities, Rent";
  };

  const dialogTitle = isSendMoneyFlow ? "Record Payment to User" : "Add New Transaction";
  const dialogDescription = isSendMoneyFlow
    ? "Log an expense for money sent to another user. An income transaction will also be recorded for the recipient."
    : `Log a new ${type} entry.`;

  const availableUsers = useMemo(() => {
    return allUsersForDropdown.filter(u => u.id && u.id !== currentUser.id);
  }, [allUsersForDropdown, currentUser.id]);

  const filteredUsersForDropdown = useMemo(() => {
    if (!userSearchQuery) return availableUsers;
    return availableUsers.filter(user =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
    );
  }, [availableUsers, userSearchQuery]);

  const isDocumentRequired = (type === 'expense' || type === 'purchase') && !isSendMoneyFlow;

  const canSubmit = useMemo(() => {
    const baseValid = !isSubmitting && !isUploadingDocument &&
      amount.trim() && parseFloat(amount) > 0 &&
      date;

    let docValid = true;
    if (isDocumentRequired) {
      docValid = !!selectedDocumentFile;
    }

    if (isSendMoneyFlow) {
      return baseValid && selectedSentToUserId && docValid;
    } else {
      return baseValid && category.trim() && docValid;
    }
  }, [isSubmitting, isUploadingDocument, amount, category, date, isSendMoneyFlow, selectedSentToUserId, isDocumentRequired, selectedDocumentFile]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {!isSendMoneyFlow && (
              <div className="space-y-1">
                <Label htmlFor="transaction-type">Type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as TransactionType)} required>
                  <SelectTrigger id="transaction-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransactionTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="transaction-amount">Amount (BDT) *</Label>
              <Input id="transaction-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 50.00" min="0.01" step="0.01" required />
            </div>

            {!isSendMoneyFlow && (
              <div className="space-y-1">
                <Label htmlFor="transaction-category">Category *</Label>
                <Input id="transaction-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={getCategoryPlaceholder()} required />
              </div>
            )}

            {isSendMoneyFlow && (
              <div className="space-y-1">
                <Label htmlFor="send-to-user">Send To User *</Label>
                <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isUserPopoverOpen}
                      className="w-full justify-between"
                    >
                      {selectedSentToUserId
                        ? availableUsers.find((user) => user.id === selectedSentToUserId)?.name
                        : ("Select recipient *")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command filter={() => 1}> {/* Disable CMDK's internal filtering */}
                      <CommandInput
                        placeholder="Search user..."
                        value={userSearchQuery}
                        onValueChange={setUserSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                          {availableUsers.length === 0 && !userSearchQuery && (
                            <CommandItem disabled>No other users available.</CommandItem>
                          )}
                          {filteredUsersForDropdown.map((user) => (
                            user.id &&
                            <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => {
                                setSelectedSentToUserId(user.id);
                                setIsUserPopoverOpen(false);
                                setUserSearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedSentToUserId === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user.name} ({user.role.replace(/_/g, ' ')})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="transaction-date">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label htmlFor="transaction-description">Description / Notes (Optional)</Label>
              <Input id="transaction-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isSendMoneyFlow ? "e.g., Advance salary payment" : "e.g., Weekly supermarket run"} />
            </div>

            {isDocumentRequired && (
              <div className="space-y-1">
                <Label htmlFor="transaction-document">Document Attachment *</Label>
                <div 
                  ref={dropZoneRef}
                  className={cn(
                    "mt-1 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors",
                    isDraggingOver ? "border-primary bg-primary/10" : "border-border bg-background/50",
                    selectedDocumentFile ? "border-green-500 bg-green-500/5" : ""
                  )}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => documentFileRef.current?.click()}
                >
                  <UploadCloud className={cn("h-8 w-8 mb-2", selectedDocumentFile ? "text-green-600" : "text-muted-foreground", isDraggingOver ? "text-primary": "")} />
                  <p className="text-sm text-muted-foreground">
                    {isDraggingOver ? "Drop file here" : selectedDocumentFile ? "File selected:" : "Drag & drop or click to upload"}
                  </p>
                  {selectedDocumentFile && (
                     <div className="mt-1 text-xs text-foreground font-medium flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5 text-green-600"/>
                        <span>{selectedDocumentFile.name} ({(selectedDocumentFile.size / 1024).toFixed(1)} KB)</span>
                        <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveSelectedFile();}} title="Clear selection" className="text-muted-foreground hover:text-destructive h-6 w-6">
                            <XCircle className="h-4 w-4"/>
                        </Button>
                    </div>
                  )}
                  {!selectedDocumentFile && <p className="text-xs text-muted-foreground mt-0.5">Max 5MB. (Images, PDF, DOC, XLS, TXT)</p>}
                  {!selectedDocumentFile && <p className="text-xs text-muted-foreground mt-0.5">You can also paste an image from clipboard.</p>}
                </div>
                <Input
                  id="transaction-document"
                  type="file"
                  ref={documentFileRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" 
                />
              </div>
            )}

          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting || isUploadingDocument}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || isUploadingDocument}>
              {isUploadingDocument ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 
               isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 
               (isSendMoneyFlow ? "Record Payment" : "Add Transaction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
