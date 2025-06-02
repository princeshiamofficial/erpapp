
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Project, ProjectStatusType } from '@/types';
import { getProjects } from '@/lib/project-service';
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, ClipboardCheck, ClipboardX, DraftingCompass, PauseCircle, Truck, CheckCircle, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCorners,
} from '@dnd-kit/core';
import { updateProjectStatusAction } from './actions';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast({ title: "Error", description: "Could not load projects.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
          const projectEndDate = parseISO(project.endDate);
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
          matchesEndDate = false;
        }
      }
      return matchesSearchTerm && matchesCategory && matchesEndDate;
    });
  }, [projects, searchTerm, categoryFilter, endDateFilter]);

  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatusType, Project[]> = {
      'CR Clearance': [], 'CR Cancel': [], 'On Design': [],
      'On Hold': [], 'Logistics': [], 'Courier': [],
    };
    filteredProjects.forEach(project => {
      if (grouped[project.status]) {
        grouped[project.status].push(project);
      }
    });
    return grouped;
  }, [filteredProjects]);

  const categoryOptions = useMemo(() => {
    const categories = new Set(projects.map(p => p.categoryTag).filter(Boolean));
    return Array.from(categories).sort();
  }, [projects]);

  const endDateOptions = [
    { label: 'All Dates', value: 'all' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'This Year', value: 'this_year' },
  ];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const projectId = active.id as string;
      const newStatus = over.id as ProjectStatusType;
      const originalStatus = projects.find(p => p.id === projectId)?.status;

      if (!originalStatus || newStatus === originalStatus) {
        return; // No actual status change or original status not found
      }
      
      // Optimistic update
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === projectId ? { ...p, status: newStatus } : p
        )
      );

      const result = await updateProjectStatusAction(projectId, newStatus);

      if (result.success) {
        toast({ title: "Project Updated", description: `Project status changed to ${newStatus}.` });
        // Optionally re-fetch or rely on revalidatePath from server action
        fetchProjects(); 
      } else {
        toast({ title: "Update Failed", description: result.error || "Could not update project status.", variant: "destructive" });
        // Revert optimistic update
        setProjects(prevProjects =>
          prevProjects.map(p =>
            p.id === projectId ? { ...p, status: originalStatus } : p
          )
        );
      }
    }
  };


  if (isLoading && projects.length === 0) { // Show full page skeleton only on initial load
    return (
      <div className="flex flex-col h-full p-0 sm:p-6 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header pb-2 px-4 sm:px-0">
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
          <Input
            placeholder="Search projects (ID, Name, Assignee)..."
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
                id={col.status} // Required for @dnd-kit droppable
                title={col.title}
                icon={col.icon}
                projects={projectsByStatus[col.status] || []}
                headerBgClass={col.headerBgClass}
                headerTextClass={col.headerTextClass}
                headerIconClass={col.headerIconClass}
                isLoading={isLoading}
              />
            ))}
          </div>
          {projects.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground mt-8">
              <Briefcase className="mx-auto h-16 w-16 opacity-30 mb-4" />
              <p className="text-xl font-semibold">No projects found.</p>
              <p className="text-sm">
                {searchTerm || categoryFilter !== 'all' || endDateFilter !== 'all'
                  ? "Try adjusting your filters or search term."
                  : "Get started by adding new projects."}
              </p>
            </div>
          )}
        </div>
      </div>
    </DndContext>
  );
}
