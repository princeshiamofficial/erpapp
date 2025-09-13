
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Target, Users, CalendarDays, TrendingUp } from 'lucide-react';
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
    ChartTooltip,
    ChartTooltipContent,
  } from "@/components/ui/chart"
import { parseISO, startOfDay, isSameDay, getDaysInMonth, startOfMonth, subMonths, format, differenceInDays, endOfDay, endOfMonth } from 'date-fns';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Label } from "@/components/ui/label";
import { addTaskEntryAction } from '@/app/(app)/dashboard/actions';
import { useToast } from '@/hooks/use-toast';
import { getTaskEntries, TaskEntry, getMonthlyTargetHistory, setMonthlyTargetHistory } from '@/lib/team-performance-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; 
import { ScrollArea } from '@/components/ui/scroll-area'; 


interface DailyTargetData {
    name: string;
    totalDone: number;
    totalTarget: number;
    userData: {
        [userId: string]: {
            done: number;
            role: UserRole;
        };
    };
}

interface TeamPerformanceGraphProps {
  monthlyTargetData: DailyTargetData[];
  totalPerformanceTarget: number;
  selectedDateRange: DateRange | undefined;
  userMap: Map<string, UserType>;
  onDateRangeChange: (range: DateRange | undefined, label: string, predefinedValue: PredefinedRange | "custom" | null) => void;
  onTeamChange?: (team: UserRole | 'all') => void; // Optional for admin
  selectedTeam?: UserRole | 'all'; // Optional for admin
  isAdminView?: boolean; // To show the dropdown
}

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export function TeamPerformanceGraph({ monthlyTargetData: initialMonthlyTargetData, totalPerformanceTarget: initialTotalPerformanceTarget, selectedDateRange, userMap, onDateRangeChange, onTeamChange, selectedTeam, isAdminView }: TeamPerformanceGraphProps) {
  const [chartType, setChartType] = useState<'line'>('line');
  const [tasksDone, setTasksDone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [taskEntries, setTaskEntries] = useState<TaskEntry[]>([]);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [monthlyTargetData, setMonthlyTargetData] = useState(initialMonthlyTargetData);
  const [totalPerformanceTarget, setTotalPerformanceTarget] = useState(initialTotalPerformanceTarget);

  const fetchTaskData = async () => {
    const entries = await getTaskEntries();
    setTaskEntries(entries);
  };
  
  useEffect(() => {
    fetchTaskData();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const todaysSubmission = taskEntries.find(entry => 
        isSameDay(parseISO(entry.date), new Date()) && 
        entry.userId === currentUser.id
    );

    setHasSubmittedToday(!!todaysSubmission);
  }, [taskEntries, currentUser]);


  const handleDateChange = (range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    onDateRangeChange(range, displayLabel, predefinedValue);
  };
  
  const handleDoneClick = async () => {
    if (!currentUser) {
        toast({ title: "Error", description: "You must be logged in to submit tasks.", variant: "destructive" });
        return;
    }
    const taskCount = parseInt(tasksDone, 10);
    if (isNaN(taskCount) || taskCount < 0) {
        toast({ title: "Invalid Input", description: "Please enter a valid number of tasks.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    
    const result = await addTaskEntryAction(currentUser, taskCount);
    
    if (result.success) {
        toast({ title: "Tasks Submitted", description: `Your ${taskCount} completed tasks have been recorded.` });
        setTasksDone('');
        setHasSubmittedToday(true); 
        await fetchTaskData(); 
    } else {
        toast({ title: "Submission Failed", description: result.error, variant: "destructive" });
    }

    setIsSubmitting(false);
  };
  
  const isInputVisible = useMemo(() => {
    if (!currentUser) return false;
    const visibleRoles: UserRole[] = ['CRM', 'DESIGNER_REPRESENTATIVE', 'LR'];
    return visibleRoles.includes(currentUser.role);
  }, [currentUser]);
  
  const inputLabel = useMemo(() => {
      if(currentUser?.role === 'LR') return "Team Tasks Done";
      return "My Tasks Done";
  }, [currentUser?.role]);
  
  const totals = useMemo(() => {
    if (!monthlyTargetData || monthlyTargetData.length === 0) {
      return { totalDone: 0 };
    }
    return monthlyTargetData.reduce((acc, day) => {
      acc.totalDone += day.totalDone;
      return acc;
    }, { totalDone: 0 });
  }, [monthlyTargetData]);


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
          </RechartsBarChart>
        );
    }
  };

  return (
    <Card className="bg-white/95 dark:bg-card/80 backdrop-blur-sm border-border/30 shadow-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary"/>Team Performance</CardTitle>
                <CardDescription>Aggregated daily task completion against targets for all users.</CardDescription>
            </div>
             <div className="flex items-baseline gap-2 text-right">
                <span className="text-sm text-muted-foreground">Done</span>
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                    {totals.totalDone.toLocaleString()}
                </div>
                <div className="text-muted-foreground">
                    /
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                    {totalPerformanceTarget.toLocaleString()}
                </div>
                <span className="text-sm text-muted-foreground">Target</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                 {isInputVisible && (
                    <div className="flex items-center gap-1 w-full sm:w-auto">
                        <Label htmlFor="tasks-done-input" className="text-xs text-muted-foreground mr-1 whitespace-nowrap sr-only">{inputLabel}</Label>
                        <Input 
                            id="tasks-done-input"
                            type="number" 
                            placeholder={`${inputLabel}...`}
                            value={tasksDone} 
                            onChange={(e) => setTasksDone(e.target.value)} 
                            className="h-10 w-full sm:w-32"
                            min="0"
                            disabled={hasSubmittedToday}
                        />
                        <Button onClick={handleDoneClick} disabled={isSubmitting || !tasksDone || hasSubmittedToday} className="h-10">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : hasSubmittedToday ? "Submitted" : "Done"}
                        </Button>
                    </div>
                 )}
                {isAdminView && onTeamChange && (
                  <Select value={selectedTeam} onValueChange={(value) => onTeamChange(value as UserRole | 'all')}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                {selectedDateRange && <DateRangePicker 
                  initialRange={selectedDateRange} 
                  onDateRangeChange={handleDateChange}
                  className="w-full sm:w-auto"
                />}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}


const DoneTargetTooltipContent = ({ active, payload, label, userMap, currentUser }: any) => {
    if (active && payload && payload.length) {
        const donePayload = payload.find((p: any) => p.dataKey === 'totalDone');
        const targetPayload = payload.find((p: any) => p.dataKey === 'totalTarget');
        const userData = donePayload?.payload?.userData || {};
        
        let userBreakdown: { user: UserType, done: number }[] = [];
        
        if (currentUser) {
            if (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN') {
                userBreakdown = Object.entries(userData)
                    .map(([userId, data]: [string, any]) => ({ user: userMap.get(userId), done: data.done }))
                    .filter(item => item.user && item.done > 0)
                    .sort((a,b) => b.done - a.done) as { user: UserType, done: number }[];
            } else {
                 userBreakdown = Object.entries(userData)
                    .filter(([userId, data]: [string, any]) => data.role === currentUser.role && data.done > 0)
                    .map(([userId, data]: [string, any]) => ({ user: userMap.get(userId), done: data.done }))
                    .filter(item => item.user)
                    .sort((a,b) => b.done - a.done) as { user: UserType, done: number }[];
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
                </div>
                 {userBreakdown.length > 0 && (
                    <>
                        <div className="border-t border-dashed my-1.5"></div>
                        <p className="font-semibold text-xs text-muted-foreground mt-1">Contributors:</p>
                        <ScrollArea className="max-h-32 pr-2 -mr-2">
                            <div className="space-y-1.5 mt-1">
                                {userBreakdown.map(({ user, done }) => (
                                    <div key={user.id} className="flex items-center gap-2 text-xs">
                                        <Avatar className="h-5 w-5 border">
                                            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                                            <AvatarFallback className="text-[9px] bg-muted">{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-muted-foreground truncate flex-1">{user.name}</span>
                                        <span className="font-medium text-foreground">{done}</span>
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
