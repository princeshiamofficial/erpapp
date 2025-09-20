
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit } from "lucide-react";
import type { Dr2oEntry, User, LrEntryItem } from '@/types';
import { getDr2oEntries } from '@/lib/dr2o-service';
import { getUsers } from '@/lib/user-service';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AddEditDr2oDialog = dynamic(() => import('@/components/dr2o/AddEditDr2oDialog').then(mod => mod.AddEditDr2oDialog));

const getInitials = (name: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

type TeamType = 'CR' | 'DR' | 'LR';

export default function DR2OPage() {
  const { currentUser } = useAuth();
  const [dr2oEntries, setDr2oEntries] = useState<Dr2oEntry[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Dr2oEntry | null>(null);
  const [activeTab, setActiveTab] = useState<TeamType>("CR");

  const fetchData = useCallback(async (team: TeamType) => {
    setIsLoading(true);
    try {
      const [entries, users] = await Promise.all([
          getDr2oEntries(team),
          getUsers()
      ]);
      setDr2oEntries(entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setAllUsers(users);
    } catch (error) {
      console.error(`Error fetching DR 2.O entries for ${team}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTab);
  }, [fetchData, activeTab]);

  const handleOpenAddDialog = () => {
    setEditingEntry(null);
    setIsDialogOpen(true);
  };
  
  const handleOpenEditDialog = (entry: Dr2oEntry) => {
    setEditingEntry(entry);
    setIsDialogOpen(true);
  };

  const handleDr2oSaved = () => {
    fetchData(activeTab);
    setIsDialogOpen(false);
  };

  const canAddNew = useMemo(() => {
    if (!currentUser || !dr2oEntries) return false;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return !dr2oEntries.some(entry => entry.crmId === currentUser.id && format(parseISO(entry.date), 'yyyy-MM-dd') === todayStr);
  }, [currentUser, dr2oEntries]);

  const userEntries = useMemo(() => {
      if (!currentUser) return [];
      if (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') {
          return dr2oEntries;
      }
      return dr2oEntries.filter(entry => entry.crmId === currentUser.id);
  }, [currentUser, dr2oEntries]);
  
  const PlaceholderContent = ({ teamName }: { teamName: string }) => (
    <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader>
            <CardTitle>{teamName} Dashboard</CardTitle>
            <CardDescription>Content for the {teamName} will be displayed here.</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Coming soon...</p>
        </CardContent>
    </Card>
  );

  const getTeamNameForDialog = (team: TeamType) => {
    switch(team) {
      case 'CR': return 'CR Team';
      case 'DR': return 'DR Team';
      case 'LR': return 'LR Team';
      default: return 'Team';
    }
  };


  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'CR':
        return <PlaceholderContent teamName="CR Team" />;
      case 'DR':
        return (
          <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-card-foreground text-xl">DR Team Daily Reports</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-0.5">
                        Daily follow-up reports for new and old customers from the Designer Rep team.
                    </CardDescription>
                  </div>
                  <Button onClick={handleOpenAddDialog} disabled={!canAddNew && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SYSTEM_ADMIN'}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New
                  </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full divide-y divide-gray-200">
                  <TableHeader className="bg-gray-50 dark:bg-muted/30">
                    <TableRow>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-muted/30 z-10">Date</TableHead>
                      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && <TableHead>DR Name</TableHead>}
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 dark:bg-green-900/20">New Customer 1</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 dark:bg-green-900/20">New Customer 2</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 dark:bg-green-900/20">New Customer 3</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Old Customer Follow-up 1</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Old Customer Follow-up 2</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Old Customer Follow-up 3</TableHead>
                      <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Old Customer Follow-up 4</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200 dark:bg-card dark:divide-border/50">
                    {isLoading ? [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                          <TableCell colSpan={(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') ? 10 : 9}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    )) : userEntries.map((row) => {
                      const drUser = allUsers.find(u => u.id === row.crmId);
                      return (
                          <TableRow key={row.id} className="hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors duration-150">
                            <TableCell className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200 sticky left-0 bg-white dark:bg-card z-10">{format(parseISO(row.date), 'd MMM, yyyy')}</TableCell>
                            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && (
                              <TableCell>
                                  <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                          <AvatarImage src={drUser?.avatarUrl || undefined} alt={row.crmName} />
                                          <AvatarFallback>{getInitials(row.crmName)}</AvatarFallback>
                                      </Avatar>
                                      <span>{row.crmName}</span>
                                  </div>
                              </TableCell>
                            )}
                            <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.newCustomer1 || 'N/A'}</TableCell>
                            <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.newCustomer2 || 'N/A'}</TableCell>
                            <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.newCustomer3 || 'N/A'}</TableCell>
                            <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.oldCustomer1 || 'N/A'}</TableCell>
                            <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.oldCustomer2 || 'N/A'}</TableCell>
                            <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.oldCustomer3 || 'N/A'}</TableCell>
                            <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.oldCustomer4 || 'N/A'}</TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(row)}>
                                    <Edit className="h-4 w-4"/>
                                </Button>
                            </TableCell>
                          </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      case 'LR':
        return (
          <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-card-foreground text-xl">LR Team Daily Tasks</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-0.5">
                        Logistics and fulfillment team daily entries.
                    </CardDescription>
                  </div>
                  <Button onClick={handleOpenAddDialog} disabled={!canAddNew && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SYSTEM_ADMIN'}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New
                  </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>LR Name</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    )) : userEntries.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-48 text-muted-foreground">No entries found for the LR Team.</TableCell>
                        </TableRow>
                    ) : userEntries.map((row) => {
                      const lrUser = allUsers.find(u => u.id === row.crmId);
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{format(parseISO(row.date), 'd MMM, yyyy')}</TableCell>
                          <TableCell>
                             <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={lrUser?.avatarUrl || undefined} alt={row.crmName} />
                                    <AvatarFallback>{getInitials(row.crmName)}</AvatarFallback>
                                </Avatar>
                                <span>{row.crmName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                             <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(row)}>
                                <Edit className="h-4 w-4"/>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TeamType)} className="w-full">
            <TabsList className="inline-flex h-10 items-center justify-center text-muted-foreground bg-white p-1 rounded-full shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <TabsTrigger value="CR" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white dark:data-[state=active]:bg-gray-950">CR Team</TabsTrigger>
                <TabsTrigger value="DR" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white dark:data-[state=active]:bg-gray-950">DR Team</TabsTrigger>
                <TabsTrigger value="LR" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white dark:data-[state=active]:bg-gray-950">LR Team</TabsTrigger>
            </TabsList>
            <div className="mt-6">
                {renderActiveTabContent()}
            </div>
        </Tabs>
      </div>
      {currentUser && (
        <AddEditDr2oDialog 
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onDr2oSaved={handleDr2oSaved}
            entry={editingEntry}
            currentUser={currentUser}
            team={activeTab}
        />
      )}
    </>
  );
}
