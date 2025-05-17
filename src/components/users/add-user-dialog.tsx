
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, UserRole } from "@/types";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { UserCircle, UploadCloud, XCircle } from 'lucide-react';

interface AddUserDialogProps {
  onUserAdded: (newUser: User) => void;
  children: React.ReactNode;
}

const USER_ROLES: UserRole[] = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"];

export function AddUserDialog({ onUserAdded, children }: AddUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      // Reset form fields when dialog closes
      setName('');
      setEmail('');
      setCompanyName('');
      setRole(undefined);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);
  
  useEffect(() => {
    let objectUrl: string | null = null;
    if (selectedFile) {
      objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null); // Clear preview if no file selected
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
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !role) {
      toast({
        title: "Validation Error",
        description: "Name, email, and role are required.",
        variant: "destructive",
      });
      return;
    }

    let avatarBase64Url: string | undefined = undefined;

    if (selectedFile) {
      try {
        avatarBase64Url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      } catch (error) {
        toast({
          title: "Avatar Upload Error",
          description: "Could not process the avatar image. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const newUser: User = {
      id: `user-${Date.now()}`, // Simple unique ID for mock
      name,
      email,
      role,
      companyName: companyName || undefined,
      avatarUrl: avatarBase64Url,
      password: 'password', // Default password for new users
    };

    onUserAdded(newUser);
    toast({
      title: "User Added",
      description: `${name} has been added successfully.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg"> {/* Increased width slightly */}
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Enter the details for the new user. Default password is 'password'.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyName" className="text-right">Company</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Avatar Upload Section */}
            <div className="grid grid-cols-4 items-start gap-4 mt-2">
              <Label htmlFor="avatarFile" className="text-right pt-2">Avatar</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-4">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Avatar preview"
                      width={64}
                      height={64}
                      className="rounded-full object-cover border border-muted"
                      data-ai-hint="user avatar"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border border-dashed">
                      <UserCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                     <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" /> {selectedFile ? "Change" : "Upload"}
                    </Button>
                    {selectedFile && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemovePreview} className="text-xs text-muted-foreground hover:text-destructive">
                        <XCircle className="mr-1 h-3 w-3" /> Clear
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  id="avatarFile"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Max 2MB.
                  {selectedFile && <span className="block mt-0.5">Selected: {selectedFile.name}</span>}
                </p>
              </div>
            </div>

          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
