
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { CustomStatus } from "@/types";
import { getStatuses } from '@/lib/status-service';
import { getCrmCompletionStatusIds } from '@/lib/settings-service';
import { updateCompletionStatusIdsAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CrmTargetSettingsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedStatuses, fetchedCompletionIds] = await Promise.all([
        getStatuses(),
        getCrmCompletionStatusIds(),
      ]);
      setAllStatuses(fetchedStatuses);
      setSelectedStatusIds(new Set(fetchedCompletionIds));
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

  const handleCheckboxChange = (statusId: string, checked: boolean | "indeterminate") => {
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await updateCompletionStatusIdsAction(Array.from(selectedStatusIds));
    if (result.success) {
      toast({ title: "Settings Updated", description: "CRM completion status settings have been saved." });
      await fetchData(); // Re-fetch to confirm
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not save settings.", variant: "destructive" });
    }
    setIsSubmitting(false);
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
          <h1 className="page-title">CRM Target Completion Settings</h1>
          <p className="page-description">
            Select which order statuses should count as "completed" for CRM monthly/weekly targets.
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
            Select Completion Statuses
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Orders that reach any of the selected statuses will contribute to CRM completion counts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-40 rounded" />
                </div>
              ))}
            </div>
          ) : allStatuses.length === 0 ? (
            <p className="text-muted-foreground">No order statuses found. Please configure statuses first.</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-450px)] pr-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {allStatuses.map((status) => (
                  <div key={status.id} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`status-${status.id}`}
                      checked={selectedStatusIds.has(status.id)}
                      onCheckedChange={(checked) => handleCheckboxChange(status.id, checked)}
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
          <Button onClick={handleSubmit} disabled={isLoading || isSubmitting || allStatuses.length === 0}>
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
