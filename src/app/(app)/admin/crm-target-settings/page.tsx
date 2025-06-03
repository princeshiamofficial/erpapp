
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { CustomStatus, UserRole, User, GlobalSettings } from "@/types";
import { getStatuses } from '@/lib/status-service';
import { getUsers } from '@/lib/user-service';
import { getGlobalSettings as fetchGlobalSettings } from '@/lib/settings-service';
import {
  updateCompletionStatusIdsAction,
  updateCommentsVisibilityAction,
  updateRolesAllowedToEditOrdersAction,
  updateToastSoundUrlAction,
  updateLeaderboardBackgroundImageUrlAction,
  updateCanUsersAddExpensesAction, // Added action
  sendPushNotificationAction
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ListChecks, MessageSquare, UserCheck, Send, Users, Filter, X, CheckIcon, ChevronsUpDown, BellRing, Copy, ExternalLink, AlertTriangle, Music, Image as ImageIcon, DollarSign, Settings2 } from 'lucide-react'; // Added Settings2
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import NextImage from 'next/image';


const EDITABLE_ROLES_FOR_ORDERS: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
const NOTIFICATION_TARGET_ROLES: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
const TOAST_SOUND_STORAGE_KEY = 'colorHutToastSoundUrl';
const DEFAULT_LEADERBOARD_BACKGROUND_PLACEHOLDER = 'https://i.ibb.co/PGBMbxBc/360-F-338486227-q-Qit-Uvh3n-ILq-Yiu-QOUGxdfindo-NMbtp-H.jpg';


