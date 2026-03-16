

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
import type { CustomStatus, UserRole, User, GlobalSettings, ExpenseLoggingPermissions, ExpenseLoggingMode, ProjectStatusType, RoleBasedTarget } from "@/types";
import { getStatuses } from '@/lib/status-service';
import { getUsers } from '@/lib/user-service';
import { getGlobalSettings as fetchGlobalSettings } from '@/lib/settings-service';
import {
  updateCompletionStatusIdsAction,
  updateCommentsVisibilityAction,
  updateToastSoundUrlAction,
  updateLeaderboardBackgroundImageUrlAction,
  updateExpenseLoggingPermissionsAction,
  updateMaintenanceModeAction,
  updateDrAssignmentNotificationTemplatesAction,
  updateRoleBasedTargetsAction,
  updateTelegramSettingsAction,
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ListChecks, MessageSquare, Send, Users, Filter, X, CheckIcon, ChevronsUpDown, BellRing, Copy, ExternalLink, AlertTriangle, Music, Image as ImageIcon, Settings2, PowerOff, DraftingCompass, Target } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import NextImage from 'next/image';



const EXPENSE_LOGGING_TARGET_ROLES: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE', 'VENDOR', 'LR'];
const DEFAULT_LEADERBOARD_BACKGROUND_PLACEHOLDER = 'https://i.ibb.co/PGBMbxBc/360-F-338486227-q-Qit-Uvh3n-ILq-Yiu-QOUGxdfindo-NMbtp-H.jpg';


