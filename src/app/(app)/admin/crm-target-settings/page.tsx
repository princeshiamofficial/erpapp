
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
import type { CustomStatus, UserRole, User } from "@/types";
import { getStatuses } from '@/lib/status-service';
import { getUsers } from '@/lib/user-service';
import { getGlobalSettings, GlobalSettings } from '@/lib/settings-service';
import { 
  updateCompletionStatusIdsAction, 
  updateCommentsVisibilityAction,
  updateRolesAllowedToEditOrdersAction,
  sendPushNotificationAction
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ListChecks, MessageSquare, UserCheck, Send, Users, Filter, X, CheckIcon, ChevronsUpDown, BellRing } from 'lucide-react'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const EDITABLE_ROLES_FOR_ORDERS: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
const NOTIFICATION_TARGET_ROLES: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];


export default function CrmTargetSettingsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Settings states
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<Set<string>>(new Set());
  const [areCommentsVisible, setAreCommentsVisible] = useState(true);
  const [rolesAllowedToEdit, setRolesAllowedToEdit] = useState<Set<UserRole>>(new Set(['ADMIN', 'SYSTEM_ADMIN']));
  
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
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isLoadingUsersForNotif, setIsLoadingUsersForNotif] = useState(false);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingUsersForNotif(true);
    try {
      const [fetchedStatuses, globalSettings, fetchedUsers] = await Promise.all([
        getStatuses(),
        getGlobalSettings(),
        getUsers(),
      ]);
      setAllStatuses(fetchedStatuses);
      setSelectedStatusIds(new Set(globalSettings.crmCompletionStatusIds ?? []));
      setAreCommentsVisible(globalSettings.areCommentsVisibleOnPublicPage ?? true);
      setRolesAllowedToEdit(new Set(globalSettings.rolesAllowedToEditOrders ?? ['ADMIN', 'SYSTEM_ADMIN']));
      setAllUsers(fetchedUsers.filter(u => u.role !== 'SYSTEM_ADMIN')); // Exclude system admins from direct user targeting for general notifs
    } catch (error) {
      console.error("Error fetching settings data:", error);
      toast({ title: "Error", description: "Could not load settings or user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsLoadingUsersForNotif(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'SYSTEM_ADMIN') {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

  // --- Settings Handlers ---
  const handleCrmTargetCheckboxChange = (statusId: string, checked: boolean | "indeterminate") => {
    setSelectedStatusIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(statusId);
      } else {
        newSet.delete(statusId);
      }
      return newSet;
    });
  };

  const handleSaveCrmTargets = async () => {
    setIsSubmittingCrmTargets(true);
    const result = await updateCompletionStatusIdsAction(Array.from(selectedStatusIds));
    if (result.success) {
      toast({ title: "Settings Updated", description: "CRM completion status settings have been saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save CRM target settings.", variant: "destructive" });
    }
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
      if (checked === true) {
        newSet.add(role);
      } else {
        newSet.delete(role);
      }
      return newSet;
    });
  };

  const handleSaveOrderEditingPermissions = async () => {
    setIsSubmittingOrderEditingPermissions(true);
    const rolesToSave = Array.from(rolesAllowedToEdit).filter(role => role !== 'SYSTEM_ADMIN');
    const result = await updateRolesAllowedToEditOrdersAction(rolesToSave);
    if (result.success) {
      toast({ title: "Settings Updated", description: "Order editing permissions have been saved." });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save order editing permissions.", variant: "destructive" });
    }
    setIsSubmittingOrderEditingPermissions(false);
  };

  // --- Notification Handlers ---
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
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "Cannot send notification.", variant: "destructive" });
      return;
    }
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      toast({ title: "Validation Error", description: "Notification title and body are required.", variant: "destructive" });
      return;
    }
    if (notificationTargetType === 'roles' && selectedNotificationRoles.size === 0) {
      toast({ title: "Validation Error", description: "Please select at least one role for role-based targeting.", variant: "destructive" });
      return;
    }
    if (notificationTargetType === 'users' && selectedNotificationUserIds.size === 0) {
      toast({ title: "Validation Error", description: "Please select at least one user for user-based targeting.", variant: "destructive" });
      return;
    }

    setIsSendingNotification(true);
    const payload = {
      title: notificationTitle.trim(),
      body: notificationBody.trim(),
      iconUrl: notificationIconUrl.trim() || undefined,
      targetUrl: notificationTargetUrl.trim() || undefined,
      targetType: notificationTargetType,
      targetRoles: notificationTargetType === 'roles' ? Array.from(selectedNotificationRoles) : undefined,
      targetUserIds: notificationTargetType === 'users' ? Array.from(selectedNotificationUserIds) : undefined,
    };

    const result = await sendPushNotificationAction(payload, currentUser);
    setIsSendingNotification(false);

    if (result.success) {
      toast({ title: "Notification Sent (Simulated)", description: result.message });
      // Reset notification form
      setNotificationTitle('');
      setNotificationBody('');
      setNotificationIconUrl('');
      setNotificationTargetUrl('');
      // Optionally reset target type to 'all' or keep current for quick re-send
      // setNotificationTargetType('all');
      // setSelectedNotificationRoles(new Set());
      // setSelectedNotificationUserIds(new Set());
    } else {
      toast({ title: "Notification Failed", description: result.error || "Could not send notification.", variant: "destructive" });
    }
  };
  
  const selectedUsersDisplay = useMemo(() => {
    if (selectedNotificationUserIds.size === 0) return "Select users...";
    if (selectedNotificationUserIds.size > 2) return `${selectedNotificationUserIds.size} users selected`;
    return Array.from(selectedNotificationUserIds)
      .map(id => allUsers.find(u => u.id === id)?.name || id)
      .join(", ");
  }, [selectedNotificationUserIds, allUsers]);


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
            Configure CRM targets, public page features, order editing permissions, and send notifications.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* CRM Target Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            CRM Target Completion Statuses
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Select which order statuses count as "completed" for CRM targets.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-40 rounded" />
                </div>
              ))}
            </div>
          ) : allStatuses.length === 0 ? (
            <p className="text-muted-foreground">No order statuses found. Configure statuses first.</p>
          ) : (
            <ScrollArea className="h-[calc(50vh-200px)] pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {allStatuses.map((status) => (
                  <div key={status.id} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`status-${status.id}`}
                      checked={selectedStatusIds.has(status.id)}
                      onCheckedChange={(checked) => handleCrmTargetCheckboxChange(status.id, checked)}
                      disabled={isSubmittingCrmTargets}
                    />
                    <Label
                      htmlFor={`status-${status.id}`}
                      className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                    >
                      <span 
                        className="h-4 w-4 rounded-sm border border-border" 
                        style={{ backgroundColor: status.color }}
                        title={status.name}
                      />
                      {status.name}
                      {status.isSystemStatus && <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm border border-border">System</span>}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveCrmTargets} disabled={isLoading || isSubmittingCrmTargets || allStatuses.length === 0}>
            {isSubmittingCrmTargets ? "Saving..." : "Save CRM Target Settings"}
          </Button>
        </CardFooter>
      </Card>

      <Separator className="my-8" />

      {/* Public Page Settings Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Public Tracking Page Settings
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Control features on the public order tracking view.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-5 w-48 rounded" />
            </div>
          ) : (
            <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
              <Label htmlFor="commentsVisibilitySwitch" className="flex flex-col space-y-1 cursor-pointer">
                <span>Comments Section Visibility</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                  Show or hide the comments section on public tracking pages.
                </span>
              </Label>
              <Switch
                id="commentsVisibilitySwitch"
                checked={areCommentsVisible}
                onCheckedChange={handleToggleCommentsVisibility}
                disabled={isSubmittingCommentsVisibility}
                aria-label="Toggle comments section visibility"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-8" />
      
      {/* Order Management Permissions Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" /> 
            Order Management Permissions
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Define which user roles are permitted to edit order details. System Admins always have permission.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-52 rounded" />
                </div>
              ))}
            </div>
          ) : (
             <ScrollArea className="h-auto pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {EDITABLE_ROLES_FOR_ORDERS.map((role) => (
                  <div key={role} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`role-edit-perm-${role}`}
                      checked={rolesAllowedToEdit.has(role)}
                      onCheckedChange={(checked) => handleRoleEditingPermissionChange(role, checked)}
                      disabled={isSubmittingOrderEditingPermissions}
                    />
                    <Label
                      htmlFor={`role-edit-perm-${role}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {role.replace(/_/g, ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
         <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveOrderEditingPermissions} disabled={isLoading || isSubmittingOrderEditingPermissions}>
            {isSubmittingOrderEditingPermissions ? "Saving..." : "Save Editing Permissions"}
          </Button>
        </CardFooter>
      </Card>

      <Separator className="my-8" />

      {/* Send Push Notification Card */}
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" />
            Send Push Notification
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Compose and send a push notification to users.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSendNotification}>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="notifTitle">Title *</Label>
              <Input id="notifTitle" value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} placeholder="e.g., New Feature Alert!" required disabled={isSendingNotification}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notifBody">Body *</Label>
              <Textarea id="notifBody" value={notificationBody} onChange={(e) => setNotificationBody(e.target.value)} placeholder="Describe the notification content..." required disabled={isSendingNotification}/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="notifIconUrl">Icon URL (Optional)</Label>
                <Input id="notifIconUrl" value={notificationIconUrl} onChange={(e) => setNotificationIconUrl(e.target.value)} placeholder="https://example.com/icon.png" disabled={isSendingNotification}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notifTargetUrl">Target URL (Optional)</Label>
                <Input id="notifTargetUrl" value={notificationTargetUrl} onChange={(e) => setNotificationTargetUrl(e.target.value)} placeholder="https://yourapp.com/some-page" disabled={isSendingNotification}/>
              </div>
            </div>

            <Separator className="my-4"/>
            
            <div className="space-y-2">
              <Label className="text-md font-medium">Target Audience *</Label>
              <RadioGroup value={notificationTargetType} onValueChange={(value) => setNotificationTargetType(value as 'all' | 'roles' | 'users')} className="flex flex-col sm:flex-row gap-4" disabled={isSendingNotification}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="targetAll" />
                  <Label htmlFor="targetAll">All Users</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="roles" id="targetRoles" />
                  <Label htmlFor="targetRoles">Specific Roles</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="users" id="targetUsers" />
                  <Label htmlFor="targetUsers">Specific Users</Label>
                </div>
              </RadioGroup>
            </div>

            {notificationTargetType === 'roles' && (
              <div className="p-4 border rounded-md bg-secondary/30 mt-2">
                <Label className="mb-2 block text-sm font-medium">Select Roles *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {NOTIFICATION_TARGET_ROLES.map(role => (
                    <div key={role} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 bg-background">
                      <Checkbox
                        id={`notif-role-${role}`}
                        checked={selectedNotificationRoles.has(role)}
                        onCheckedChange={(checked) => handleNotificationRoleCheckboxChange(role, checked)}
                        disabled={isSendingNotification}
                      />
                      <Label htmlFor={`notif-role-${role}`} className="text-sm font-normal cursor-pointer">{role.replace(/_/g, ' ')}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notificationTargetType === 'users' && (
              <div className="p-4 border rounded-md bg-secondary/30 mt-2">
                <Label className="mb-2 block text-sm font-medium">Select Users *</Label>
                {isLoadingUsersForNotif ? (
                   <Skeleton className="h-10 w-full rounded-md" />
                ) : (
                  <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isUserPopoverOpen}
                        className="w-full justify-between bg-background"
                        disabled={isSendingNotification || allUsers.length === 0}
                      >
                        <span className="truncate">{selectedUsersDisplay}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder="Search user..." disabled={isSendingNotification}/>
                        <CommandList>
                          <CommandEmpty>No user found.</CommandEmpty>
                          <CommandGroup>
                            {allUsers.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.name} ${user.email} ${user.role}`}
                                onSelect={() => {
                                  handleNotificationUserSelect(user.id);
                                  // setIsUserPopoverOpen(false); // Keep open for multi-select
                                }}
                                disabled={isSendingNotification}
                                className="cursor-pointer"
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedNotificationUserIds.has(user.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {user.name} <span className="text-xs text-muted-foreground ml-1">({user.role.replace(/_/g, ' ')})</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                 {selectedNotificationUserIds.size > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="font-medium">Selected: </span>
                    <span className="text-muted-foreground">
                      {Array.from(selectedNotificationUserIds).map(id => allUsers.find(u => u.id === id)?.name).filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t p-5 flex justify-end">
            <Button type="submit" disabled={isSendingNotification || !notificationTitle.trim() || !notificationBody.trim()}>
              {isSendingNotification ? "Sending..." : <><Send className="mr-2 h-4 w-4"/> Send Notification</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
