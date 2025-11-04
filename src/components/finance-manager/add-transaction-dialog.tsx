

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

type DialogMode = 'addIncome' | 'addExpenseOrPurchase' | 'sendMoney';

interface AddTransactionDialogProps {
  currentUser: User;
  onTransactionAdded: () => void;
  children: React.ReactNode;
  dialogMode: DialogMode;
  allUsersForDropdown?: User[];
}

export function AddTransactionDialog({
  currentUser,
  onTransactionAdded,
  children,
  dialogMode,
  allUsersForDropdown = []
}: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
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
    if (dialogMode === 'addIncome') {
      return [{ value: 'income', label: 'Income' }];
    }
    if (dialogMode === 'sendMoney') {
      return [{ value: 'expense', label: 'Expense (Sent Money)' }];
    }
    // For addExpenseOrPurchase
    return [
      { value: 'expense', label: 'Expense' },
      { value: 'purchase', label: 'Purchase' },
    ];
  }, [dialogMode]);

  const resetForm = useCallback(() => {
    let defaultType: TransactionType = 'expense';
    let defaultCategory = "";

    if (dialogMode === 'addIncome') {
      defaultType = 'income';
    } else if (dialogMode === 'sendMoney') {
      defaultType = 'expense';
      defaultCategory = "Sent Money";
    } else { // addExpenseOrPurchase
      defaultType = 'expense';
    }
    
    setType(defaultType);
    setAmount('');
    setDescription('');
    setDate(new Date());
    setSelectedSentToUserId(undefined);
    setIsUserPopoverOpen(false);
    setUserSearchQuery("");
    setCategory(defaultCategory);
    setSelectedDocumentFile(null);
    if (documentFileRef.current) documentFileRef.current.value = "";
    setIsUploadingDocument(false);
    setIsSubmitting(false);
    setIsDraggingOver(false);
  }, [dialogMode]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);


  useEffect(() => {
    if (isOpen && dialogMode === 'sendMoney') {
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
    } else if (isOpen && dialogMode === 'addExpenseOrPurchase') {
      if (category === "Sent Money") setCategory("");
    }
  }, [isOpen, dialogMode, selectedSentToUserId, allUsersForDropdown, category]);


  useEffect(() => {
    // Ensure the selected type is valid for the current mode
    if (!availableTransactionTypes.some(t => t.value === type)) {
      setType(availableTransactionTypes[0]?.value || 'expense');
    }
  }, [availableTransactionTypes, type]);

  const isDocumentRequired = useMemo(() => {
    // Document is not required if the current user is a SYSTEM_ADMIN
    if (currentUser?.role === 'SYSTEM_ADMIN') {
      return false;
    }
    return (type === 'expense' || type === 'purchase') && dialogMode !== 'sendMoney' && dialogMode !== 'addIncome';
  }, [type, dialogMode, currentUser]);
  
  const processFile = useCallback((file: File | null) => {
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({ title: "File too large", description: "Please select a file smaller than 50MB.", variant: "destructive" });
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
        return false;
      }
      setSelectedDocumentFile(file);
      return true;
    }
    return false;
  }, [toast]);

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
    setIsDraggingOver(true); 
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
      if (!isOpen || !isDocumentRequired) return; 
      
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              const processed = processFile(file);
              if (processed) {
                toast({title: "File Pasted", description: "Image from clipboard has been attached."});
              }
              event.preventDefault(); 
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
    if (dialogMode === 'sendMoney' && !selectedSentToUserId) {
      toast({ title: "Validation Error", description: "Recipient is required for sending money.", variant: "destructive" });
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ title: "Validation Error", description: "Amount must be a positive number.", variant: "destructive" });
      return;
    }

    let uploadedDocumentUrl: string | null = null;
    
    // Upload if a file is selected, regardless of whether it's required.
    // If it's required but no file is selected, the canSubmit check will already prevent this handler from being called.
    if (selectedDocumentFile) { 
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
      type: type, // Type is now set based on dialogMode
      amount: numericAmount,
      category: finalCategory,
      description: description.trim() || null,
      date: date.toISOString(),
      sentToUserId: dialogMode === 'sendMoney' ? selectedSentToUserId : null,
      sentToUserName: dialogMode === 'sendMoney' && selectedSentToUserId ? allUsersForDropdown.find(u => u.id === selectedSentToUserId)?.name || null : null,
      documentUrl: uploadedDocumentUrl,
    };

    const result = await addTransactionAction(currentUser, transactionPayload);
    setIsSubmitting(false);

    if (result.success && result.transaction) {
      const successType = dialogMode === 'sendMoney' ? 'Payment' : (type.charAt(0).toUpperCase() + type.slice(1));
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

  const dialogTitleText = useMemo(() => {
    if (dialogMode === 'sendMoney') return "Record Payment to User";
    if (dialogMode === 'addIncome') return "Add New Income";
    return "Add New Expense/Purchase";
  }, [dialogMode]);

  const dialogDescriptionText = useMemo(() => {
    if (dialogMode === 'sendMoney') return "Log an expense for money sent to another user. An income transaction will also be recorded for the recipient.";
    if (dialogMode === 'addIncome') return "Log a new income entry.";
    return "Log a new expense or purchase entry.";
  }, [dialogMode]);

  const availableUsers = useMemo(() => {
    return allUsersForDropdown.filter(u => {
        if (u.id === currentUser.id) return false; // Can't send to self
        return true; // The parent component now handles all filtering logic
    });
  }, [allUsersForDropdown, currentUser.id]);

  const filteredUsersForDropdown = useMemo(() => {
    if (!userSearchQuery) return availableUsers;
    return availableUsers.filter(user =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
    );
  }, [availableUsers, userSearchQuery]);


  const canSubmit = useMemo(() => {
    const baseValid = !isSubmitting && !isUploadingDocument &&
      amount.trim() && parseFloat(amount) > 0 &&
      date;

    let docValid = true;
    if (isDocumentRequired) {
      docValid = !!selectedDocumentFile;
    }

    if (dialogMode === 'sendMoney') {
      return baseValid && selectedSentToUserId;
    } else {
      return baseValid && category.trim() && docValid;
    }
  }, [isSubmitting, isUploadingDocument, amount, category, date, dialogMode, selectedSentToUserId, isDocumentRequired, selectedDocumentFile]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitleText}</DialogTitle>
          <DialogDescription>{dialogDescriptionText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {dialogMode === 'addExpenseOrPurchase' && (
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
            {(dialogMode === 'addIncome' || dialogMode === 'sendMoney') && (
                 <div className="space-y-1">
                    <Label>Type</Label>
                    <Input value={type === 'income' ? 'Income' : 'Expense (Sent Money)'} readOnly disabled className="bg-muted/50"/>
                 </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="transaction-amount">Amount (BDT) *</Label>
              <Input id="transaction-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 50.00" min="0.01" step="0.01" required />
            </div>

            {dialogMode !== 'sendMoney' && (
              <div className="space-y-1">
                <Label htmlFor="transaction-category">Category *</Label>
                <Input id="transaction-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={getCategoryPlaceholder()} required />
              </div>
            )}

            {dialogMode === 'sendMoney' && (
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
                    <Command filter={() => 1}> 
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
                              {user.name}
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
              <Input id="transaction-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={dialogMode === 'sendMoney' ? "e.g., Advance salary payment" : "e.g., Weekly supermarket run"} />
            </div>

            {(type === 'expense' || type === 'purchase') && dialogMode !== 'addIncome' && (
              <div className="space-y-1">
                <Label htmlFor="transaction-document">Document Attachment {isDocumentRequired ? "*" : "(Optional)"}</Label>
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
                  {!selectedDocumentFile && <p className="text-xs text-muted-foreground mt-0.5">Max 50MB. (Images Only)</p>}
                  {!selectedDocumentFile && <p className="text-xs text-muted-foreground mt-0.5">You can also paste an image from clipboard.</p>}
                </div>
                <Input
                  id="transaction-document"
                  type="file"
                  ref={documentFileRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*" 
                />
              </div>
            )}

          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting || isUploadingDocument}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || isUploadingDocument}>
              {isUploadingDocument ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 
               isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 
               (dialogMode === 'sendMoney' ? "Record Payment" : "Add Transaction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
