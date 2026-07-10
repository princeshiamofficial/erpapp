"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Edit, Trash, MessageSquare, RefreshCw, CheckCircle2, Clock, XCircle, Inbox, PhoneCall, Calendar, ThumbsUp, ThumbsDown, Link } from "lucide-react";
import { useState, useEffect } from 'react';
import { addMenuverseComment, deleteMenuverseComment, updateMenuverseStatus, deleteMenuverseRegistration } from '@/lib/menuverse-service';
import { serverGetUserById } from '@/app/actions/auth';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import type { MenuverseRegistration } from '@/lib/menuverse-service';

type RegistrationWithId = MenuverseRegistration & { id: number, created_at: Date };

function CommentAuthorInfo({ userId }: { userId: string }) {
  const [user, setUser] = useState<{ name: string, avatarUrl?: string } | null>(null);

  useEffect(() => {
    if (userId === 'system') {
      setUser({ name: 'System' });
      return;
    }
    serverGetUserById(userId).then(u => {
      if (u) setUser({ name: u.name, avatarUrl: u.avatarUrl || undefined });
      else setUser({ name: 'Unknown User' });
    });
  }, [userId]);

  if (!user) return <span className="text-xs text-muted-foreground">Loading...</span>;

  return (
    <div className="flex items-center space-x-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.avatarUrl} alt={user.name} />
        <AvatarFallback className="text-[10px]">{user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{user.name}</span>
    </div>
  );
}

function CommentAuthorAvatar({ userId }: { userId: string }) {
  const [user, setUser] = useState<{ name: string, avatarUrl?: string } | null>(null);

  useEffect(() => {
    if (userId === 'system') {
      setUser({ name: 'System' });
      return;
    }
    serverGetUserById(userId).then(u => {
      if (u) setUser({ name: u.name, avatarUrl: u.avatarUrl || undefined });
      else setUser({ name: 'Unknown User' });
    });
  }, [userId]);

  if (!user) return <div className="h-4 w-4 rounded-full bg-muted animate-pulse flex-shrink-0" />;

  return (
    <Avatar className="h-4 w-4 flex-shrink-0">
      <AvatarImage src={user.avatarUrl} alt={user.name} />
      <AvatarFallback className="text-[8px]">{user.name.charAt(0)}</AvatarFallback>
    </Avatar>
  );
}

function RegistrationRow({ reg, onDelete }: { reg: RegistrationWithId, onDelete: () => void }) {
  const { currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] = useState(reg.status || 'New Request');

  useEffect(() => {
    if (reg.comment) {
      try {
        const parsed = JSON.parse(reg.comment);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        } else {
          setHistory([{ text: reg.comment, createdAt: reg.created_at, userId: 'system' }]);
        }
      } catch {
        setHistory([{ text: reg.comment, createdAt: reg.created_at, userId: 'system' }]);
      }
    }
  }, [reg.comment, reg.created_at]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    setIsSaving(true);
    const result = await addMenuverseComment(reg.id, newComment, currentUser.id);
    if (result.success && result.history) {
      setHistory(result.history);
      setNewComment("");
    }
    setIsSaving(false);
  };

  const handleDeleteComment = async (index: number) => {
    const result = await deleteMenuverseComment(reg.id, index);
    if (result.success && result.history) {
      setHistory(result.history);
    } else {
      alert("Failed to delete comment");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    await updateMenuverseStatus(reg.id, newStatus);
  };

  const handleDeleteRegistration = async () => {
    const result = await deleteMenuverseRegistration(reg.id);
    if (result.success) {
      onDelete();
    } else {
      alert("Failed to delete registration");
    }
  };

  return (
    <TableRow>
      <TableCell className="pl-6">
        <div className="font-medium text-gray-900">{reg.fullName}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{reg.restaurantName}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium text-gray-900">{reg.whatsappNumber}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{reg.email}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 capitalize">{reg.role}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn(
          status === 'New Request' ? 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100' :
          status === 'Contacted' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100' :
          status === 'Demo Scheduled' ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100' :
          status === 'Interested' ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100' :
          status === 'Not Interested' ? 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100' :
          status === 'Converted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
          'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100'
        )}>
          {status}
        </Badge>
      </TableCell>
      
      <TableCell>{reg.address}</TableCell>
      <TableCell>{reg.numberOfTables}</TableCell>
      <TableCell>{reg.numberOfBranches || '-'}</TableCell>
      <TableCell className="capitalize">{reg.restaurantType || 'N/A'}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {new Date(reg.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 flex items-center justify-start space-x-1.5 w-40 overflow-hidden hover:bg-muted/50 border border-transparent hover:border-border">
              {history.length > 0 ? (
                <CommentAuthorAvatar userId={history[history.length - 1].userId} />
              ) : (
                <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
              <span className="text-xs text-left truncate text-gray-700 w-full">
                {history.length > 0 ? history[history.length - 1].text : <span className="text-muted-foreground font-normal">Add comment...</span>}
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Comment History</DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[300px] pr-4 mt-2">
              {history.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No comments yet.</div>
              ) : (
                <div className="space-y-4">
                  {history.map((c, i) => (
                    <div key={i} className="bg-muted/30 p-3 rounded-md space-y-2 border">
                      <div className="flex items-center justify-between">
                        <CommentAuthorInfo userId={c.userId} />
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                          {(currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.id === c.userId) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Delete comment"
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this comment? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteComment(i)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{c.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="space-y-2 mt-4 pt-4 border-t">
              <Textarea 
                placeholder="Add a new note..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button onClick={handleAddComment} disabled={!newComment.trim() || isSaving} size="sm">
                  {isSaving ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </TableCell>
      <TableCell className="pr-6 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Change Status</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleStatusChange('New Request')}>
                    <Inbox className="mr-2 h-4 w-4 text-sky-600" />
                    <span>New Request</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('Contacted')}>
                    <PhoneCall className="mr-2 h-4 w-4 text-indigo-600" />
                    <span>Contacted</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('Demo Scheduled')}>
                    <Calendar className="mr-2 h-4 w-4 text-purple-600" />
                    <span>Demo Scheduled</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('Interested')}>
                    <ThumbsUp className="mr-2 h-4 w-4 text-amber-600" />
                    <span>Interested</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('Not Interested')}>
                    <ThumbsDown className="mr-2 h-4 w-4 text-rose-600" />
                    <span>Not Interested</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('Converted')}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                    <span>Converted</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onSelect={(e) => e.preventDefault()}>
                  <Trash className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Registration</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this demo request? This action cannot be undone and all associated comments will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRegistration} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function MenuVerseContent({ registrations = [] }: { registrations?: RegistrationWithId[] }) {
  const [localRegistrations, setLocalRegistrations] = useState(registrations);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalRegistrations(registrations);
  }, [registrations]);

  const handleRowDelete = (id: number) => {
    setLocalRegistrations(prev => prev.filter(r => r.id !== id));
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/menuverse`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Demo Requests</h2>
        <Button onClick={handleCopyLink} variant="outline" className="flex items-center space-x-2 bg-white hover:bg-gray-50 shadow-sm">
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Link className="h-4 w-4 text-gray-500" />}
          <span className={copied ? "text-emerald-700 font-medium" : "text-gray-700"}>{copied ? "Copied!" : "Share Form Link"}</span>
        </Button>
      </div>
      <Card className="shadow-xl border bg-card rounded-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="pl-6 whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Phone & Email</TableHead>
                  <TableHead className="whitespace-nowrap">Role</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  
                  <TableHead className="whitespace-nowrap">Address</TableHead>
                  <TableHead className="whitespace-nowrap">Tables</TableHead>
                  <TableHead className="whitespace-nowrap">Branches</TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Comment</TableHead>
                  <TableHead className="pr-6 whitespace-nowrap text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      No registrations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  localRegistrations.map((reg) => (
                    <RegistrationRow key={reg.id} reg={reg} onDelete={() => handleRowDelete(reg.id)} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
