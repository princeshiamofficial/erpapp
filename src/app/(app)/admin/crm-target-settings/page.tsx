
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { CustomStatus, UserRole } from "@/types"; // Keep UserRole for role checks
import { getStatuses } from '@/lib/status-service';
import { getGlobalSettings, GlobalSettings } from '@/lib/settings-service';
import { 
  updateCompletionStatusIdsAction, 
  updateCommentsVisibilityAction,
  updateOrderEditingEnabledAction // Use this instead of updateRolesAllowedToEditOrdersAction
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ListChecks, MessageSquare, UserCheck, Edit3 } from 'lucide-react'; // Edit3 for order editing
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function CrmTargetSettingsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<Set<string>>(new Set());
  const [areCommentsVisible, setAreCommentsVisible] = useState(true);
  const [isOrderEditingEnabled, setIsOrderEditingEnabled] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCrmTargets, setIsSubmittingCrmTargets] = useState(false);
  const [isSubmittingCommentsVisibility, setIsSubmittingCommentsVisibility] = useState(false);
  const [isSubmittingOrderEditing, setIsSubmittingOrderEditing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedStatuses, globalSettings] = await Promise.all([
        getStatuses(),
        getGlobalSettings(),
      ]);
      setAllStatuses(fetchedStatuses);
      setSelectedStatusIds(new Set(globalSettings.crmCompletionStatusIds ?? []));
      setAreCommentsVisible(globalSettings.areCommentsVisibleOnPublicPage ?? true);
      setIsOrderEditingEnabled(globalSettings.isOrderEditingEnabled ?? true);
    } catch (error) {
      console.error("Error fetching settings data:", error);
      toast({ title: "Error", description: "Could not load settings.", variant: "destructive" });
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
      await fetchData(); 
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save CRM target settings.", variant: "destructive" });
    }
    setIsSubmittingCrmTargets(false);
  };

  const handleToggleCommentsVisibility = async (newVisibility: boolean) => {
    setIsSubmittingCommentsVisibility(true);
    const result = await updateCommentsVisibilityAction(newVisibility);
    if (result.success) {
      setAreCommentsVisible(newVisibility); // Update local state immediately
      toast({ title: "Settings Updated", description: `Public comments section is now ${newVisibility ? 'visible' : 'hidden'}.` });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update comments visibility.", variant: "destructive" });
    }
    setIsSubmittingCommentsVisibility(false);
  };

  const handleToggleOrderEditing = async (newIsEnabled: boolean) => {
    setIsSubmittingOrderEditing(true);
    const result = await updateOrderEditingEnabledAction(newIsEnabled);
    if (result.success) {
      setIsOrderEditingEnabled(newIsEnabled); // Update local state immediately
      toast({ title: "Settings Updated", description: `Order editing for CRM, DR, & Admin roles is now ${newIsEnabled ? 'enabled' : 'disabled'}.` });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update order editing permission.", variant: "destructive" });
    }
    setIsSubmittingOrderEditing(false);
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
            Configure CRM targets, public page features, and order editing permissions.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

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

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <Edit3 className="h-6 w-6 text-primary" /> {/* Using Edit3 icon */}
            Order Management Permissions
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Control if CRM, DR, and Admin roles can edit order details. System Admins can always edit.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-5 w-60 rounded" />
            </div>
          ) : (
             <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
              <Label htmlFor="orderEditingSwitch" className="flex flex-col space-y-1 cursor-pointer">
                <span>Enable Order Editing (for CRM, DR, Admin)</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                  Allow users with CRM, Designer Representative, or Admin roles to edit order details. System Admins always have permission.
                </span>
              </Label>
              <Switch
                id="orderEditingSwitch"
                checked={isOrderEditingEnabled}
                onCheckedChange={handleToggleOrderEditing}
                disabled={isSubmittingOrderEditing}
                aria-label="Toggle order editing for CRM, DR, and Admin roles"
              />
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
