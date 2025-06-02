
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import {
  LayoutGrid,
  List,
  PlusCircle,
  ClipboardCheck,
  AlertTriangle,
  Search,
  Briefcase,
  FileX2,
  Palette,
  Truck,
  Send,
  Loader2
} from 'lucide-react';
import type { Project, ProjectStatusType } from '@/types';
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { cn } from '@/lib/utils';
import { getProjects } from '@/lib/project-service'; // Import the service
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isSameWeek, isSameMonth, startOfWeek, endOfWeek, addWeeks } from 'date-fns';


// Updated column order based on last request
const projectStatuses: ProjectStatusType[] = ['CR Clearance', 'CR Cancel', 'On Design', 'On Hold', 'Logistics', 'Courier'];

const statusConfig: Record<ProjectStatusType, { icon: React.ElementType; headerBgClass: string; headerTextClass?: string; headerIconClass?: string; }> = {
  'CR Clearance': { icon: ClipboardCheck, headerBgClass: 'bg-blue-500', headerTextClass: 'text-white', headerIconClass: 'text-white' },
  'CR Cancel': { icon: FileX2, headerBgClass: 'bg-rose-500', headerTextClass: 'text-white', headerIconClass: 'text-white' },
  'On Design': { icon: Palette, headerBgClass: 'bg-purple-500', headerTextClass: 'text-white', headerIconClass: 'text-white' },
  'On Hold': { icon: AlertTriangle, headerBgClass: 'bg-amber-400', headerTextClass: 'text-gray-800', headerIconClass: 'text-gray-800' },
  'Logistics': { icon: Truck, headerBgClass: 'bg-cyan-500', headerTextClass: 'text-white', headerIconClass: 'text-white' },
  'Courier': { icon: Send, headerBgClass: 'bg-indigo-500', headerTextClass: 'text-white', headerIconClass: 'text-white' },
};

