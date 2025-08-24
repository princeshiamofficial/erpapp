
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from 'lucide-react';

interface FileUploadConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (wasUploaded: boolean) => void;
}

export function FileUploadConfirmationDialog({ isOpen, onOpenChange, onConfirm }: FileUploadConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            File Upload Confirmation
          </AlertDialogTitle>
          <AlertDialogDescription>
            Has the necessary file for this project been uploaded to the server?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onConfirm(false)}>No</Button>
          <Button onClick={() => onConfirm(true)}>Yes, File Uploaded</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
