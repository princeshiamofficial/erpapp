
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Project, ProjectStatusType } from '@/types';
import { getProjects } from '@/lib/project-service'; // Assuming you have this service
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, ClipboardCheck, ClipboardX, DraftingCompass, PauseCircle, Truck, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isSameWeek, isSameMonth, isSameYear, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const KANBAN_COLUMNS_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: React.ElementType; headerBgClass: string; headerIconClass?: string; headerTextClass?: string }> = [
  { title: 'CR Clearance', status: 'CR Clearance', icon: ClipboardCheck, headerBgClass: 'bg-sky-600', headerTextClass: 'text-sky-50' },
  { title: 'CR Cancel', status: 'CR Cancel', icon: ClipboardX, headerBgClass: 'bg-red-600', headerTextClass: 'text-red-50' },
  { title: 'On Design', status: 'On Design', icon: DraftingCompass, headerBgClass: 'bg-purple-600', headerTextClass: 'text-purple-50' },
  { title: 'On Hold', status: 'On Hold', icon: PauseCircle, headerBgClass: 'bg-yellow-500', headerTextClass: 'text-yellow-950' },
  { title: 'Logistics', status: 'Logistics', icon: Truck, headerBgClass: 'bg-orange-600', headerTextClass: 'text-orange-50' },
  { title: 'Courier', status: 'Courier', icon: CheckCircle, headerBgClass: 'bg-green-600', headerTextClass: 'text-green-50' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [endDateFilter, setEndDateFilter] = useState<string>('all');

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      // Optionally, set an error state and display an error message to the user
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearchTerm = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectIdDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.assigneeName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || project.categoryTag === categoryFilter;

      let matchesEndDate = true;
      if (endDateFilter !== 'all' && project.endDate) {
        try {
          const projectEndDate = parseISO(project.endDate); // Assuming endDate is ISO string
          const now = new Date();
          if (endDateFilter === 'this_week') {
            matchesEndDate = isSameWeek(projectEndDate, now, { weekStartsOn: 1 });
          } else if (endDateFilter === 'this_month') {
            matchesEndDate = isSameMonth(projectEndDate, now);
          } else if (endDateFilter === 'this_year') {
            matchesEndDate = isSameYear(projectEndDate, now);
          }
        } catch (e) {
          console.warn("Error parsing project end date:", project.endDate, e);
          matchesEndDate = false; // Or handle as appropriate
        }
      }
      return matchesSearchTerm && matchesCategory && matchesEndDate;
    });
  }, [projects, searchTerm, categoryFilter, endDateFilter]);

  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatusType, Project[]> = {
      'CR Clearance': [],
      'CR Cancel': [],
      'On Design': [],
      'On Hold': [],
      'Logistics': [],
      'Courier': [],
    };
    filteredProjects.forEach(project => {
      if (grouped[project.status]) {
        grouped[project.status].push(project);
      } else {
        // Handle projects with statuses not in KANBAN_COLUMNS_CONFIG if necessary
        // For now, they will be ignored by the current column setup
      }
    });
    return grouped;
  }, [filteredProjects]);

  const categoryOptions = useMemo(() => {
    const categories = new Set(projects.map(p => p.categoryTag));
    return Array.from(categories).sort();
  }, [projects]);

  const endDateOptions = [
    { label: 'All Dates', value: 'all' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'This Year', value: 'this_year' },
  ];


  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-0 sm:p-6 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header pb-2 px-4 sm:px-0">
            {/* Skeleton for header */}
             <div className="flex items-baseline gap-2">
                <Briefcase className="h-7 w-7 text-primary"/>
                <h1 className="page-title text-2xl sm:text-3xl">Projects Kanban</h1>
            </div>
             <Skeleton className="h-10 w-full sm:w-48 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex space-x-4 min-w-max px-4 sm:px-0">
            {KANBAN_COLUMNS_CONFIG.map((col) => (
              <div key={col.status} className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-muted/30 rounded-lg shadow-sm">
                <div className={`px-3 py-2.5 flex items-center justify-between ${col.headerBgClass} ${col.headerTextClass || 'text-white'} rounded-t-lg`}>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                <div className="flex-1 p-3 space-y-3">
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full p-0 sm:p-6 lg:p-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header pb-2 px-4 sm:px-0">
        <div className="flex items-baseline gap-2">
            <Briefcase className="h-7 w-7 text-primary"/>
            <h1 className="page-title text-2xl sm:text-3xl">Projects Kanban</h1>
        </div>
        <Button variant="default" size="lg" className="w-full sm:w-auto h-10" disabled>
          New Project (Soon)
        </Button>
      </div>

      {/* Filter and Search Placeholder - To be re-enabled step-by-step */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-card border-border/50 focus:border-primary"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="bg-card border-border/50 focus:border-primary">
            <SelectValue placeholder="Filter by category..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={endDateFilter} onValueChange={setEndDateFilter}>
          <SelectTrigger className="bg-card border-border/50 focus:border-primary">
            <SelectValue placeholder="Filter by end date..." />
          </SelectTrigger>
          <SelectContent>
            {endDateOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>


      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex space-x-4 min-w-max px-4 sm:px-0">
          {KANBAN_COLUMNS_CONFIG.map((col) => (
            <KanbanColumn
              key={col.status}
              title={col.title}
              icon={col.icon}
              projects={projectsByStatus[col.status] || []}
              headerBgClass={col.headerBgClass}
              headerTextClass={col.headerTextClass}
              headerIconClass={col.headerIconClass}
            />
          ))}
        </div>
        {projects.length === 0 && !isLoading && (
          <div className="text-center py-10 text-muted-foreground">
            <Briefcase className="mx-auto h-12 w-12 opacity-50 mb-3" />
            <p className="text-lg">No projects found.</p>
            <p className="text-sm">Try adjusting your filters or add new projects.</p>
          </div>
        )}
      </div>
    </div>
  );
}
