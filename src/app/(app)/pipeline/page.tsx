"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Edit, Trash2, FileSpreadsheet, Loader2, UploadCloud, User as UserIconLucide, Download, BarChart3, TableIcon, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Lead, User } from '@/types';
import { getLeads, deleteLeadAction } from './actions';
import { AddEditLeadDialog } from '@/components/pipeline/AddEditLeadDialog';
import { ImportLeadsDialog } from '@/components/pipeline/ImportLeadsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { Pie, PieChart as RechartsPieChart, Cell, Bar, BarChart, CartesianGrid, XAxis, LabelList } from "recharts";
import { getUsers } from '@/lib/user-service';


type Category = 'POP' | 'POG' | 'OC' | 'OD' | 'B2B';

const categoryColors: Record<Category, string> = {
  POP: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700',
  POG: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700',
  OC: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-700',
  OD: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700',
  B2B: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700',
};

const categoryChartColors: Record<Category, string> = {
    POP: "hsl(217 91% 60%)", // Blue
    POG: "hsl(160 76% 45%)", // Green
    OC: "hsl(25 95% 53%)",  // Orange
    OD: "hsl(280 65% 65%)", // Purple
    B2B: "hsl(0 72% 50%)",   // Red
};


const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export default function PipeLinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [allCrmUsers, setAllCrmUsers] = useState<User[]>([]);
  const [selectedCrmId, setSelectedCrmId] = useState<string>('all');

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'graph'>('table');

  const fetchLeadsAndUsers = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const promises: [Promise<Lead[]>, Promise<User[]>?] = [getLeads()];
      if (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') {
        promises.push(getUsers());
      }
      const [fetchedLeads, fetchedUsers] = await Promise.all(promises);

      setLeads(fetchedLeads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      if (fetchedUsers) {
        setAllCrmUsers(fetchedUsers.filter(u => u.role === 'CRM'));
      }

    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not load pipeline or user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser]);

  useEffect(() => {
    fetchLeadsAndUsers();
  }, [fetchLeadsAndUsers]);

  const filteredLeads = useMemo(() => {
    let roleFilteredLeads = leads;
    
    if (currentUser?.role === 'CRM') {
      roleFilteredLeads = leads.filter(lead => lead.crmId === currentUser.id);
    } else if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') {
      if (selectedCrmId !== 'all') {
        roleFilteredLeads = leads.filter(lead => lead.crmId === selectedCrmId);
      }
    }
    
    if (!searchTerm) return roleFilteredLeads;

    const lowercasedFilter = searchTerm.toLowerCase();
    return roleFilteredLeads.filter(lead =>
      lead.contactName.toLowerCase().includes(lowercasedFilter) ||
      lead.businessName.toLowerCase().includes(lowercasedFilter) ||
      lead.phone.toLowerCase().includes(lowercasedFilter) ||
      lead.source.toLowerCase().includes(lowercasedFilter) ||
      lead.category.toLowerCase().includes(lowercasedFilter) ||
      (lead.crmName && lead.crmName.toLowerCase().includes(lowercasedFilter))
    );
  }, [leads, searchTerm, currentUser, selectedCrmId]);
  
  const leadsByCategoryChartData = useMemo(() => {
    const categoryCounts = filteredLeads.reduce((acc, lead) => {
      acc[lead.category] = (acc[lead.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts).map(([name, value], index) => ({
      name,
      value,
      fill: categoryChartColors[name as Category] || "#8884d8",
    })).sort((a,b) => b.value - a.value);
  }, [filteredLeads]);
  
  const leadsByDayGraphData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    filteredLeads.forEach(lead => {
        try {
            const day = format(new Date(lead.date), 'yyyy-MM-dd');
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        } catch(e) { /* ignore invalid dates */ }
    });
    return Object.entries(dayCounts).map(([date, count]) => ({
      date,
      count
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredLeads]);


  const leadsChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    leadsByCategoryChartData.forEach((item) => {
      const categoryKey = item.name as Category;
      config[categoryKey] = {
        label: categoryKey,
        color: categoryChartColors[categoryKey],
      };
    });
    return config;
  }, [leadsByCategoryChartData]);

  const totalLeads = useMemo(() => filteredLeads.length, [filteredLeads]);


  const handleOpenAddDialog = () => {
    setEditingLead(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEditDialog = (lead: Lead) => {
    if (currentUser?.role !== 'SYSTEM_ADMIN' && currentUser?.role !== 'ADMIN' && currentUser?.id !== lead.crmId) {
        toast({ title: "Permission Denied", description: "You can only edit your own leads.", variant: "destructive" });
        return;
    }
    setEditingLead(lead);
    setIsAddEditOpen(true);
  };
  
  const handleLeadSaved = () => {
    setIsAddEditOpen(false);
    setEditingLead(null);
    fetchLeadsAndUsers();
  };
  
  const handleLeadsImported = () => {
    setIsImportOpen(false);
    fetchLeadsAndUsers();
  };

  const handleDeleteRequest = (lead: Lead) => {
     if (currentUser?.role !== 'SYSTEM_ADMIN' && currentUser?.role !== 'ADMIN' && currentUser?.id !== lead.crmId) {
        toast({ title: "Permission Denied", description: "You can only delete your own leads.", variant: "destructive" });
        return;
    }
    setLeadToDelete(lead);
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    const result = await deleteLeadAction(leadToDelete.id);
    if (result.success) {
      toast({ title: "Lead Deleted", description: `Lead "${leadToDelete.contactName}" has been removed.`});
      fetchLeadsAndUsers();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete lead.", variant: "destructive" });
    }
    setIsDeleting(false);
    setLeadToDelete(null);
  };

  const handleExport = () => {
    if (filteredLeads.length === 0) {
      toast({ title: "No Data", description: "There is no data matching your filters to export." });
      return;
    }
    const headers = ["date", "contactName", "businessName", "phone", "source", "address", "category", "notes", "schedule", "crmName"];
    const csvContent = [
      headers.join(','),
      ...filteredLeads.map(lead => [
        `"${format(new Date(lead.date), 'yyyy-MM-dd')}"`,
        `"${lead.contactName.replace(/"/g, '""')}"`,
        `"${lead.businessName.replace(/"/g, '""')}"`,
        `"${lead.phone}"`,
        `"${lead.source.replace(/"/g, '""')}"`,
        `"${lead.address.replace(/"/g, '""')}"`,
        `"${lead.category}"`,
        `"${(lead.notes || '').replace(/"/g, '""')}"`,
        `"${lead.schedule ? format(new Date(lead.schedule), 'yyyy-MM-dd') : ''}"`,
        `"${lead.crmName || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `pipeline_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export Successful", description: "Your leads have been downloaded as a CSV file." });
    }
  };
  
  const cycleViewMode = () => {
    setViewMode(prev => {
        if (prev === 'table') return 'chart';
        if (prev === 'chart') return 'graph';
        return 'table';
    });
  };

  const renderCurrentView = () => {
    if (viewMode === 'chart') {
      return (
        <div className="p-4 sm:p-6 min-h-[400px] flex flex-col items-center justify-center">
        {isLoading ? ( <Skeleton className="h-64 w-64 rounded-full" /> ) : 
            leadsByCategoryChartData.length > 0 ? (
                <ChartContainer config={leadsChartConfig} className="mx-auto aspect-square w-full max-w-[300px]">
                  <RechartsPieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                          data={leadsByCategoryChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          strokeWidth={5}
                      >
                       {leadsByCategoryChartData.map((entry) => (
                           <Cell key={`cell-${entry.name}`} fill={entry.fill} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"/>
                       ))}
                       <Label
                          content={({ viewBox }) => {
                              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                  return (
                                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-center">
                                          <tspan
                                              x={viewBox.cx}
                                              y={viewBox.cy - 10}
                                              className="text-3xl font-bold"
                                          >
                                              {totalLeads.toLocaleString()}
                                          </tspan>
                                          <tspan
                                              x={viewBox.cx}
                                              y={viewBox.cy + 15}
                                              className="text-sm text-muted-foreground"
                                          >
                                              Total Leads
                                          </tspan>
                                      </text>
                                  )
                              }
                              return null;
                          }}
                        />
                      </Pie>
                  </RechartsPieChart>
                   <ChartLegend
                      content={<ChartLegendContent nameKey="name" />}
                      className="-mt-4 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
                  />
                </ChartContainer>
            ) : (
                 <div className="text-center text-muted-foreground">
                    <p>No data to display in chart.</p>
                </div>
            )
        }
        </div>
      );
    }
    
    if (viewMode === 'graph') {
        return (
            <div className="p-4 sm:p-6 h-[450px] flex flex-col items-center justify-center">
                {isLoading ? <Skeleton className="h-full w-full" /> :
                leadsByDayGraphData.length > 0 ? (
                   <ChartContainer config={{count: {label: "Leads"}}} className="w-full h-full">
                        <BarChart data={leadsByDayGraphData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="date" 
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => format(new Date(value), 'd MMM')}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={4}>
                                <LabelList position="top" offset={5} className="fill-foreground" fontSize={12} />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="text-center text-muted-foreground"><p>No data to display in graph.</p></div>
                )}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="pl-6 w-[120px]">Date</TableHead>
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead>Business Name</TableHead>
                {currentUser?.role !== 'CRM' && <TableHead>Assigned To</TableHead>}
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="max-w-[250px]">Notes</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {isLoading ? (
                [...Array(5)].map((_, i) => (
                <TableRow key={`skel-${i}`}>
                    <TableCell colSpan={currentUser?.role !== 'CRM' ? 10 : 9} className="p-0"><Skeleton className="h-16 w-full"/></TableCell>
                </TableRow>
                ))
            ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="pl-6 text-muted-foreground text-xs whitespace-nowrap">{format(new Date(lead.date), 'd MMM yyyy')}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 text-sm border bg-muted shrink-0">
                                <AvatarFallback className="text-muted-foreground font-semibold">{getInitials(lead.contactName)}</AvatarFallback>
                            </Avatar>
                            <span className="text-foreground font-medium">{lead.contactName}</span>
                        </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{lead.businessName}</TableCell>
                    {currentUser?.role !== 'CRM' && (
                        <TableCell className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5" title={lead.crmName}>
                                <UserIconLucide className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{lead.crmName}</span>
                            </div>
                        </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                    <TableCell>
                    <Badge variant="secondary">{lead.source}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.address}</TableCell>
                    <TableCell>
                    <Badge className={cn(categoryColors[lead.category as Category] || 'bg-gray-100 text-gray-800')}>
                        {lead.category}
                    </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs truncate max-w-xs" title={lead.notes}>
                    {lead.notes || 'N/A'}
                    </TableCell>
                    <TableCell className="pr-6 text-right space-x-2 whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Edit Lead" onClick={() => handleOpenEditDialog(lead)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete Lead" onClick={() => handleDeleteRequest(lead)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={currentUser?.role !== 'CRM' ? 10 : 9} className="text-center py-12 h-[300px]">
                    <p className="text-lg text-muted-foreground font-medium">No leads in the pipeline.</p>
                    <p className="text-sm text-muted-foreground">Click "Add New Lead" to get started.</p>
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>
    );
  };

  const selectedCrmName = useMemo(() => {
    if (selectedCrmId === 'all') return "All CRs";
    return allCrmUsers.find(u => u.id === selectedCrmId)?.name || "Select CR";
  }, [selectedCrmId, allCrmUsers]);


  if (!currentUser) {
      return (
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <>
      <div className="space-y-6 p-1 sm:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Sales Pipeline</h1>
            <p className="page-description">
              Track and manage potential sales leads and opportunities.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-10"
                onClick={cycleViewMode}
            >
                {viewMode === 'table' && <><BarChart3 className="mr-2 h-4 w-4" />View Chart</>}
                {viewMode === 'chart' && <><BarChart3 className="mr-2 h-4 w-4" />View Graph</>}
                {viewMode === 'graph' && <><TableIcon className="mr-2 h-4 w-4" />View Table</>}
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="lg"
                        variant="outline"
                        className="w-full sm:w-auto h-10"
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export/Import
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setIsImportOpen(true)} className="cursor-pointer">
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Import from Sheet
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExport} disabled={filteredLeads.length === 0} className="cursor-pointer">
                        <Download className="mr-2 h-4 w-4" />
                        Export to Sheet
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="lg"
              onClick={handleOpenAddDialog}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow font-semibold h-10"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Lead
            </Button>
          </div>
        </div>

        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-grow">
                <CardTitle className="text-card-foreground text-xl">Pipeline Leads</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5">
                  {currentUser.role === 'CRM' ? "Displaying your assigned leads." : "All potential leads are listed here."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {(currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto flex-shrink-0 h-10">
                        <UserIconLucide className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{selectedCrmName}</span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setSelectedCrmId('all')}>All CRs</DropdownMenuItem>
                      {allCrmUsers.map(crm => (
                        <DropdownMenuItem key={crm.id} onSelect={() => setSelectedCrmId(crm.id)}>
                          {crm.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Search pipeline..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background h-10 rounded-md w-full"
                    />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {renderCurrentView()}
          </CardContent>
        </Card>
      </div>

      <AddEditLeadDialog
        isOpen={isAddEditOpen}
        onOpenChange={setIsAddEditOpen}
        onLeadSaved={handleLeadSaved}
        lead={editingLead}
        currentUser={currentUser}
      />
      
      <ImportLeadsDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        onLeadsImported={handleLeadsImported}
        currentUser={currentUser}
      />

      {leadToDelete && (
        <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the lead for "<span className="font-semibold">{leadToDelete.contactName}</span>". This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLeadToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                {isDeleting ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Deleting...</> : "Yes, delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
