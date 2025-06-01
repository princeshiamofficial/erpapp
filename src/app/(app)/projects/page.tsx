
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { 
  LayoutGrid, 
  List, 
  PlusCircle, 
  AlertCircle, 
  RefreshCw, 
  AlertTriangle, 
  XCircle, 
  CheckCircle,
  Search,
  Briefcase
} from 'lucide-react';
import type { Project, ProjectStatusType } from '@/types';
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { cn } from '@/lib/utils';

// Mock Data (replace with actual data fetching later)
const mockProjects: Project[] = [
  { id: 'p1', projectIdDisplay: '2021', name: 'Project Alpha', status: 'Not Started', endDate: '06/06/2025', assigneeName: 'Mr Austin Azaria', assigneeInitials: 'AU', categoryTag: 'waqas2', categoryFilterKey: 'cat_a' },
  { id: 'p2', projectIdDisplay: '1010', name: 'Project Beta', status: 'In Progress', endDate: '06/06/2025', assigneeName: 'Mr ClerkEX', assigneeInitials: 'CL', categoryTag: 'Walk-In Customer', categoryFilterKey: 'cat_b' },
  { id: 'p3', projectIdDisplay: '1225', name: 'Project Gamma', status: 'Cancelled', endDate: '05/06/2025', assigneeName: 'Mr ClerkEX', assigneeInitials: 'CL', categoryTag: 'Ruma', categoryFilterKey: 'cat_a' },
  { id: 'p4', projectIdDisplay: '3030', name: 'Project Delta', status: 'Completed', endDate: '01/05/2025', assigneeName: 'Jane Doe', assigneeInitials: 'JD', categoryTag: 'Internal', categoryFilterKey: 'cat_c' },
  { id: 'p5', projectIdDisplay: '4040', name: 'Project Epsilon', status: 'On Hold', endDate: '12/12/2025', assigneeName: 'John Smith', assigneeInitials: 'JS', categoryTag: 'Client X', categoryFilterKey: 'cat_b' },
  { id: 'p6', projectIdDisplay: '5050', name: 'Project Zeta', status: 'In Progress', endDate: '10/10/2025', assigneeName: 'Alice Brown', assigneeInitials: 'AB', categoryTag: 'Feature Request', categoryFilterKey: 'cat_c' },
];

const projectStatuses: ProjectStatusType[] = ['Not Started', 'In Progress', 'On Hold', 'Cancelled', 'Completed'];

const statusConfig: Record<ProjectStatusType, { icon: React.ElementType; headerBgClass: string; headerTextClass?: string; headerIconClass?: string; }> = {
  'Not Started': { icon: AlertCircle, headerBgClass: 'bg-rose-500', headerTextClass: 'text-white', headerIconClass: 'text-white' },
  'In Progress': { icon: RefreshCw, headerBgClass: 'bg-sky-500', headerTextClass: 'text-white', headerIconClass: 'text-white' },
  'On Hold': { icon: AlertTriangle, headerBgClass: 'bg-amber-400', headerTextClass: 'text-gray-800', headerIconClass: 'text-gray-800' },
  'Cancelled': { icon: XCircle, headerBgClass: 'bg-red-400', headerTextClass: 'text-white', headerIconClass: 'text-white' },
  'Completed': { icon: CheckCircle, headerBgClass: 'bg-green-500', headerTextClass: 'text-white', headerIconClass: 'text-white' },
};


export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban'); 
  const [endDateFilter, setEndDateFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesEndDate = endDateFilter === 'all' || project.endDateFilterKey === endDateFilter; 
      const matchesCategory = categoryFilter === 'all' || project.categoryFilterKey === categoryFilter;
      const matchesSearch = searchTerm === '' || 
                            project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            project.projectIdDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            project.assigneeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            project.categoryTag.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesEndDate && matchesCategory && matchesSearch;
    });
  }, [projects, endDateFilter, categoryFilter, searchTerm]);

  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatusType, Project[]> = {
      'Not Started': [],
      'In Progress': [],
      'On Hold': [],
      'Cancelled': [],
      'Completed': [],
    };
    filteredProjects.forEach(project => {
      grouped[project.status]?.push(project);
    });
    return grouped;
  }, [filteredProjects]);

  const endDateOptions = [
    { value: 'all', label: 'All End Dates' },
    { value: 'this_week', label: 'Ending This Week' },
    { value: 'next_week', label: 'Ending Next Week' },
  ];
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'cat_a', label: 'Category A (Waqas2/Ruma)' },
    { value: 'cat_b', label: 'Category B (Walk-In/Client X)' },
    { value: 'cat_c', label: 'Category C (Internal/Feature)' },
  ];

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header pb-2">
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
          <Button size="sm" className="h-9 bg-primary hover:bg-primary/90 w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center p-3 md:p-4 bg-card border border-border/30 rounded-lg shadow-sm">
        <div className="w-full md:flex-1 space-y-1">
          <Label htmlFor="endDateFilter" className="text-xs font-medium text-muted-foreground">End Date:</Label>
          <Select value={endDateFilter} onValueChange={setEndDateFilter}>
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
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
            />
          </div>
        </div>
      </div>
      
      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {projectStatuses.map((status) => (
              <KanbanColumn
                key={status}
                title={status}
                icon={statusConfig[status].icon}
                projects={projectsByStatus[status]}
                headerBgClass={statusConfig[status].headerBgClass}
                headerTextClass={statusConfig[status].headerTextClass}
                headerIconClass={statusConfig[status].headerIconClass}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-card border border-border/30 rounded-lg shadow-sm p-4 sm:p-6">
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