export default function CrmTargetSettingsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Settings states
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<Set<string>>(new Set());
  const [areCommentsVisible, setAreCommentsVisible] = useState(true);
  const [toastSoundUrl, setToastSoundUrl] = useState<string>('');
  const [leaderboardBgUrl, setLeaderboardBgUrl] = useState<string>('');
  const [expenseLoggingPerms, setExpenseLoggingPerms] = useState<ExpenseLoggingPermissions>({
    mode: 'all', allowedRoles: [], allowedUserIds: []
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [drNotifTitle, setDrNotifTitle] = useState('');
  const [drNotifBody, setDrNotifBody] = useState('');
  const [roleBasedTargets, setRoleBasedTargets] = useState<RoleBasedTarget>({ CRM: 50, DESIGNER_REPRESENTATIVE: 20, LR: 100 });
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatIds, setTelegramChatIds] = useState('');


  const [allTargetableUsersForExpensePerms, setAllTargetableUsersForExpensePerms] = useState<User[]>([]); // For expense perm user picker
  const [isExpenseUserPopoverOpen, setIsExpenseUserPopoverOpen] = useState(false);


  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCrmTargets, setIsSubmittingCrmTargets] = useState(false);
  const [isSubmittingCommentsVisibility, setIsSubmittingCommentsVisibility] = useState(false);
  const [isSubmittingToastSound, setIsSubmittingToastSound] = useState(false);
  const [isSubmittingLeaderboardBg, setIsSubmittingLeaderboardBg] = useState(false);
  const [isSubmittingExpensePerms, setIsSubmittingExpensePerms] = useState(false);
  const [isSubmittingMaintenanceMode, setIsSubmittingMaintenanceMode] = useState(false);
  const [isSubmittingDrNotif, setIsSubmittingDrNotif] = useState(false);
  const [isSubmittingRoleTargets, setIsSubmittingRoleTargets] = useState(false);
  const [isSubmittingTelegram, setIsSubmittingTelegram] = useState(false);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedStatuses, globalSettings, fetchedUsersDb] = await Promise.all([
        getStatuses(),
        fetchGlobalSettings(),
        getUsers(), // Fetch all users once from DB
      ]);
      setAllStatuses(fetchedStatuses);
      setSelectedStatusIds(new Set(globalSettings.crmCompletionStatusIds ?? []));
      setAreCommentsVisible(globalSettings.areCommentsVisibleOnPublicPage ?? true);
      setToastSoundUrl(globalSettings.toastSoundUrl ?? '');
      setLeaderboardBgUrl(globalSettings.leaderboardBackgroundImageUrl ?? '');
      setExpenseLoggingPerms(globalSettings.expenseLoggingPermissions ?? { mode: 'all', allowedRoles: [], allowedUserIds: [] });
      setMaintenanceMode(globalSettings.maintenanceMode ?? false);
      setMaintenanceMessage(globalSettings.maintenanceMessage ?? '');
      setDrNotifTitle(globalSettings.drAssignmentNotificationTitle || '');
      setDrNotifBody(globalSettings.drAssignmentNotificationBody || '');
      setRoleBasedTargets(globalSettings.roleBasedTargets || { CRM: 50, DESIGNER_REPRESENTATIVE: 20, LR: 100 });
      setTelegramBotToken(globalSettings.telegramBotToken || '');
      setTelegramChatIds(Array.isArray(globalSettings.telegramChatIds) ? globalSettings.telegramChatIds.join(', ') : '');

      setAllTargetableUsersForExpensePerms(fetchedUsersDb.filter(u => u.role !== 'SYSTEM_ADMIN')); // For expense perm specific user picker
    } catch (error) {
      console.error("Error fetching settings data:", error);
      toast({ title: "Error", description: "Could not load settings or user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'SYSTEM_ADMIN') {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

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

  const handleSaveToastSoundUrl = async () => {
    setIsSubmittingToastSound(true);
    const urlToSave = toastSoundUrl.trim() === '' ? null : toastSoundUrl.trim();
    const result = await updateToastSoundUrlAction(urlToSave);
    if (result.success) {
      toast({ title: "Settings Updated", description: "Toast notification sound URL has been saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save toast sound URL.", variant: "destructive" });
    }
    setIsSubmittingToastSound(false);
  };

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

  const handleExpensePermsModeChange = (newMode: ExpenseLoggingMode) => {
    setExpenseLoggingPerms(prev => ({ ...prev, mode: newMode, allowedRoles: [], allowedUserIds: [] }));
  };

  const handleExpensePermsRoleChange = (role: UserRole, checked: boolean | "indeterminate") => {
    setExpenseLoggingPerms(prev => {
      const newRoles = new Set(prev.allowedRoles);
      if (checked) newRoles.add(role); else newRoles.delete(role);
      return { ...prev, allowedRoles: Array.from(newRoles) };
    });
  };

  const handleExpensePermsUserSelect = (userId: string) => {
    setExpenseLoggingPerms(prev => {
      const newUserIds = new Set(prev.allowedUserIds);
      if (newUserIds.has(userId)) newUserIds.delete(userId); else newUserIds.add(userId);
      return { ...prev, allowedUserIds: Array.from(newUserIds) };
    });
  };

  const handleSaveExpensePermissions = async () => {
    setIsSubmittingExpensePerms(true);
    const result = await updateExpenseLoggingPermissionsAction(expenseLoggingPerms);
    if (result.success) {
      toast({ title: "Settings Updated", description: "Expense logging permissions saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save expense logging permissions.", variant: "destructive" });
    }
    setIsSubmittingExpensePerms(false);
  };

  const handleSaveMaintenanceMode = async () => {
    setIsSubmittingMaintenanceMode(true);
    const result = await updateMaintenanceModeAction(maintenanceMode, maintenanceMessage.trim());
    if (result.success) {
      toast({ title: "Settings Updated", description: `Maintenance mode has been ${maintenanceMode ? 'enabled' : 'disabled'}.` });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update maintenance mode.", variant: "destructive" });
    }
    setIsSubmittingMaintenanceMode(false);
  };

  const handleSaveDrNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drNotifTitle.trim() || !drNotifBody.trim()) {
      toast({ title: "Validation Error", description: "Title and body are required for the DR notification.", variant: "destructive" });
      return;
    }
    setIsSubmittingDrNotif(true);
    const result = await updateDrAssignmentNotificationTemplatesAction(drNotifTitle.trim(), drNotifBody.trim());
    if (result.success) {
      toast({ title: "Settings Updated", description: "DR assignment notification template saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save DR notification template.", variant: "destructive" });
    }
    setIsSubmittingDrNotif(false);
  };

  const handleSaveTelegramSettings = async () => {
    setIsSubmittingTelegram(true);
    const chatIdsArray = telegramChatIds.split(',').map(id => id.trim()).filter(id => id);
    const result = await updateTelegramSettingsAction(telegramBotToken.trim() || null, chatIdsArray.length > 0 ? chatIdsArray : null);
    if (result.success) {
      toast({ title: "Settings Updated", description: "Telegram settings have been saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save Telegram settings.", variant: "destructive" });
    }
    setIsSubmittingTelegram(false);
  };



  const handleRoleTargetChange = (role: keyof RoleBasedTarget, value: string) => {
    const numericValue = parseInt(value, 10);
    setRoleBasedTargets(prev => ({
      ...prev,
      [role]: isNaN(numericValue) ? 0 : numericValue,
    }));
  };

  const handleSaveRoleTargets = async () => {
    setIsSubmittingRoleTargets(true);
    const result = await updateRoleBasedTargetsAction(roleBasedTargets);
    if (result.success) {
      toast({ title: "Settings Updated", description: "Role-based performance targets have been saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save role-based targets.", variant: "destructive" });
    }
    setIsSubmittingRoleTargets(false);
  };


  const selectedExpenseUsersDisplay = useMemo(() => {
    if (expenseLoggingPerms.allowedUserIds.length === 0) return "Select users...";
    if (expenseLoggingPerms.allowedUserIds.length > 2) return `${expenseLoggingPerms.allowedUserIds.length} users selected`;
    return expenseLoggingPerms.allowedUserIds.map(id => allTargetableUsersForExpensePerms.find(u => u.id === id)?.name || id).join(", ");
  }, [expenseLoggingPerms.allowedUserIds, allTargetableUsersForExpensePerms]);

  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be a System Administrator to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Application Settings</h1>
          <p className="text-base text-muted-foreground mt-1">
            Configure global settings for CRM, projects, notifications, and more.
          </p>
        </div>
      </div>

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
                    <span className="h-4 w-4 rounded-sm border border-border" style={{ backgroundColor: status.color }} title={status.name} />{status.name}
                    {status.isSystemStatus && <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm border border-border">System</span>}
                  </Label></div>))}
              </div></ScrollArea>}
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveCrmTargets} disabled={isLoading || isSubmittingCrmTargets || allStatuses.length === 0}>{isSubmittingCrmTargets ? "Saving..." : "Save CRM Target Settings"}</Button>
        </CardFooter>
      </Card>

      <Separator className="my-8" />

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Target className="h-6 w-6 text-primary" />Team Performance Targets</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">Set the monthly task completion targets for different team roles.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <Label htmlFor="crm-target">CRM Target</Label>
            <Input
              id="crm-target"
              type="number"
              value={roleBasedTargets.CRM}
              onChange={(e) => handleRoleTargetChange('CRM', e.target.value)}
              placeholder="e.g., 50"
              min="0"
              disabled={isLoading || isSubmittingRoleTargets}
            />
            <p className="text-xs text-muted-foreground">Monthly target per CRM user.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dr-target">Designer Rep. Target</Label>
            <Input
              id="dr-target"
              type="number"
              value={roleBasedTargets.DESIGNER_REPRESENTATIVE}
              onChange={(e) => handleRoleTargetChange('DESIGNER_REPRESENTATIVE', e.target.value)}
              placeholder="e.g., 20"
              min="0"
              disabled={isLoading || isSubmittingRoleTargets}
            />
            <p className="text-xs text-muted-foreground">Monthly target per DR user.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lr-target">Logistics (LR) Target</Label>
            <Input
              id="lr-target"
              type="number"
              value={roleBasedTargets.LR}
              onChange={(e) => handleRoleTargetChange('LR', e.target.value)}
              placeholder="e.g., 100"
              min="0"
              disabled={isLoading || isSubmittingRoleTargets}
            />
            <p className="text-xs text-muted-foreground">Total monthly target for the entire LR team.</p>
          </div>
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveRoleTargets} disabled={isLoading || isSubmittingRoleTargets}>
            {isSubmittingRoleTargets ? "Saving Targets..." : "Save Role Targets"}
          </Button>
        </CardFooter>
      </Card>


      <Separator className="my-8" />

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <Send className="h-6 w-6 text-primary" /> Telegram Bot Integration
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Configure your Telegram bot to receive real-time payment notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="telegram-token">Bot Token</Label>
            <Input
              id="telegram-token"
              type="password"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="Enter your Telegram Bot Token"
              disabled={isSubmittingTelegram || isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telegram-chat-ids">Chat IDs</Label>
            <Textarea
              id="telegram-chat-ids"
              value={telegramChatIds}
              onChange={(e) => setTelegramChatIds(e.target.value)}
              placeholder="Enter one or more Chat IDs, separated by commas"
              disabled={isSubmittingTelegram || isLoading}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              To send to multiple chats, separate each ID with a comma (e.g., -100123...,-100456...).
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveTelegramSettings} disabled={isSubmittingTelegram || isLoading}>
            {isSubmittingTelegram ? "Saving..." : "Save Telegram Settings"}
          </Button>
        </CardFooter>
      </Card>


      <Separator className="my-8" />


      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Settings2 className="h-6 w-6 text-primary" />Feature Visibility & Permissions</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">Control features like public comments and expense logging.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {isLoading ? (
            <>
              <div className="flex items-center space-x-2"><Skeleton className="h-6 w-6 rounded" /><Skeleton className="h-5 w-48 rounded" /></div>
              <Skeleton className="h-24 w-full rounded-md" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                <Label htmlFor="commentsVisibilitySwitch" className="flex flex-col space-y-1 cursor-pointer">
                  <span>Comments Section Visibility (Public Tracking)</span><span className="font-normal leading-snug text-muted-foreground text-xs">Show or hide comments on public order tracking pages.</span>
                </Label>
                <Switch id="commentsVisibilitySwitch" checked={areCommentsVisible} onCheckedChange={handleToggleCommentsVisibility} disabled={isSubmittingCommentsVisibility} aria-label="Toggle comments section visibility" />
              </div>

              <div className="p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                <Label className="text-md font-medium flex flex-col space-y-1">
                  <span>Expense Logging for Non-System Admins</span>
                  <span className="font-normal leading-snug text-muted-foreground text-xs">
                    Control who can log expenses. System Admins always can.
                  </span>
                </Label>
                <RadioGroup value={expenseLoggingPerms.mode} onValueChange={handleExpensePermsModeChange} className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-4">
                  {([
                    { value: 'all', label: 'Allow All Staff' },
                    { value: 'specificRoles', label: 'Specific Roles' },
                    { value: 'specificUsers', label: 'Specific Users' },
                    { value: 'none', label: 'Disable for All Staff' }
                  ] as Array<{ value: ExpenseLoggingMode, label: string }>).map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2"><RadioGroupItem value={opt.value} id={`expense-mode-${opt.value}`} /><Label htmlFor={`expense-mode-${opt.value}`}>{opt.label}</Label></div>
                  ))}
                </RadioGroup>

                {expenseLoggingPerms.mode === 'specificRoles' && (
                  <div className="mt-3 p-3 border rounded-md bg-secondary/30">
                    <Label className="mb-2 block text-sm font-medium">Select Roles *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {EXPENSE_LOGGING_TARGET_ROLES.map(role => (
                        <div key={`expense-role-${role}`} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 bg-background">
                          <Checkbox id={`expense-role-perm-${role}`} checked={expenseLoggingPerms.allowedRoles.includes(role)} onCheckedChange={(checked) => handleExpensePermsRoleChange(role, checked)} />
                          <Label htmlFor={`expense-role-perm-${role}`} className="text-sm font-normal cursor-pointer">{role.replace(/_/g, ' ')}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {expenseLoggingPerms.mode === 'specificUsers' && (
                  <div className="mt-3 p-3 border rounded-md bg-secondary/30">
                    <Label className="mb-2 block text-sm font-medium">Select Users *</Label>
                    {isLoading ? <Skeleton className="h-10 w-full rounded-md" /> : (
                      <Popover open={isExpenseUserPopoverOpen} onOpenChange={setIsExpenseUserPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" aria-expanded={isExpenseUserPopoverOpen} className="w-full justify-between bg-background">
                            <span className="truncate">{selectedExpenseUsersDisplay}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <Command><CommandInput placeholder="Search user..." />
                            <CommandList><CommandEmpty>No user found.</CommandEmpty>
                              <CommandGroup>
                                {allTargetableUsersForExpensePerms.map((user) => (
                                  <CommandItem key={`expense-user-${user.id}`} value={`${user.name} ${user.email} ${user.role}`} onSelect={() => handleExpensePermsUserSelect(user.id)} className="cursor-pointer">
                                    <CheckIcon className={cn("mr-2 h-4 w-4", expenseLoggingPerms.allowedUserIds.includes(user.id) ? "opacity-100" : "opacity-0")} />
                                    {user.name} <span className="text-xs text-muted-foreground ml-1">({user.role.replace(/_/g, ' ')})</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup></CommandList></Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}
                <Button onClick={handleSaveExpensePermissions} disabled={isSubmittingExpensePerms} className="mt-4">
                  {isSubmittingExpensePerms ? "Saving..." : "Save Expense Permissions"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>


      <Separator className="my-8" />

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <PowerOff className="h-6 w-6 text-primary" /> Maintenance Mode
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Temporarily restrict access for non-admin users and display a maintenance message.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
            <Label htmlFor="maintenanceModeSwitch" className="flex flex-col space-y-1 cursor-pointer">
              <span>Enable Maintenance Mode</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                When enabled, only SYSTEM_ADMIN and ADMIN users can log in. Others will see the maintenance page.
              </span>
            </Label>
            <Switch
              id="maintenanceModeSwitch"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
              disabled={isSubmittingMaintenanceMode || isLoading}
              aria-label="Toggle maintenance mode"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
            <Textarea
              id="maintenanceMessage"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="e.g., The application is currently down for maintenance. We'll be back shortly!"
              disabled={isSubmittingMaintenanceMode || isLoading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">This message will be shown to users when maintenance mode is active.</p>
          </div>
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveMaintenanceMode} disabled={isSubmittingMaintenanceMode || isLoading}>
            {isSubmittingMaintenanceMode ? "Saving..." : "Save Maintenance Settings"}
          </Button>
        </CardFooter>
      </Card>


      <Separator className="my-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
              <Music className="h-6 w-6 text-primary" /> Toast Notification Sound
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">
              Set a custom sound URL for all app notifications. Leave blank to use default.
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
                  Provide a full URL or a relative path. Ensure the file is small for quick loading.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t p-5 flex justify-end">
            <Button onClick={handleSaveToastSoundUrl} disabled={isLoading || isSubmittingToastSound}>
              {isSubmittingToastSound ? "Saving..." : "Save Sound Setting"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-primary" /> Leaderboard Background Image
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">
              Set a custom background image URL for the leaderboard page.
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
                  placeholder="e.g., https://example.com/leaderboard-bg.jpg"
                  disabled={isSubmittingLeaderboardBg}
                />
                {leaderboardBgUrl && (
                  <div className="mt-4 p-2 border rounded-md inline-block bg-muted">
                    <NextImage
                      src={leaderboardBgUrl}
                      alt="Leaderboard background preview"
                      width={200}
                      height={120}
                      className="object-cover rounded"
                      unoptimized={true}
                      onError={(e) => { e.currentTarget.src = DEFAULT_LEADERBOARD_BACKGROUND_PLACEHOLDER; e.currentTarget.alt = 'Error loading image. Default shown.' }}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t p-5 flex justify-end">
            <Button onClick={handleSaveLeaderboardBgUrl} disabled={isLoading || isSubmittingLeaderboardBg}>
              {isSubmittingLeaderboardBg ? "Saving..." : "Save Background"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Separator className="my-8" />

      <form onSubmit={handleSaveDrNotification}>
        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
              <DraftingCompass className="h-6 w-6 text-primary" /> DR Assignment Notification
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">
              Customize the push notification sent when assigning a Designer Representative. Use <code className="bg-muted px-1 py-0.5 rounded text-xs">%assignerName%</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">%orderId%</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">%company%</code>, and <code className="bg-muted px-1 py-0.5 rounded text-xs">%jobid%</code> for personalization.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="drNotifTitle">Notification Title *</Label>
              <Input id="drNotifTitle" value={drNotifTitle} onChange={(e) => setDrNotifTitle(e.target.value)} placeholder="e.g., New Task from %assignerName% for %company%" required disabled={isSubmittingDrNotif} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="drNotifBody">Notification Body *</Label>
              <Textarea id="drNotifBody" value={drNotifBody} onChange={(e) => setDrNotifBody(e.target.value)} placeholder="e.g., You have been assigned to order %orderId% (Job ID: %jobid%)." required disabled={isSubmittingDrNotif} />
            </div>
          </CardContent>
          <CardFooter className="border-t p-5 flex justify-end">
            <Button type="submit" disabled={isSubmittingDrNotif}>{isSubmittingDrNotif ? "Saving..." : "Save DR Template"}</Button>
          </CardFooter>
        </Card>
      </form>



    </div>
  );
}
