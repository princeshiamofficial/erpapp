"use client";

import React, { useState, useRef, useEffect } from 'react';
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
import type { User } from "@/types";
import { FileText, UploadCloud, XCircle, Loader2, FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadPDFDocumentAction } from '@/app/(app)/hrm/documentation/document-actions';

interface UploadDocumentDialogProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: (userId: string) => void;
}

export function UploadDocumentDialog({ user, isOpen, onOpenChange, onUploadSuccess }: UploadDocumentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Only PDF files are allowed.",
          variant: "destructive"
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Max file size is 5MB.",
          variant: "destructive"
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await uploadPDFDocumentAction(formData, user.id);

      if (result.success) {
        toast({
          title: "Success",
          description: `Document for ${user.name} uploaded successfully.`,
        });
        onUploadSuccess(user.id);
        onOpenChange(false);
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Could not upload document.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" /> Upload Document for {user.name}
          </DialogTitle>
          <DialogDescription>
            Only PDF format is allowed. Max size 5MB.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-6">
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <>
                    <div className="p-3 bg-primary/10 rounded-full">
                      <FileIcon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground max-w-[200px] truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-muted rounded-full text-muted-foreground">
                      <UploadCloud className="h-10 w-10" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to upload PDF</p>
                      <p className="text-xs text-muted-foreground">PDF only, up to 5MB</p>
                    </div>
                  </>
                )}
              </div>
              
              <Input
                type="file"
                accept=".pdf"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />
              
              {selectedFile && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFile(null)} 
                  className="w-full text-xs text-muted-foreground hover:text-destructive" 
                  disabled={isLoading}
                >
                  <XCircle className="mr-1 h-3 w-3" /> Remove File
                </Button>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
                type="submit" 
                disabled={isLoading || !selectedFile}
                className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Now"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
