
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Vendor } from "@/types";
import { Loader2 } from 'lucide-react';

interface DeleteVendorDialogProps {
  vendor: Vendor | null;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteVendorDialog({ vendor, onConfirmDelete, isDeleting, isOpen, onOpenChange }: DeleteVendorDialogProps) {
  if (!vendor) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isDeleting && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the vendor "<span className="font-semibold">{vendor.name}</span>". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Vendor"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
