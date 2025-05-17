
"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, UploadCloud, XCircle } from 'lucide-react';
import Image from 'next/image';

interface EditProfileDialogProps {
  children: React.ReactNode; // To use as DialogTrigger
}

export function EditProfileDialog({ children }: EditProfileDialogProps) {
  const { currentUser, updateUserAvatar } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
    } else {
      setPreviewUrl(currentUser?.avatarUrl || null);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (e.g., JPG, PNG, GIF).",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemovePreview = () => {
    setSelectedFile(null);
    setPreviewUrl(currentUser?.avatarUrl || null); // Revert to current or no avatar
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear the file input
    }
  };
  
  const handleRemoveAvatar = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    const success = await updateUserAvatar(""); // Pass empty string to signify removal
    setIsLoading(false);

    if (success) {
      toast({
        title: "Avatar Removed",
        description: "Your profile picture has been removed.",
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Optionally close dialog: setIsOpen(false);
    } else {
      toast({
        title: "Update Failed",
        description: "Could not remove your profile picture. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!selectedFile && previewUrl === currentUser?.avatarUrl) {
      // No changes made
      setIsOpen(false);
      return;
    }
    
    if (!selectedFile && previewUrl === null && currentUser?.avatarUrl) {
      // This case could be "remove avatar" if we add a button for it
      // For now, it means no new file selected, but existing avatar was cleared by some other means (not possible with current UI)
      // Or handled by handleRemoveAvatar if it sets previewUrl to null.
    }


    setIsLoading(true);

    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        const base64DataUrl = reader.result as string;
        const success = await updateUserAvatar(base64DataUrl);
        setIsLoading(false);
        if (success) {
          toast({
            title: "Profile Updated",
            description: "Your profile picture has been updated.",
          });
          setIsOpen(false);
        } else {
          toast({
            title: "Update Failed",
            description: "Could not update your profile picture. Please try again.",
            variant: "destructive",
          });
        }
      };
      reader.onerror = () => {
        setIsLoading(false);
        toast({
          title: "File Read Error",
          description: "Could not read the selected file. Please try again.",
          variant: "destructive",
        });
      };
    } else if (previewUrl === null && currentUser?.avatarUrl) { 
        // This path is taken if handleRemoveAvatar was called successfully and it cleared previewUrl
        // and user then clicks save changes. In this case, avatar is already removed.
        setIsLoading(false);
        setIsOpen(false);
    } else {
         // No file selected, but potentially an avatar was removed if previewUrl is null
        // This case is explicitly handled by handleRemoveAvatar if user clicks that button.
        // If user simply opens dialog, makes no change, and hits save, nothing happens.
        setIsLoading(false);
        setIsOpen(false);
    }
  };
  

  if (!currentUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCircle className="mr-2 h-5 w-5 text-primary" /> Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your profile picture. Current email: {currentUser.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="avatarFile" className="flex items-center">
                Profile Picture
              </Label>
              <div className="flex items-center gap-4">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Avatar preview"
                    width={80}
                    height={80}
                    className="rounded-full object-cover border border-muted"
                    data-ai-hint="user avatar"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border border-dashed">
                    <UserCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                   <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <UploadCloud className="mr-2 h-4 w-4" /> {selectedFile ? "Change Image" : "Upload Image"}
                  </Button>
                  <Input
                    id="avatarFile"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemovePreview} className="text-xs text-muted-foreground hover:text-destructive">
                      <XCircle className="mr-1 h-3 w-3" /> Cancel Selection
                    </Button>
                  )}
                </div>
              </div>
               {currentUser.avatarUrl && !selectedFile && (
                <Button type="button" variant="link" size="sm" onClick={handleRemoveAvatar} className="text-destructive hover:text-destructive/80 px-0 mt-2" disabled={isLoading}>
                  Remove Current Avatar
                </Button>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                Upload an image (JPG, PNG, GIF). Max 2MB.
                {selectedFile && <span className="block mt-1">Selected: {selectedFile.name}</span>}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || (!selectedFile && previewUrl === currentUser?.avatarUrl && !(previewUrl === null && currentUser?.avatarUrl)) }>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
