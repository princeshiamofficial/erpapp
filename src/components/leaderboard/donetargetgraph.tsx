
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, AreaChart, Target, User, Calendar } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, Area, AreaChart as RechartsAreaChart, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { User as UserType, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getYear } from 'date-fns';

interface MonthlyTargetData {
    name: string;
    totalDone: number;
    totalTarget: number;
    crmData: {
        [crmId: string]: {
            done: number;
            target: number;
        };
    };
}

interface DoneTargetGraphProps {
  monthlyTargetData: MonthlyTargetData[];
  selectedYear: number;
  userMap: Map<string, UserType>;
  onYearChange: (year: number) => void;
  availableYears: number[];
  onTeamChange: (team: UserRole | 'all') => void;
  selectedTeam: UserRole | 'all';
}

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export function DoneTargetGraph({ monthlyTargetData, selectedYear, userMap, onYearChange, availableYears, onTeamChange, selectedTeam }: DoneTargetGraphProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');

  const TEAM_ROLES: UserRole[] = ['CRM', 'DESIGNER_REPRESENTATIVE', 'LR'];

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
            <Line type="monotone" dataKey="totalDone" name="Projects Done" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
            <Line type="monotone" dataKey="totalTarget" name="Target" stroke="hsl(var(--chart-4))" strokeWidth={2} strokeDasharray="5 5" dot={{r:4}} activeDot={{r:6}}/>
          </RechartsLineChart>
        );
      case 'area':
        return (
          <RechartsAreaChart data={monthlyTargetData}>
             <defs>
                <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={({ active, payload, label }) => <DoneTargetTooltipContent active={active} payload={payload} label={label} userMap={userMap} />}
            />
            <Legend />
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <Area type="monotone" dataKey="totalDone" name="Projects Done" stroke="hsl(var(--chart-2))" fill="url(#colorDone)" />
            <Area type="monotone" dataKey="totalTarget" name="Target" stroke="hsl(var(--chart-4))" fill="url(#colorTarget)" />
          </RechartsAreaChart>
        );
      case 'bar':
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
            <Bar dataKey="totalDone" name="Projects Done" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
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
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary"/>Done / Target</CardTitle>
                <CardDescription>Monthly project creation totals against combined targets.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <Select value={selectedTeam} onValueChange={(value) => onTeamChange(value as UserRole | 'all')}>
                    <SelectTrigger className="w-full sm:w-[150px] h-9">
                        <User className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select Team" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {TEAM_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value, 10))}>
                    <SelectTrigger className="w-full sm:w-[120px] h-9">
                        <Calendar className="h-4 w-4 mr-2"/>
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <div className="flex items-center bg-muted p-1 rounded-lg">
                    <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", chartType === 'bar' && "bg-background shadow-sm")} onClick={() => setChartType('bar')}><BarChart className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", chartType === 'line' && "bg-background shadow-sm")} onClick={() => setChartType('line')}><LineChart className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="sm" className={cn("h-7 w-7 p-0", chartType === 'area' && "bg-background shadow-sm")} onClick={() => setChartType('area')}><AreaChart className="h-4 w-4"/></Button>
                </div>
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
        const crmData = donePayload?.payload?.crmData;
        const crmBreakdown = crmData ? Object.entries(crmData)
            .map(([crmId, data]) => ({ crmId, ...(data as {done: number, target: number}), user: userMap.get(crmId) }))
            .filter(item => item.user && item.done > 0)
            .sort((a, b) => b.done - a.done) : [];

        return (
            <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[220px]">
                <div className="grid grid-cols-1 gap-1.5">
                    <p className="font-semibold text-foreground">{label}</p>
                     {donePayload && <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: donePayload.color}}></div>
                        <span className="text-sm text-muted-foreground">Projects Done:</span>
                        <span className="text-sm font-medium ml-auto">{donePayload.value}</span>
                    </div>}
                     {targetPayload && <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: targetPayload.color}}></div>
                        <span className="text-sm text-muted-foreground">Target:</span>
                        <span className="text-sm font-medium ml-auto">{targetPayload.value}</span>
                    </div>}
                    
                    {crmBreakdown.length > 0 && (
                        <>
                            <div className="border-t border-dashed my-1"></div>
                            <p className="font-semibold text-xs text-muted-foreground mt-1">Top Contributors:</p>
                            <ScrollArea className="max-h-28 pr-2">
                              <div className="space-y-1.5">
                                {crmBreakdown.map(({ crmId, done, target, user }) => (
                                    <div key={crmId} className="flex items-center gap-2 text-xs">
                                        <Avatar className="h-5 w-5 border">
                                            <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name} />
                                            <AvatarFallback className="text-[9px]">{getInitials(user?.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-muted-foreground truncate flex-1">{user?.name}</span>
                                        <span className="font-medium">{done} / {target}</span>
                                    </div>
                                ))}
                              </div>
                            </ScrollArea>
                        </>
                    )}
                </div>
            </div>
        )
    }
    return null;
}
