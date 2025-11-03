

"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Target, Users, CalendarDays, TrendingUp, Printer, User as UserIcon, Download, CheckCircle } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, Area, AreaChart as RechartsAreaChart, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { User as UserType, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
    ChartTooltip,
    ChartTooltipContent,
  } from "@/components/ui/chart"
import { parseISO, startOfDay, isSameDay, getDaysInMonth, startOfMonth, subMonths, format, differenceInDays, endOfDay, isWithinInterval, addDays, endOfMonth } from 'date-fns';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { Input } from '@/components/ui/input';
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Label } from "@/components/ui/label";
import { addTaskEntryAction } from '@/app/(app)/dashboard/actions';
import { useToast } from '@/hooks/use-toast';
import { getTaskEntries, TaskEntry, getMonthlyTargetHistory, setMonthlyTargetHistory } from '@/lib/team-performance-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GlobalSettings } from '@/types';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import Image from 'next/image';
import Papa from 'papaparse';


interface DailyTargetData {
    name: string;
    totalDone: number;
    totalLikelihood: number;
    totalTarget: number;
    userData: {
        [userId: string]: {
            done: number;
            likelihood: number;
            role: UserRole;
        };
    };
}

interface TeamPerformanceGraphProps {
  allTasks: TaskEntry[];
  allUsers: UserType[]; // Added this prop
  monthlyTargetData: DailyTargetData[];
  totalPerformanceTarget: number;
  selectedDateRange: DateRange | undefined;
  userMap: Map<string, UserType>;
  globalSettings: GlobalSettings | null;
  onDateRangeChange: (range: DateRange | undefined, label: string, predefinedValue: PredefinedRange | "custom" | null) => void;
  onTeamChange?: (team: UserRole | 'all') => void;
  onSpecificUserChange?: (userId: string) => void;
  selectedTeam?: UserRole | 'all';
  specificUserId?: string;
  isAdminView?: boolean;
  refetchData: () => void;
  specificUserOptions: UserType[];
}

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export function TeamPerformanceGraph({
    allTasks,
    allUsers, // Accepting the new prop
    monthlyTargetData: initialMonthlyTargetData,
    totalPerformanceTarget: initialTotalPerformanceTarget,
    selectedDateRange,
    userMap,
    globalSettings,
    onDateRangeChange,
    onTeamChange,
    onSpecificUserChange,
    selectedTeam = 'all',
    specificUserId = 'all',
    isAdminView,
    refetchData,
    specificUserOptions = [],
}: TeamPerformanceGraphProps) {
  const [chartType, setChartType] = useState<'line'>('line');
  const [tasksDone, setTasksDone] = useState('');
  const [likelihoodCustomers, setLikelihoodCustomers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionsTodayCount, setSubmissionsTodayCount] = useState(0);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);

  const [monthlyTargetData, setMonthlyTargetData] = useState(initialMonthlyTargetData);
  const [totalPerformanceTarget, setTotalPerformanceTarget] = useState(initialTotalPerformanceTarget);

  const performanceTitle = useMemo(() => {
    if (!currentUser) return "Team Performance";
    const userRole = currentUser.role;
    if (userRole === 'CRM' || userRole === 'DESIGNER_REPRESENTATIVE' || userRole === 'CO') {
      return "My Performance";
    }
    return "Team Performance";
  }, [currentUser]);


  useEffect(() => {
    if (!allTasks || !selectedDateRange?.from || !globalSettings) {
      setMonthlyTargetData([]);
      setTotalPerformanceTarget(0);
      return;
    }
  
    const currentMonthStartDate = startOfMonth(selectedDateRange.from);
    const previousMonthStartDate = subMonths(currentMonthStartDate, 1);
    const previousMonthEndDate = endOfMonth(previousMonthStartDate);
  
    // Calculate previous month's total sales
    const previousMonthSales = allTasks.filter(task => {
      const taskDate = parseISO(task.date);
      return isWithinInterval(taskDate, { start: previousMonthStartDate, end: previousMonthEndDate });
    }).reduce((sum, task) => sum + task.taskCount, 0);
  
    // New target is previous month's sales + 10
    const dynamicTarget = previousMonthSales + 10;
  
    const startDate = startOfDay(selectedDateRange.from);
    const endDate = endOfDay(selectedDateRange.to || selectedDateRange.from);
  
    let usersToInclude = allUsers.filter(u => userMap.has(u.id));
    if (isAdminView) {
      if (specificUserId !== 'all') {
        usersToInclude = usersToInclude.filter(u => u.id === specificUserId);
      } else if (selectedTeam !== 'all') {
        usersToInclude = usersToInclude.filter(u => u.role === selectedTeam);
      }
    } else if (currentUser) {
      usersToInclude = allUsers.filter(u => u.role === currentUser.role);
    }
  
    const dateMap = new Map<string, { totalDone: number; totalLikelihood: number; userData: { [userId: string]: { done: number; likelihood: number; role: UserRole } } }>();
  
    let currentDate = startDate;
    while (currentDate <= endDate) {
      dateMap.set(format(currentDate, 'd MMM'), { totalDone: 0, totalLikelihood: 0, userData: {} });
      currentDate = addDays(currentDate, 1);
    }
  
    allTasks.forEach(entry => {
      try {
        const entryDate = parseISO(entry.date);
        if (isWithinInterval(entryDate, { start: startDate, end: endDate }) && usersToInclude.some(u => u.id === entry.userId)) {
          const dateKey = format(entryDate, 'd MMM');
          const dayData = dateMap.get(dateKey);
          if (dayData) {
            dayData.totalDone += entry.taskCount;
            dayData.totalLikelihood += entry.likelihood || 0;
            if (!dayData.userData[entry.userId]) {
              dayData.userData[entry.userId] = { done: 0, likelihood: 0, role: entry.role };
            }
            dayData.userData[entry.userId].done += entry.taskCount;
            dayData.userData[entry.userId].likelihood += entry.likelihood || 0;
          }
        }
      } catch (e) { /* ignore invalid dates */ }
    });
    
    const numDaysInRange = differenceInDays(endDate, startDate) + 1;
    const dailyTarget = Math.round(dynamicTarget / getDaysInMonth(startDate));

  
    const finalData = Array.from(dateMap.entries()).map(([date, data]) => ({
      name: date,
      ...data,
      totalTarget: dailyTarget,
    }));
  
    setMonthlyTargetData(finalData);
    setTotalPerformanceTarget(Math.round(dynamicTarget * numDaysInRange / getDaysInMonth(startDate)));
  
  }, [allTasks, allUsers, selectedDateRange, globalSettings, selectedTeam, specificUserId, currentUser, isAdminView, userMap]);
  


  useEffect(() => {
    if (!currentUser) return;

    const today = new Date();

    let count = 0;
    if (currentUser.role === 'LR') {
      count = allTasks.some(entry => entry.role === 'LR' && isSameDay(parseISO(entry.date), today)) ? 1 : 0;
    } else {
      count = allTasks.filter(entry =>
        entry.userId === currentUser.id && isSameDay(parseISO(entry.date), today)
      ).length;
    }
    setSubmissionsTodayCount(count);

  }, [currentUser, allTasks]);


  const handleDateChange = (range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    onDateRangeChange(range, displayLabel, predefinedValue);
  };

  const handleDoneClick = async () => {
    if (!currentUser) {
        toast({ title: "Error", description: "You must be logged in to submit tasks.", variant: "destructive" });
        return;
    }
    const taskCount = parseInt(tasksDone, 10);
    const likelihoodCount = currentUser.role === 'CRM' ? parseInt(likelihoodCustomers, 10) : undefined;

    const isCrmFirstSubmission = currentUser.role === 'CRM' && submissionsTodayCount === 0;
    const isCrmSecondSubmission = currentUser.role === 'CRM' && submissionsTodayCount === 1;

    if (isCrmFirstSubmission && (likelihoodCount === undefined || isNaN(likelihoodCount) || likelihoodCount < 0)) {
        toast({ title: "Invalid Input", description: "Please enter a valid non-negative number for likely customers.", variant: "destructive" });
        return;
    }

    if (isCrmSecondSubmission && (isNaN(taskCount) || taskCount < 0 || likelihoodCount === undefined || isNaN(likelihoodCount) || likelihoodCount < 0)) {
        toast({ title: "Invalid Input", description: "Please enter valid numbers for both tasks and likely customers.", variant: "destructive" });
        return;
    }

    if (currentUser.role !== 'CRM' && (isNaN(taskCount) || taskCount < 0)) {
        toast({ title: "Invalid Input", description: "Please enter a valid non-negative number of tasks.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    const finalTaskCount = isCrmFirstSubmission ? 0 : taskCount;

    const result = await addTaskEntryAction(currentUser, finalTaskCount, likelihoodCount);

    if (result.success) {
        toast({ title: "Entry Submitted", description: `Your entry has been recorded.` });
        setTasksDone('');
        setLikelihoodCustomers('');
        refetchData();
    } else {
        toast({ title: "Submission Failed", description: result.error, variant: "destructive" });
    }

    setIsSubmitting(false);
  };

  const isInputVisible = useMemo(() => {
    if (!currentUser) return false;
    const visibleRoles: UserRole[] = ['CRM', 'DESIGNER_REPRESENTATIVE', 'LR', 'CO'];
    return visibleRoles.includes(currentUser.role);
  }, [currentUser]);

  const inputLabel = useMemo(() => {
      if(currentUser?.role === 'LR') return "Team Tasks Done";
      return "My Tasks Done";
  }, [currentUser?.role]);

  const hasCompletedDailySubmissions = useMemo(() => {
    if (currentUser?.role === 'CRM') {
      return submissionsTodayCount >= 2;
    }
    if (currentUser?.role === 'DESIGNER_REPRESENTATIVE' || currentUser.role === 'LR' || currentUser.role === 'CO') {
      return submissionsTodayCount > 0;
    }
    return false;
  }, [currentUser, submissionsTodayCount]);

  const canSubmitFirstLikelihood = useMemo(() => {
    return currentUser?.role === 'CRM' && submissionsTodayCount === 0;
  }, [currentUser, submissionsTodayCount]);

  const canSubmitSecondEntry = useMemo(() => {
    return currentUser?.role === 'CRM' && submissionsTodayCount === 1;
  }, [currentUser, submissionsTodayCount]);

  const canSubmitTasks = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'DESIGNER_REPRESENTATIVE' || currentUser.role === 'LR' || currentUser.role === 'CO') {
      return submissionsTodayCount === 0;
    }
    return false;
  }, [currentUser, submissionsTodayCount]);


  const totals = useMemo(() => {
    if (!monthlyTargetData || monthlyTargetData.length === 0) {
      return { totalDone: 0, totalLikelihood: 0 };
    }

    let doneCount = 0;
    let likelihoodCount = 0;

    if (isAdminView) {
      doneCount = monthlyTargetData.reduce((acc, day) => acc + day.totalDone, 0);
      likelihoodCount = monthlyTargetData.reduce((acc, day) => acc + day.totalLikelihood, 0);
    } else if (currentUser) {
      doneCount = monthlyTargetData.reduce((acc, day) => {
        const userDoneToday = day.userData[currentUser.id]?.done || 0;
        return acc + userDoneToday;
      }, 0);
      likelihoodCount = monthlyTargetData.reduce((acc, day) => {
        const userLikelihoodToday = day.userData[currentUser.id]?.likelihood || 0;
        return acc + userLikelihoodToday;
      }, 0);
    }

    return { totalDone: doneCount, totalLikelihood: likelihoodCount };
  }, [monthlyTargetData, isAdminView, currentUser]);

  const showLikelihoodChart = useMemo(() => {
    if (!currentUser) return false;
    if (isAdminView) {
        if (specificUserId !== 'all') {
            const user = userMap.get(specificUserId);
            return user?.role === 'CRM';
        }
        return selectedTeam === 'all' || selectedTeam === 'CRM';
    }
    return currentUser.role === 'CRM';
  }, [currentUser, isAdminView, selectedTeam, specificUserId, userMap]);

  const handlePrint = () => {
    if (!selectedDateRange?.from) {
      toast({ title: "Date Range Required", description: "Please select a date range before printing.", variant: "destructive" });
      return;
    }

    const from = format(selectedDateRange.from, 'yyyy-MM-dd');
    const to = format(selectedDateRange.to || selectedDateRange.from, 'yyyy-MM-dd');

    let url = `/tmphistory?from=${from}&to=${to}`;

    if (specificUserId !== 'all') {
        const user = userMap.get(specificUserId);
        if (user) {
            url += `&team=${user.role}`;
        }
    } else if (selectedTeam !== 'all') {
        url += `&team=${selectedTeam}`;
    } else {
        toast({ title: "Selection Required", description: "Please select a specific team to print a report.", variant: "destructive" });
        return;
    }

    window.open(url, '_blank');
  };

  const handleExport = () => {
    if (selectedTeam === 'all' || specificUserId !== 'all') {
      toast({ title: "Export Not Available", description: "Please select a specific team (not 'All Teams') and ensure no specific user is selected to export team data.", variant: "destructive" });
      return;
    }

    const { teamReportData } = calculateTeamReportData();

    if (!teamReportData) {
      toast({ title: "No Data", description: "No data available to export for the selected team and date range.", variant: "destructive" });
      return;
    }

    const { users, data, totals } = teamReportData;

    const headers = ["Date"];
    users.forEach(user => {
      const userMonthlyTarget = totals.find(t => t.userId === user.id)?.monthlyTarget || 0;
      const firstName = user.name.split(' ')[0];
      headers.push(`${firstName} (Target: ${userMonthlyTarget})`);
    });

    const rows = data.map(row => {
      const rowData: Record<string, any> = { 'Date': format(parseISO(row.date), 'd-MMM-yy') };
      users.forEach(user => {
        const userMonthlyTarget = totals.find(t => t.userId === user.id)?.monthlyTarget || 0;
        const firstName = user.name.split(' ')[0];
        const userTasks = row[user.id] || { tasks: 0, likelihood: 0 };
        rowData[`${firstName} (Target: ${userMonthlyTarget})`] = `tasks: ${userTasks.tasks} / Assets: ${userTasks.likelihood}`;
      });
      return rowData;
    });

    const totalsRow: Record<string, any> = { 'Date': 'Total' };
    users.forEach(user => {
        const userTotal = totals.find(t => t.userId === user.id) || { totalTasks: 0, totalLikelihood: 0, monthlyTarget: 0 };
        const firstName = user.name.split(' ')[0];
        totalsRow[`${firstName} (Target: ${userTotal.monthlyTarget})`] = `tasks: ${userTotal.totalTasks} / Assets: ${userTotal.totalLikelihood}`;
    });
    rows.push(totalsRow);

    const csv = Papa.unparse({
      fields: headers,
      data: rows,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const safeTeamName = selectedTeam.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `team_performance_${safeTeamName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Successful", description: "Team performance data has been downloaded." });
  };

  const calculateTeamReportData = () => {
    if (!allTasks || !selectedDateRange?.from || !globalSettings) {
      return { teamReportData: null };
    }

    const startDate = startOfDay(selectedDateRange.from);
    const endDate = endOfDay(selectedDateRange.to || selectedDateRange.from);

    let filteredTasks = allTasks.filter(task => {
      try {
        const taskDate = parseISO(task.date);
        return isWithinInterval(taskDate, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });

    if (selectedTeam !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.role === selectedTeam);
    }

    const teamUsers = Array.from(new Set(filteredTasks.map(t => t.userId)))
        .map(id => userMap.get(id))
        .filter((u): u is UserType => !!u)
        .sort((a, b) => a.name.localeCompare(b.name));

    const tasksByDate = new Map<string, Record<string, { tasks: number; likelihood: number }>>();

    filteredTasks.forEach(task => {
        const dateStr = format(parseISO(task.date), 'yyyy-MM-dd');
        if (!tasksByDate.has(dateStr)) {
            tasksByDate.set(dateStr, {});
        }
        const dayEntry = tasksByDate.get(dateStr)!;
        if (!dayEntry[task.userId]) {
            dayEntry[task.userId] = { tasks: 0, likelihood: 0 };
        }
        dayEntry[task.userId].tasks += task.taskCount;
        dayEntry[task.userId].likelihood += task.likelihood || 0;
    });

    const pivotedData = Array.from(tasksByDate.entries())
        .map(([date, userTasks]) => ({ date, ...userTasks }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const userTotals = teamUsers.map(user => {
        const totalTasks = filteredTasks.filter(t => t.userId === user.id).reduce((sum, t) => sum + t.taskCount, 0);
        const totalLikelihood = filteredTasks.filter(t => t.userId === user.id).reduce((sum, t) => sum + (t.likelihood || 0), 0);
        const monthlyTarget = user.monthlyOrderTarget || globalSettings?.roleBasedTargets?.[user.role as keyof typeof globalSettings.roleBasedTargets] || 0;
        return { userId: user.id, totalTasks, totalLikelihood, monthlyTarget };
    });

    return {
        teamReportData: {
            users: teamUsers,
            data: pivotedData,
            totals: userTotals,
        }
    };
  };


  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <RechartsLineChart data={monthlyTargetData}>
            <Tooltip
              cursor={{ strokeDasharray: '3 3', fill: 'hsl(var(--muted))' }}
              content={({ active, payload, label }) => <DoneTargetTooltipContent active={active} payload={payload} label={label} userMap={userMap} currentUser={currentUser} />}
            />
            <Legend />
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <Line type="monotone" dataKey="totalDone" name="Tasks Done" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
            <Line type="monotone" dataKey="totalTarget" name="Target" stroke="hsl(var(--chart-4))" strokeWidth={2} strokeDasharray="5 5" dot={{r:4}} activeDot={{r:6}}/>
            {showLikelihoodChart && (
              <Line type="monotone" dataKey="totalLikelihood" name="Assets" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
            )}
          </RechartsLineChart>
        );
      default:
        return (
          <RechartsBarChart data={monthlyTargetData}>
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={({ active, payload, label }) => <DoneTargetTooltipContent active={active} payload={payload} label={label} userMap={userMap} currentUser={currentUser} />}
            />
            <Legend />
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <Bar dataKey="totalDone" name="Tasks Done" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="totalTarget" name="Target" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            {showLikelihoodChart && (
              <Bar dataKey="totalLikelihood" name="Assets" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            )}
          </RechartsBarChart>
        );
    }
  };

  const selectedSpecificUserName = useMemo(() => {
    if (specificUserId === 'all') return 'Specific User';
    return userMap.get(specificUserId)?.name || 'Select User';
  }, [specificUserId, userMap]);

  return (
    <>
      <Card className="bg-white/95 dark:bg-card/80 backdrop-blur-sm border-border/30 shadow-xl print-container rounded-lg">
        <CardHeader className="print-hide">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary"/>{performanceTitle}</CardTitle>
                  <CardDescription>Aggregated daily task completion against targets for all users.</CardDescription>
              </div>
               <div className="flex items-baseline gap-2 text-right">
                  <div className="text-center rounded-lg shadow-inner bg-background p-3">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-500" />Done</span>
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                          {totals.totalDone.toLocaleString()}
                      </p>
                  </div>
                   <div className="text-center rounded-lg shadow-inner bg-background p-3">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5"><Target className="h-4 w-4 text-yellow-500" />Target</span>
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                          {totalPerformanceTarget.toLocaleString()}
                      </p>
                  </div>
                  {showLikelihoodChart && (
                    <div className="text-center rounded-lg shadow-inner bg-background p-3">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-purple-500" />Assets
                      </span>
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {totals.totalLikelihood.toLocaleString()}
                      </p>
                    </div>
                  )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                   {isInputVisible && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                          {canSubmitFirstLikelihood && (
                            <div className="relative">
                               <Label htmlFor="likelihood-customers-input" className="sr-only">Assets</Label>
                               <Input
                                id="likelihood-customers-input"
                                type="number"
                                placeholder="Assets..."
                                value={likelihoodCustomers}
                                onChange={(e) => setLikelihoodCustomers(e.target.value)}
                                className="h-10 w-full sm:w-40"
                                min="0"
                               />
                            </div>
                          )}
                          {canSubmitSecondEntry && (
                            <>
                             <div className="relative">
                               <Label htmlFor="likelihood-customers-input-2" className="sr-only">Assets</Label>
                               <Input
                                id="likelihood-customers-input-2"
                                type="number"
                                placeholder="Assets..."
                                value={likelihoodCustomers}
                                onChange={(e) => setLikelihoodCustomers(e.target.value)}
                                className="h-10 w-full sm:w-40"
                                min="0"
                               />
                             </div>
                             <Input
                                id="tasks-done-input"
                                type="number"
                                placeholder={`${inputLabel}...`}
                                value={tasksDone}
                                onChange={(e) => setTasksDone(e.target.value)}
                                className="h-10 w-full sm:w-32"
                                min="0"
                             />
                            </>
                          )}
                          {canSubmitTasks && (
                             <Input
                                id="tasks-done-input-single"
                                type="number"
                                placeholder={`${inputLabel}...`}
                                value={tasksDone}
                                onChange={(e) => setTasksDone(e.target.value)}
                                className="h-10 w-full sm:w-32"
                                min="0"
                             />
                          )}

                          {(canSubmitFirstLikelihood || canSubmitSecondEntry || canSubmitTasks) && (
                            <Button onClick={handleDoneClick} disabled={isSubmitting || (canSubmitFirstLikelihood && likelihoodCustomers.trim() === '') || (canSubmitSecondEntry && (likelihoodCustomers.trim() === '' || tasksDone.trim() === '')) || (canSubmitTasks && tasksDone.trim() === '')} className="h-10">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Done"}
                            </Button>
                          )}

                          {hasCompletedDailySubmissions &&
                            <Button asChild className="h-10 w-full sm:w-auto">
                              <Link href="/workflow">
                                Open Desk
                              </Link>
                            </Button>
                          }
                      </div>
                   )}
                   {isAdminView && (
                      <Button asChild className="h-10 w-full sm:w-auto">
                          <Link href="/workflow">
                              Open Desk
                          </Link>
                      </Button>
                   )}
                  {isAdminView && onTeamChange && (
                    <Select value={selectedTeam} onValueChange={(value) => onTeamChange(value as UserRole | 'all')}>
                      <SelectTrigger className="w-full sm:w-[150px] h-10">
                        <SelectValue placeholder="Select Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        <SelectItem value="CRM">CRM</SelectItem>
                        <SelectItem value="DESIGNER_REPRESENTATIVE">Designer Reps</SelectItem>
                        <SelectItem value="LR">Logistics (LR)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                   {isAdminView && onSpecificUserChange && (
                      <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                          <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={isUserPopoverOpen} className="w-full sm:w-[180px] justify-between h-10">
                                  <span className="truncate">{selectedSpecificUserName}</span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                  <CommandInput placeholder="Search user..." />
                                  <CommandList>
                                      <CommandEmpty>No user found.</CommandEmpty>
                                      <CommandGroup>
                                          <CommandItem onSelect={() => { if (onSpecificUserChange) { onSpecificUserChange('all'); setIsUserPopoverOpen(false); } }} className="cursor-pointer">
                                              <Check className={cn("mr-2 h-4 w-4", specificUserId === 'all' ? "opacity-100" : "opacity-0")} />
                                              All Users
                                          </CommandItem>
                                          {specificUserOptions.map(user => (
                                              <CommandItem key={user.id} onSelect={() => { if (onSpecificUserChange) { onSpecificUserChange(user.id); setIsUserPopoverOpen(false); } }} className="cursor-pointer">
                                                  <Check className={cn("mr-2 h-4 w-4", specificUserId === user.id ? "opacity-100" : "opacity-0")} />
                                                  {user.name} ({user.role === 'DESIGNER_REPRESENTATIVE' ? 'DR' : user.role})
                                              </CommandItem>
                                          ))}
                                      </CommandGroup>
                                  </CommandList>
                              </Command>
                          </PopoverContent>
                      </Popover>
                   )}
                  {selectedDateRange && <DateRangePicker
                    initialRange={selectedDateRange}
                    onDateRangeChange={handleDateChange}
                    className="w-full sm:w-auto h-10"
                  />}
                  {isAdminView && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePrint}
                        className="h-10 w-10 print-hide"
                        title="Print Report"
                        disabled={specificUserId === 'all' && selectedTeam === 'all'}
                      >
                        <Printer className="h-5 w-5" />
                      </Button>
                    </>
                  )}
              </div>
          </div>
        </CardHeader>
        <CardContent className="print-hide">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}


const DoneTargetTooltipContent = ({ active, payload, label, userMap, currentUser }: any) => {
    if (active && payload && payload.length) {
        const donePayload = payload.find((p: any) => p.dataKey === 'totalDone');
        const targetPayload = payload.find((p: any) => p.dataKey === 'totalTarget');
        const likelihoodPayload = payload.find((p: any) => p.dataKey === 'totalLikelihood');
        const userData = donePayload?.payload?.userData || {};

        let userBreakdown: { user: UserType, done: number, likelihood: number }[] = [];

        if (currentUser) {
            if (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN') {
                userBreakdown = Object.entries(userData)
                    .map(([userId, data]: [string, any]) => ({ user: userMap.get(userId), done: data.done, likelihood: data.likelihood }))
                    .filter(item => item.user && (item.done >= 0 || item.likelihood >= 0))
                    .sort((a,b) => b.done - a.done) as { user: UserType, done: number, likelihood: number }[];
            } else {
                 userBreakdown = Object.entries(userData)
                    .filter(([userId, data]: [string, any]) => data.role === currentUser.role && (data.done >= 0 || data.likelihood >= 0))
                    .map(([userId, data]: [string, any]) => ({ user: userMap.get(userId), done: data.done, likelihood: data.likelihood }))
                    .filter(item => item.user)
                    .sort((a,b) => b.done - a.done) as { user: UserType, done: number, likelihood: number }[];
            }
        }

        return (
            <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[220px]">
                <div className="grid grid-cols-1 gap-1.5">
                    <p className="font-semibold text-foreground">{label}</p>
                     {donePayload && <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: donePayload.color}}></div>
                        <span className="text-sm text-muted-foreground">Tasks Done:</span>
                        <span className="text-sm font-medium ml-auto">{donePayload.value}</span>
                    </div>}
                     {targetPayload && <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: targetPayload.color}}></div>
                        <span className="text-sm text-muted-foreground">Target:</span>
                        <span className="text-sm font-medium ml-auto">{targetPayload.value}</span>
                    </div>}
                    {likelihoodPayload && likelihoodPayload.value > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: likelihoodPayload.color}}></div>
                            <span className="text-sm text-muted-foreground">Assets:</span>
                            <span className="text-sm font-medium ml-auto">{likelihoodPayload.value}</span>
                        </div>
                    )}
                </div>
                 {userBreakdown.length > 0 && (
                    <>
                        <div className="border-t border-dashed my-1.5"></div>
                        <p className="font-semibold text-xs text-muted-foreground mt-1">Contributors:</p>
                        <ScrollArea className="max-h-32 pr-2 -mr-2">
                            <div className="space-y-1.5 mt-1">
                                {userBreakdown.map(({ user, done, likelihood }) => (
                                    <div key={user.id} className="flex items-center gap-2 text-xs">
                                        <Avatar className="h-5 w-5 border">
                                            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                                            <AvatarFallback className="text-[9px] bg-muted">{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-muted-foreground truncate flex-1">{user.name}</span>
                                        <span className="font-medium text-foreground">{done} tasks</span>
                                        {likelihood > 0 && <span className="font-medium text-purple-600">({likelihood} assets)</span>}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </div>
        )
    }
    return null;
}
