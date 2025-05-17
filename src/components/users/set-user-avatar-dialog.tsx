
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
import type { User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { UserCog, UploadCloud, XCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface SetUserAvatarDialogProps {
  user: User;
  onAvatarChanged: (userId: string, avatarUrl: string | null) => Promise<boolean>; // Allow null for removal
  children: React.ReactNode; // To use as DialogTrigger
}

export function SetUserAvatarDialog({ user, onAvatarChanged, children }: SetUserAvatarDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatarUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(user.avatarUrl || null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen, user.avatarUrl]);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    }
    // If no file selected, previewUrl is already set to user.avatarUrl or null by the other effect

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
    setPreviewUrl(user.avatarUrl || null); // Revert to original avatar or null
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setIsLoading(true);
    const success = await onAvatarChanged(user.id, null); // Pass null to signify removal
    setIsLoading(false);

    if (success) {
      toast({
        title: "Avatar Removed",
        description: `${user.name}'s profile picture has been removed.`,
      });
      setSelectedFile(null);
      setPreviewUrl(null); // Update preview to show no avatar
      // Optionally close dialog: setIsOpen(false);
    } else {
      toast({
        title: "Update Failed",
        description: `Could not remove ${user.name}'s profile picture.`,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        const base64DataUrl = reader.result as string;
        const success = await onAvatarChanged(user.id, base64DataUrl);
        setIsLoading(false);
        if (success) {
          toast({
            title: "Avatar Updated",
            description: `${user.name}'s profile picture has been updated.`,
          });
          setIsOpen(false);
        } else {
          toast({
            title: "Update Failed",
            description: `Could not update ${user.name}'s profile picture.`,
            variant: "destructive",
          });
        }
      };
      reader.onerror = () => {
        setIsLoading(false);
        toast({
          title: "File Read Error",
          description: "Could not read the selected file.",
          variant: "destructive",
        });
      };
    } else if (previewUrl === null && user.avatarUrl) {
      // This means the avatar was removed (via handleRemoveAvatar which sets previewUrl to null)
      // and now the user is saving this "removed" state.
      // The actual removal was handled by onAvatarChanged(user.id, null) already.
      // So we can just close.
      setIsLoading(false);
      setIsOpen(false);
    } else if (!selectedFile && previewUrl === user.avatarUrl) {
        // No changes made
        setIsLoading(false);
        setIsOpen(false);
        return;
    } else {
      // Should not happen if logic is correct, means no file but preview changed without selection?
      setIsLoading(false);
      toast({
        title: "No Changes",
        description: "No new avatar was selected.",
        variant: "default"
      });
      setIsOpen(false);
    }
  };
  
  const noChangeMade = !selectedFile && previewUrl === (user.avatarUrl || null);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCog className="mr-2 h-5 w-5 text-primary" /> Set Avatar for {user.name}
          </DialogTitle>
          <DialogDescription>
            Manage the profile picture for {user.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="avatarFileAdmin" className="text-sm font-medium">
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
                    <UserCog className="h-10 w-10 text-muted-foreground" />
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
                    id="avatarFileAdmin"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" // Visually hidden, triggered by button
                  />
                  {selectedFile && ( // Show cancel selection only if a new file is staged
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemovePreview} className="text-xs text-muted-foreground hover:text-destructive">
                      <XCircle className="mr-1 h-3 w-3" /> Cancel Selection
                    </Button>
                  )}
                </div>
              </div>
               {/* Show remove button if there's an existing avatar AND no new file is selected for upload */}
              {user.avatarUrl && !selectedFile && previewUrl && (
                <Button type="button" variant="link" size="sm" onClick={handleRemoveAvatar} className="text-destructive hover:text-destructive/80 px-0 mt-2 flex items-center" disabled={isLoading}>
                  <Trash2 className="mr-1 h-4 w-4" /> Remove Current Avatar
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
            <Button type="submit" disabled={isLoading || noChangeMade}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
