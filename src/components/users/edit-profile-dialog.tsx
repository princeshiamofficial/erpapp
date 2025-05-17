
"use client";

import React, { useState, useEffect } from 'react';
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
import { UserCircle, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon

interface EditProfileDialogProps {
  children: React.ReactNode; // To use as DialogTrigger
}

export function EditProfileDialog({ children }: EditProfileDialogProps) {
  const { currentUser, updateUserAvatar } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && currentUser?.avatarUrl) {
      setAvatarUrl(currentUser.avatarUrl);
    } else if (isOpen) {
      setAvatarUrl('');
    }
  }, [isOpen, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Basic URL validation (optional, but good practice)
    try {
      new URL(avatarUrl);
    } catch (_) {
      if (avatarUrl) { // Allow empty URL to remove avatar
        toast({
          title: "Invalid URL",
          description: "Please enter a valid URL for your avatar image.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    const success = await updateUserAvatar(avatarUrl);
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
            Update your profile information. Current email: {currentUser.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="avatarUrl" className="flex items-center">
                <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Avatar URL
              </Label>
              <Input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/your-avatar.png"
              />
              <p className="text-xs text-muted-foreground pt-1">Enter the URL of your desired profile image. Leave blank to use initials.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
