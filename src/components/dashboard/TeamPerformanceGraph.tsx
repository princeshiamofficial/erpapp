
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Target, Users, CalendarDays } from 'lucide-react';
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
import { getYear, format, parseISO } from 'date-fns';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface DailyTargetData {
    name: string;
    totalDone: number;
    totalTarget: number;
    userData: {
        [userId: string]: {
            done: number;
            target: number;
        };
    };
}

interface TeamPerformanceGraphProps {
  monthlyTargetData: DailyTargetData[];
  selectedDateRange: DateRange | undefined;
  userMap: Map<string, UserType>;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export function TeamPerformanceGraph({ monthlyTargetData, selectedDateRange, userMap, onDateRangeChange }: TeamPerformanceGraphProps) {
  const [chartType, setChartType] = useState<'line'>('line');
  const [tasksDone, setTasksDone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth(); // Get the current user

  const handleDateChange = (range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    onDateRangeChange(range);
  };
  
  const handleDoneClick = () => {
    setIsSubmitting(true);
    // Here you would typically call an action to save the tasksDone value
    // Differentiating logic based on role can be done here.
    if (currentUser?.role === 'LR') {
        console.log(`Submitting ${tasksDone} tasks for the LR team.`);
    } else {
        console.log(`Submitting ${tasksDone} tasks for user ${currentUser?.name}.`);
    }

    setTimeout(() => {
        setIsSubmitting(false);
        // Logic to handle post-submission state, e.g., disable input for the day
    }, 1000);
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


  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <RechartsLineChart data={monthlyTargetData}>
            <Tooltip
              cursor={{ strokeDasharray: '3 3', fill: 'hsl(var(--muted))' }}
              content={({ active, payload, label }) => <DoneTargetTooltipContent active={active} payload={payload} label={label} userMap={userMap} />}
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
              content={({ active, payload, label }) => <DoneTargetTooltipContent active={active} payload={payload} label={label} userMap={userMap} />}
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
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
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
                        />
                        <Button onClick={handleDoneClick} disabled={isSubmitting || !tasksDone} className="h-10">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Done"}
                        </Button>
                    </div>
                 )}
                <DateRangePicker 
                  initialRange={selectedDateRange} 
                  onDateRangeChange={handleDateChange}
                  className="w-full sm:w-auto"
                />
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


const DoneTargetTooltipContent = ({ active, payload, label, userMap }: any) => {
    if (active && payload && payload.length) {
        const donePayload = payload.find(p => p.dataKey === 'totalDone');
        const targetPayload = payload.find(p => p.dataKey === 'totalTarget');
        
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
            </div>
        )
    }
    return null;
}