const formatDateForDisplay = (dateString: string | undefined): string => {
  if (!dateString) return "N/A";
  try {
    // Assuming dateString might be ISO or "MM/DD/YYYY"
    const date = dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
    return format(date, 'MM/dd/yyyy');
  } catch (e) {
    return "Invalid Date";
  }
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [endDateFilter, setEndDateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchProjectsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast({ title: "Error", description: "Could not load projects.", variant: "destructive" });
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjectsData();
  }, [fetchProjectsData]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      let matchesEndDate = true;
      if (endDateFilter !== 'all') {
        try {
          const projectEndDate = project.endDate.includes('T') ? parseISO(project.endDate) : new Date(project.endDate);
          const now = new Date();
          if (endDateFilter === 'this_week') {
            matchesEndDate = isSameWeek(projectEndDate, now, { weekStartsOn: 1 });
          } else if (endDateFilter === 'next_week') {
            const startOfNextWeek = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
            const endOfNextWeek = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
            matchesEndDate = projectEndDate >= startOfNextWeek && projectEndDate <= endOfNextWeek;
          } else if (endDateFilter === 'this_month') {
             matchesEndDate = isSameMonth(projectEndDate, now);
          }
        } catch (e) {
          console.warn("Could not parse project end date for filtering:", project.endDate);
          matchesEndDate = false;
        }
      }

      const matchesCategory = categoryFilter === 'all' || project.categoryTag.toLowerCase().includes(categoryFilter.toLowerCase());

      const matchesSearch = searchTerm === '' ||
                            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            project.projectIdDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (project.assigneeName && project.assigneeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            project.categoryTag.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesEndDate && matchesCategory && matchesSearch;
    });
  }, [projects, endDateFilter, categoryFilter, searchTerm]);

  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatusType, Project[]> = {
      'CR Clearance': [], 'CR Cancel': [], 'On Design': [], 'On Hold': [], 'Logistics': [], 'Courier': [],
    };
    filteredProjects.forEach(project => {
      if (grouped[project.status]) {
        grouped[project.status].push(project);
      } else {
        console.warn(`Project with ID ${project.id} has an unrecognized status: ${project.status}`);
      }
    });
    return grouped;
  }, [filteredProjects]);

  const endDateOptions = [
    { value: 'all', label: 'All End Dates' },
    { value: 'this_week', label: 'Ending This Week' },
    { value: 'next_week', label: 'Ending Next Week' },
    { value: 'this_month', label: 'Ending This Month' },
  ];

  const categoryOptions = useMemo(() => {
    const uniqueCategories = Array.from(new Set(projects.map(p => p.categoryTag.trim()).filter(Boolean)));
    const options = [{ value: 'all', label: 'All Categories' }];
    uniqueCategories.sort().forEach(cat => options.push({ value: cat.toLowerCase(), label: cat }));
    return options;
  }, [projects]); // Added semicolon here

  console.log("About to return JSX for ProjectsPage");
  return (
    <div className="flex flex-col h-full p-0 sm:p-6 lg:p-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header pb-2 px-4 sm:px-0">
        <div className="flex items-baseline gap-2">
          <Briefcase className="h-7 w-7 text-primary"/>
          <h1 className="page-title text-2xl">Projects</h1>
          <p className="text-sm text-muted-foreground self-end">All Projects</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-9 flex-1 sm:flex-initial"
            >
              <List className="mr-2 h-4 w-4" /> List View
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-9 flex-1 sm:flex-initial"
            >
              <LayoutGrid className="mr-2 h-4 w-4" /> Kanban
            </Button>
          </div>
          <Button size="sm" className="h-9 bg-primary hover:bg-primary/90 w-full sm:w-auto" disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center p-3 md:p-4 bg-card border border-border/30 rounded-lg shadow-sm mx-4 sm:mx-0">
        <div className="w-full md:flex-1 space-y-1">
          <Label htmlFor="endDateFilter" className="text-xs font-medium text-muted-foreground">End Date:</Label>
          <Select value={endDateFilter} onValueChange={setEndDateFilter} disabled={isLoading}>
            <SelectTrigger id="endDateFilter" className="h-9 bg-background w-full">
              <SelectValue placeholder="Filter by end date" />
            </SelectTrigger>
            <SelectContent>
              {endDateOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:flex-1 space-y-1">
          <Label htmlFor="categoryFilter" className="text-xs font-medium text-muted-foreground">Category:</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading || categoryOptions.length <=1}>
            <SelectTrigger id="categoryFilter" className="h-9 bg-background w-full">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
         <div className="w-full md:flex-1 space-y-1 self-end">
           <Label htmlFor="projectSearch" className="text-xs font-medium text-muted-foreground sr-only">Search Projects</Label>
           <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="projectSearch"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-background w-full"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
          <div className="flex-1 overflow-x-auto pb-4 px-4 sm:px-0">
            <div className="flex gap-4 min-w-max">
              {projectStatuses.map((status) => (
                <div key={status} className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-muted/30 rounded-lg shadow-sm overflow-hidden border border-border/30">
                   <div className={`px-3 py-2.5 flex items-center justify-between ${statusConfig[status].headerBgClass} ${statusConfig[status].headerTextClass}`}>
                    <div className="flex items-center">
                      <statusConfig[status].icon className={`mr-2 h-4 w-4 ${statusConfig[status].headerIconClass}`} />
                      <h2 className="font-semibold text-sm tracking-wide">{status}</h2>
                    </div>
                    <Skeleton className="h-5 w-5 rounded-full bg-black/20" />
                  </div>
                  <div className="flex-1 p-3 bg-background/10 space-y-3">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto pb-4 px-4 sm:px-0">
          <div className="flex gap-4 min-w-max">
            {projectStatuses.map((status) => (
              <KanbanColumn
                key={status}
                title={status}
                icon={statusConfig[status].icon}
                projects={(projectsByStatus[status] || []).map(p => ({ ...p, endDate: formatDateForDisplay(p.endDate) }))}
                headerBgClass={statusConfig[status].headerBgClass}
                headerTextClass={statusConfig[status].headerTextClass}
                headerIconClass={statusConfig[status].headerIconClass}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-card border border-border/30 rounded-lg shadow-sm p-4 sm:p-6 mx-4 sm:mx-0">
          <h2 className="text-lg font-semibold mb-4">List View (Coming Soon)</h2>
          <div className="text-center py-12">
            <List className="mx-auto h-16 w-16 text-muted-foreground opacity-30 mb-4" data-ai-hint="list document" />
            <h3 className="text-xl font-semibold text-foreground mb-2">List View Under Construction</h3>
            <p className="text-muted-foreground">
              This area will display projects in a filterable and sortable table.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

    