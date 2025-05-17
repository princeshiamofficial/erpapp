
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
import { UserCircle, UploadCloud, XCircle, Eye, EyeOff } from 'lucide-react';

interface AddUserDialogProps {
  onUserAdded: (newUser: Omit<User, 'id'>) => Promise<void>; 
  currentUser: User; 
  children: React.ReactNode;
}

const ALL_USER_ROLES: UserRole[] = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"];

export function AddUserDialog({ onUserAdded, currentUser, children }: AddUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [password, setPassword] = useState('password'); 
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setCompanyName('');
      setRole(undefined);
      setPassword('password');
      setShowPassword(false);
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
      setPreviewUrl(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedFile]);

  const getAssignableRoles = (): UserRole[] => {
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return ALL_USER_ROLES;
    }
    if (currentUser.role === 'ADMIN') {
      return ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
    }
    return [];
  };
  const assignableRoles = getAssignableRoles();


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
    if (!name || !email || !role || !password) {
      toast({
        title: "Validation Error",
        description: "Name, email, role, and password are required.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
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
        setIsSubmitting(false);
        return;
      }
    }

    const newUser: Omit<User, 'id'> = { 
      name,
      email,
      role,
      password, 
      companyName: companyName || undefined,
      avatarUrl: avatarBase64Url,
      monthlyOrderTarget: 0, 
      weeklyOrderTarget: 0,  
    };

    try {
      await onUserAdded(newUser);
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding user:", error);
      toast({
        title: "Error",
        description: "Could not add user. It's possible the email is already in use or there was a database issue.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Enter the details for the new user. Default password is 'password'.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name-add" className="text-right">Name</Label>
              <Input id="name-add" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email-add" className="text-right">Email</Label>
              <Input id="email-add" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password-add" className="text-right">Password</Label>
              <div className="col-span-3 relative">
                <Input 
                  id="password-add" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="pr-10" 
                  required 
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="companyName-add" className="text-right">Company</Label>
              <Input id="companyName-add" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role-add" className="text-right">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)} required>
                <SelectTrigger id="role-add" className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map(r => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4 mt-2">
              <Label htmlFor="avatarFile-add" className="text-right pt-2">Avatar</Label>
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
                      disabled={isSubmitting}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" /> {selectedFile ? "Change" : "Upload"}
                    </Button>
                    {selectedFile && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemovePreview} className="text-xs text-muted-foreground hover:text-destructive" disabled={isSubmitting}>
                        <XCircle className="mr-1 h-3 w-3" /> Clear
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  id="avatarFile-add"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Max 2MB.
                  {selectedFile && <span className="block mt-0.5">Selected: {selectedFile.name}</span>}
                </p>
              </div>
            </div>

          </div>
          <DialogFooter className="pt-4 border-t border-border/30">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? "Adding User..." : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