export default function CrmTargetSettingsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Settings states
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<Set<string>>(new Set());
  const [areCommentsVisible, setAreCommentsVisible] = useState(true);
  const [rolesAllowedToEdit, setRolesAllowedToEdit] = useState<Set<UserRole>>(new Set(['ADMIN', 'SYSTEM_ADMIN']));
  const [toastSoundUrl, setToastSoundUrl] = useState<string>('');
  const [leaderboardBgUrl, setLeaderboardBgUrl] = useState<string>('');
  const [canUsersAddExpensesSetting, setCanUsersAddExpensesSetting] = useState(true); // New setting state

  // Notification states
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationIconUrl, setNotificationIconUrl] = useState('');
  const [notificationTargetUrl, setNotificationTargetUrl] = useState('');
  const [notificationTargetType, setNotificationTargetType] = useState<'all' | 'roles' | 'users'>('all');
  const [selectedNotificationRoles, setSelectedNotificationRoles] = useState<Set<UserRole>>(new Set());
  const [selectedNotificationUserIds, setSelectedNotificationUserIds] = useState<Set<string>>(new Set());
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCrmTargets, setIsSubmittingCrmTargets] = useState(false);
  const [isSubmittingCommentsVisibility, setIsSubmittingCommentsVisibility] = useState(false);
  const [isSubmittingOrderEditingPermissions, setIsSubmittingOrderEditingPermissions] = useState(false);
  const [isSubmittingToastSound, setIsSubmittingToastSound] = useState(false);
  const [isSubmittingLeaderboardBg, setIsSubmittingLeaderboardBg] = useState(false);
  const [isSubmittingCanUsersAddExpenses, setIsSubmittingCanUsersAddExpenses] = useState(false); // New loading state
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isLoadingUsersForNotifAndTokens, setIsLoadingUsersForNotifAndTokens] = useState(false);

  // FCM Token Display State
  const [fcmUserSearchTerm, setFcmUserSearchTerm] = useState('');
  const [copiedTokenUserId, setCopiedTokenUserId] = useState<string | null>(null);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingUsersForNotifAndTokens(true);
    try {
      const [fetchedStatuses, globalSettings, fetchedUsers] = await Promise.all([
        getStatuses(),
        fetchGlobalSettings(),
        getUsers(),
      ]);
      setAllStatuses(fetchedStatuses);
      setSelectedStatusIds(new Set(globalSettings.crmCompletionStatusIds ?? []));
      setAreCommentsVisible(globalSettings.areCommentsVisibleOnPublicPage ?? true);
      setRolesAllowedToEdit(new Set(globalSettings.rolesAllowedToEditOrders ?? ['ADMIN', 'SYSTEM_ADMIN']));
      setToastSoundUrl(globalSettings.toastSoundUrl ?? '');
      setLeaderboardBgUrl(globalSettings.leaderboardBackgroundImageUrl ?? '');
      setCanUsersAddExpensesSetting(globalSettings.canUsersAddExpenses ?? true); // Set new setting

      setAllUsers(fetchedUsers.filter(u => u.role !== 'SYSTEM_ADMIN'));
    } catch (error) {
      console.error("Error fetching settings data:", error);
      toast({ title: "Error", description: "Could not load settings or user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsLoadingUsersForNotifAndTokens(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'SYSTEM_ADMIN') {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

  // --- Settings Handlers (CRM Targets, Comments, Order Editing - Unchanged) ---
  const handleCrmTargetCheckboxChange = (statusId: string, checked: boolean | "indeterminate") => {
    setSelectedStatusIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) newSet.add(statusId);
      else newSet.delete(statusId);
      return newSet;
    });
  };

  const handleSaveCrmTargets = async () => {
    setIsSubmittingCrmTargets(true);
    const result = await updateCompletionStatusIdsAction(Array.from(selectedStatusIds));
    if (result.success) toast({ title: "Settings Updated", description: "CRM completion status settings have been saved." });
    else toast({ title: "Update Failed", description: result.error || "Could not save CRM target settings.", variant: "destructive" });
    setIsSubmittingCrmTargets(false);
  };

  const handleToggleCommentsVisibility = async (newVisibility: boolean) => {
    setIsSubmittingCommentsVisibility(true);
    const result = await updateCommentsVisibilityAction(newVisibility);
    if (result.success) {
      setAreCommentsVisible(newVisibility);
      toast({ title: "Settings Updated", description: `Public comments section is now ${newVisibility ? 'visible' : 'hidden'}.` });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update comments visibility.", variant: "destructive" });
    }
    setIsSubmittingCommentsVisibility(false);
  };

  const handleRoleEditingPermissionChange = (role: UserRole, checked: boolean | "indeterminate") => {
    setRolesAllowedToEdit(prev => {
      const newSet = new Set(prev);
      if (checked === true) newSet.add(role);
      else newSet.delete(role);
      return newSet;
    });
  };

  const handleSaveOrderEditingPermissions = async () => {
    setIsSubmittingOrderEditingPermissions(true);
    const rolesToSave = Array.from(rolesAllowedToEdit).filter(role => role !== 'SYSTEM_ADMIN');
    const result = await updateRolesAllowedToEditOrdersAction(rolesToSave);
    if (result.success) toast({ title: "Settings Updated", description: "Order editing permissions have been saved." });
    else toast({ title: "Update Failed", description: result.error || "Could not save order editing permissions.", variant: "destructive" });
    setIsSubmittingOrderEditingPermissions(false);
  };

  // --- New Toast Sound Handler ---
  const handleSaveToastSoundUrl = async () => {
    setIsSubmittingToastSound(true);
    const urlToSave = toastSoundUrl.trim() === '' ? null : toastSoundUrl.trim();
    const result = await updateToastSoundUrlAction(urlToSave);
    if (result.success) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOAST_SOUND_STORAGE_KEY, urlToSave ?? '');
      }
      toast({ title: "Settings Updated", description: "Toast notification sound URL has been saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save toast sound URL.", variant: "destructive" });
    }
    setIsSubmittingToastSound(false);
  };

  // --- New Leaderboard Background Image Handler ---
  const handleSaveLeaderboardBgUrl = async () => {
    setIsSubmittingLeaderboardBg(true);
    const urlToSave = leaderboardBgUrl.trim() === '' ? null : leaderboardBgUrl.trim();
    const result = await updateLeaderboardBackgroundImageUrlAction(urlToSave);
    if (result.success) {
      toast({ title: "Settings Updated", description: "Leaderboard background image URL has been saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save leaderboard background image URL.", variant: "destructive" });
    }
    setIsSubmittingLeaderboardBg(false);
  };

  // --- New Expense Logging Permission Handler ---
  const handleToggleCanUsersAddExpenses = async (canAdd: boolean) => {
    setIsSubmittingCanUsersAddExpenses(true);
    const result = await updateCanUsersAddExpensesAction(canAdd);
    if (result.success) {
      setCanUsersAddExpensesSetting(canAdd);
      toast({ title: "Settings Updated", description: `Non-admin expense logging is now ${canAdd ? 'enabled' : 'disabled'}.` });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update expense logging permission.", variant: "destructive" });
    }
    setIsSubmittingCanUsersAddExpenses(false);
  };


  // --- Notification Handlers (Unchanged) ---
  const handleNotificationRoleCheckboxChange = (role: UserRole, checked: boolean | "indeterminate") => {
    setSelectedNotificationRoles(prev => {
      const newSet = new Set(prev);
      if (checked === true) newSet.add(role);
      else newSet.delete(role);
      return newSet;
    });
  };

  const handleNotificationUserSelect = (userId: string) => {
    setSelectedNotificationUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) newSet.delete(userId);
      else newSet.add(userId);
      return newSet;
    });
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { toast({ title: "Authentication Error", description: "Cannot send notification.", variant: "destructive" }); return; }
    if (!notificationTitle.trim() || !notificationBody.trim()) { toast({ title: "Validation Error", description: "Notification title and body are required.", variant: "destructive" }); return; }
    if (notificationTargetType === 'roles' && selectedNotificationRoles.size === 0) { toast({ title: "Validation Error", description: "Please select at least one role for role-based targeting.", variant: "destructive" }); return; }
    if (notificationTargetType === 'users' && selectedNotificationUserIds.size === 0) { toast({ title: "Validation Error", description: "Please select at least one user for user-based targeting.", variant: "destructive" }); return; }

    setIsSendingNotification(true);
    const payload = {
      title: notificationTitle.trim(), body: notificationBody.trim(),
      iconUrl: notificationIconUrl.trim() || undefined, targetUrl: notificationTargetUrl.trim() || undefined,
      soundUrl: toastSoundUrl.trim() || undefined, // Use the globally set toast sound for notifications too
      targetType: notificationTargetType,
      targetRoles: notificationTargetType === 'roles' ? Array.from(selectedNotificationRoles) : undefined,
      targetUserIds: notificationTargetType === 'users' ? Array.from(selectedNotificationUserIds) : undefined,
    };
    const result = await sendPushNotificationAction(payload, currentUser);
    setIsSendingNotification(false);
    if (result.success) {
      toast({ title: "Notification Send Attempted", description: result.message });
      setNotificationTitle(''); setNotificationBody(''); setNotificationIconUrl(''); setNotificationTargetUrl('');
    } else {
      toast({ title: "Notification Failed", description: result.error || "Could not send notification.", variant: "destructive" });
    }
  };

  const selectedUsersDisplay = useMemo(() => {
    if (selectedNotificationUserIds.size === 0) return "Select users...";
    if (selectedNotificationUserIds.size > 2) return `${selectedNotificationUserIds.size} users selected`;
    return Array.from(selectedNotificationUserIds).map(id => allUsers.find(u => u.id === id)?.name || id).join(", ");
  }, [selectedNotificationUserIds, allUsers]);

  // --- FCM Token Display Logic (Unchanged) ---
  const filteredFcmUsers = useMemo(() => {
    const usersForTokenDisplay = allUsers;
    if (!fcmUserSearchTerm) return usersForTokenDisplay;
    return usersForTokenDisplay.filter(user =>
      user.name.toLowerCase().includes(fcmUserSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(fcmUserSearchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(fcmUserSearchTerm.toLowerCase())
    );
  }, [allUsers, fcmUserSearchTerm]);

  const handleCopyFcmToken = async (token: string, userId: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast({ title: "Token Copied!", description: "FCM token copied to clipboard." });
      setCopiedTokenUserId(userId);
      setTimeout(() => setCopiedTokenUserId(null), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy token.", variant: "destructive" });
      console.error("Failed to copy FCM token:", err);
    }
  };


  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be a System Administrator to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Application Settings</h1>
          <p className="page-description">
            Configure CRM targets, public page features, order editing, notifications, and view FCM tokens.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* CRM Target Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary" />CRM Target Completion Statuses</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">Select which order statuses count as "completed" for CRM targets.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-40 rounded" /></div>)}</div>
            : allStatuses.length === 0 ? <p className="text-muted-foreground">No order statuses found. Configure statuses first.</p>
            : <ScrollArea className="h-[calc(50vh-200px)] pr-3"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {allStatuses.map((status) => (<div key={status.id} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                    <Checkbox id={`status-${status.id}`} checked={selectedStatusIds.has(status.id)} onCheckedChange={(checked) => handleCrmTargetCheckboxChange(status.id, checked)} disabled={isSubmittingCrmTargets} />
                    <Label htmlFor={`status-${status.id}`} className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer">
                      <span className="h-4 w-4 rounded-sm border border-border" style={{ backgroundColor: status.color }} title={status.name}/>{status.name}
                      {status.isSystemStatus && <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm border border-border">System</span>}
                    </Label></div>))}
              </div></ScrollArea>}
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveCrmTargets} disabled={isLoading || isSubmittingCrmTargets || allStatuses.length === 0}>{isSubmittingCrmTargets ? "Saving..." : "Save CRM Target Settings"}</Button>
        </CardFooter>
      </Card>

      <Separator className="my-8" />

      {/* Feature Visibility Settings Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Settings2 className="h-6 w-6 text-primary" />Feature Visibility & Permissions</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">Control features on public pages and define editing rights.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {isLoading ? (
            <>
              <div className="flex items-center space-x-2"><Skeleton className="h-6 w-6 rounded" /><Skeleton className="h-5 w-48 rounded" /></div>
              <div className="flex items-center space-x-2"><Skeleton className="h-6 w-6 rounded" /><Skeleton className="h-5 w-52 rounded" /></div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                <Label htmlFor="commentsVisibilitySwitch" className="flex flex-col space-y-1 cursor-pointer">
                  <span>Comments Section Visibility (Public Tracking)</span><span className="font-normal leading-snug text-muted-foreground text-xs">Show or hide comments on public order tracking pages.</span>
                </Label>
                <Switch id="commentsVisibilitySwitch" checked={areCommentsVisible} onCheckedChange={handleToggleCommentsVisibility} disabled={isSubmittingCommentsVisibility} aria-label="Toggle comments section visibility"/>
              </div>
              <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                <Label htmlFor="canUsersAddExpensesSwitch" className="flex flex-col space-y-1 cursor-pointer">
                  <span>Enable Expense Logging for Non-Admins</span>
                  <span className="font-normal leading-snug text-muted-foreground text-xs">
                    Allows CRM, Admin, and Designer Representative roles to add their own expenses. System Admins can always log expenses.
                  </span>
                </Label>
                <Switch
                  id="canUsersAddExpensesSwitch"
                  checked={canUsersAddExpensesSetting}
                  onCheckedChange={handleToggleCanUsersAddExpenses}
                  disabled={isSubmittingCanUsersAddExpenses}
                  aria-label="Toggle non-admin expense logging"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>


      <Separator className="my-8" />

      {/* Order Management Permissions Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary" /> Order Management Permissions</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which user roles are permitted to edit order details. System Admins always have permission.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-52 rounded" /></div>)}</div>
            : <ScrollArea className="h-auto pr-3"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {EDITABLE_ROLES_FOR_ORDERS.map((role) => (<div key={role} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                    <Checkbox id={`role-edit-perm-${role}`} checked={rolesAllowedToEdit.has(role)} onCheckedChange={(checked) => handleRoleEditingPermissionChange(role, checked)} disabled={isSubmittingOrderEditingPermissions}/>
                    <Label htmlFor={`role-edit-perm-${role}`} className="text-sm font-medium leading-none cursor-pointer">{role.replace(/_/g, ' ')}</Label></div>))}
              </div></ScrollArea>}
        </CardContent>
         <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveOrderEditingPermissions} disabled={isLoading || isSubmittingOrderEditingPermissions}>{isSubmittingOrderEditingPermissions ? "Saving..." : "Save Editing Permissions"}</Button>
        </CardFooter>
      </Card>

      <Separator className="my-8" />

      {/* Toast Notification Sound Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" /> Toast Notification Sound
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Set a custom sound URL for toast notifications. Leave blank to use default or disable sound if default is none.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="toastSoundUrlInput">Sound URL</Label>
              <Input
                id="toastSoundUrlInput"
                value={toastSoundUrl}
                onChange={(e) => setToastSoundUrl(e.target.value)}
                placeholder="e.g., https://example.com/sound.mp3 or /sounds/custom-toast.mp3"
                disabled={isSubmittingToastSound}
              />
              <p className="text-xs text-muted-foreground">
                Provide a full URL or a relative path from the public folder. Ensure the sound file is small for quick loading.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveToastSoundUrl} disabled={isLoading || isSubmittingToastSound}>
            {isSubmittingToastSound ? "Saving..." : "Save Toast Sound"}
          </Button>
        </CardFooter>
      </Card>

      <Separator className="my-8" />

      {/* Leaderboard Background Image Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" /> Leaderboard Background Image
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Set a custom background image URL for the leaderboard page. Leave blank to use the default image.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-24 w-40 rounded-md mt-2" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="leaderboardBgUrlInput">Background Image URL</Label>
              <Input
                id="leaderboardBgUrlInput"
                value={leaderboardBgUrl}
                onChange={(e) => setLeaderboardBgUrl(e.target.value)}
                placeholder="e.g., https://example.com/leaderboard-bg.jpg or /images/leaderboard.png"
                disabled={isSubmittingLeaderboardBg}
              />
              <p className="text-xs text-muted-foreground">
                Provide a full URL or a relative path from the public folder.
              </p>
              {leaderboardBgUrl && (
                <div className="mt-4 p-2 border rounded-md inline-block bg-muted">
                  <NextImage
                    src={leaderboardBgUrl}
                    alt="Leaderboard background preview"
                    width={200}
                    height={120}
                    className="object-cover rounded"
                    unoptimized={leaderboardBgUrl.startsWith('/')} // For relative paths
                    onError={(e) => { e.currentTarget.src = DEFAULT_LEADERBOARD_BACKGROUND_PLACEHOLDER; e.currentTarget.alt = 'Error loading image. Default shown.' }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveLeaderboardBgUrl} disabled={isLoading || isSubmittingLeaderboardBg}>
            {isSubmittingLeaderboardBg ? "Saving..." : "Save Leaderboard Background"}
          </Button>
        </CardFooter>
      </Card>

      <Separator className="my-8" />

      {/* User FCM Tokens Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" /> User FCM Tokens
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            View Firebase Cloud Messaging tokens for registered users. Useful for direct notification testing via Firebase Console.
          </CardDescription>
           <div className="relative mt-4">
            <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, role..."
              value={fcmUserSearchTerm}
              onChange={(e) => setFcmUserSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingUsersForNotifAndTokens ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={`fcm-skel-${i}`} className="h-12 w-full rounded-md" />)}
            </div>
          ) : filteredFcmUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Users className="mx-auto h-10 w-10 opacity-50 mb-2" />
              No users found {fcmUserSearchTerm ? `matching "${fcmUserSearchTerm}"` : "or no tokens registered."}
            </div>
          ) : (
            <ScrollArea className="h-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>FCM Token</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFcmUsers.map(user => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="pl-6 font-medium">
                        <div>{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>{user.role.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        {user.fcmToken ? (
                          <span className="font-mono text-xs bg-secondary px-2 py-1 rounded-md border border-border/40 block max-w-xs truncate" title={user.fcmToken}>
                            {user.fcmToken}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No token / Not permitted</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {user.fcmToken ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyFcmToken(user.fcmToken!, user.id)}
                            className="h-8 px-2.5"
                          >
                            {copiedTokenUserId === user.id ? <CheckIcon className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            <span className="ml-1.5 text-xs">{copiedTokenUserId === user.id ? "Copied!" : "Copy"}</span>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled className="h-8 px-2.5 text-xs">No Token</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Send Push Notification Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <Send className="h-6 w-6 text-primary" /> Send Push Notification
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Compose and send a push notification. Use <code className="bg-muted px-1 py-0.5 rounded text-xs">%name%</code> and <code className="bg-muted px-1 py-0.5 rounded text-xs">%role%</code> for personalization.
             <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                Test with Firebase Console <ExternalLink className="inline-block h-3 w-3 ml-0.5"/>
              </a>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSendNotification}>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="notifTitle">Title *</Label>
              <Input id="notifTitle" value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} placeholder="e.g., New Feature for %role%!" required disabled={isSendingNotification}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notifBody">Body *</Label>
              <Textarea id="notifBody" value={notificationBody} onChange={(e) => setNotificationBody(e.target.value)} placeholder="Hi %name%, check out this update..." required disabled={isSendingNotification}/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="notifIconUrl">Icon URL (Optional)</Label>
                <Input id="notifIconUrl" value={notificationIconUrl} onChange={(e) => setNotificationIconUrl(e.target.value)} placeholder="e.g., /icons/icon-192x192.png" disabled={isSendingNotification}/>
                 <p className="text-xs text-muted-foreground">Default is app icon. Must be absolute URL or path from public folder.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notifTargetUrl">Target URL (Optional)</Label>
                <Input id="notifTargetUrl" value={notificationTargetUrl} onChange={(e) => setNotificationTargetUrl(e.target.value)} placeholder="e.g., /dashboard" disabled={isSendingNotification}/>
                <p className="text-xs text-muted-foreground">URL to open on notification click. Relative or absolute.</p>
              </div>
            </div>
            <Separator className="my-4"/>
            <div className="space-y-2">
              <Label className="text-md font-medium">Target Audience *</Label>
              <RadioGroup value={notificationTargetType} onValueChange={(value) => setNotificationTargetType(value as 'all' | 'roles' | 'users')} className="flex flex-col sm:flex-row gap-4" disabled={isSendingNotification}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="targetAll" /><Label htmlFor="targetAll">All Users</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="roles" id="targetRoles" /><Label htmlFor="targetRoles">Specific Roles</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="users" id="targetUsers" /><Label htmlFor="targetUsers">Specific Users</Label></div>
              </RadioGroup>
            </div>
            {notificationTargetType === 'roles' && (
              <div className="p-4 border rounded-md bg-secondary/30 mt-2">
                <Label className="mb-2 block text-sm font-medium">Select Roles *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {NOTIFICATION_TARGET_ROLES.map(role => (<div key={role} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 bg-background">
                      <Checkbox id={`notif-role-${role}`} checked={selectedNotificationRoles.has(role)} onCheckedChange={(checked) => handleNotificationRoleCheckboxChange(role, checked)} disabled={isSendingNotification}/>
                      <Label htmlFor={`notif-role-${role}`} className="text-sm font-normal cursor-pointer">{role.replace(/_/g, ' ')}</Label></div>))}
                </div>
              </div>)}
            {notificationTargetType === 'users' && (
              <div className="p-4 border rounded-md bg-secondary/30 mt-2">
                <Label className="mb-2 block text-sm font-medium">Select Users *</Label>
                {isLoadingUsersForNotifAndTokens ? <Skeleton className="h-10 w-full rounded-md" />
                : <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isUserPopoverOpen} className="w-full justify-between bg-background" disabled={isSendingNotification || allUsers.filter(u => u.role !== 'SYSTEM_ADMIN').length === 0}>
                        <span className="truncate">{selectedUsersDisplay}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command><CommandInput placeholder="Search user..." disabled={isSendingNotification}/>
                        <CommandList><CommandEmpty>No user found.</CommandEmpty>
                          <CommandGroup>
                            {allUsers.filter(u => u.role !== 'SYSTEM_ADMIN').map((user) => (<CommandItem key={user.id} value={`${user.name} ${user.email} ${user.role}`} onSelect={() => handleNotificationUserSelect(user.id)} disabled={isSendingNotification} className="cursor-pointer">
                                <CheckIcon className={cn("mr-2 h-4 w-4", selectedNotificationUserIds.has(user.id) ? "opacity-100" : "opacity-0")}/>
                                {user.name} <span className="text-xs text-muted-foreground ml-1">({user.role.replace(/_/g, ' ')})</span></CommandItem>))}
                          </CommandGroup></CommandList></Command></PopoverContent></Popover>}
                 {selectedNotificationUserIds.size > 0 && (<div className="mt-2 text-xs"><span className="font-medium">Selected: </span><span className="text-muted-foreground">{Array.from(selectedNotificationUserIds).map(id => allUsers.find(u => u.id === id)?.name).filter(Boolean).join(", ")}</span></div>)}
              </div>)}
          </CardContent>
          <CardFooter className="border-t p-5 flex justify-end">
            <Button type="submit" disabled={isSendingNotification || !notificationTitle.trim() || !notificationBody.trim()}>{isSendingNotification ? "Sending..." : <><Send className="mr-2 h-4 w-4"/> Send Notification</>}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
