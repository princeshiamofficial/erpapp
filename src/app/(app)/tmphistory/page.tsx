

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTaskEntries } from '@/lib/team-performance-service';
import { getUsers } from '@/lib/user-service';
import { getGlobalSettings } from '@/lib/settings-service';
import type { TaskEntry, User, UserRole, GlobalSettings } from '@/types';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

// This is a wrapper component that uses the hook and passes props down.
function TeamPerformanceReportContent({ team, dateFrom, dateTo }: { team: UserRole | 'all' | null, dateFrom: string | null, dateTo: string | null }) {
    const [allTasks, setAllTasks] = useState<TaskEntry[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [tasks, users, settings] = await Promise.all([
                    getTaskEntries(),
                    getUsers(),
                    getGlobalSettings()
                ]);
                setAllTasks(tasks);
                setAllUsers(users);
                setGlobalSettings(settings);
            } catch (error) {
                console.error("Failed to fetch data for report:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const { teamReportData, reportTitle } = useMemo(() => {
        if (isLoading || !dateFrom || !dateTo || !team || !globalSettings) {
            return { teamReportData: null, reportTitle: 'Performance Report' };
        }

        const startDate = startOfDay(parseISO(dateFrom));
        const endDate = endOfDay(parseISO(dateTo));

        let filteredTasks = allTasks.filter(task => {
            try {
                const taskDate = parseISO(task.date);
                return isWithinInterval(taskDate, { start: startDate, end: endDate });
            } catch {
                return false;
            }
        });

        if (team !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.role === team);
        }

        const teamUsers = Array.from(new Set(filteredTasks.map(t => t.userId)))
            .map(id => allUsers.find(u => u.id === id))
            .filter((u): u is User => !!u)
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
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const userTotals = teamUsers.map(user => {
            const totalTasks = filteredTasks.filter(t => t.userId === user.id).reduce((sum, t) => sum + t.taskCount, 0);
            const totalLikelihood = filteredTasks.filter(t => t.userId === user.id).reduce((sum, t) => sum + (t.likelihood || 0), 0);
            return { userId: user.id, totalTasks, totalLikelihood };
        });

        return {
            reportTitle: `Team Performance Report: ${team.replace(/_/g, ' ')}`,
            teamReportData: {
                users: teamUsers,
                data: pivotedData,
                totals: userTotals,
            }
        };

    }, [isLoading, allTasks, allUsers, globalSettings, team, dateFrom, dateTo]);

    useEffect(() => {
        if (!isLoading && teamReportData) {
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, teamReportData]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Preparing Report...</p>
            </div>
        );
    }

    if (!teamReportData) {
        return <div className="p-8 text-center text-destructive">Could not generate report. Required data is missing.</div>;
    }

    const { users, data, totals } = teamReportData;

    return (
        <>
            <div className="printable-report-area">
                <div className="report-header">
                    <Image
                        src="https://i.ibb.co/FFQMvkz/logo-02-01.jpg"
                        alt="Color Hut Logo"
                        width={200}
                        height={50}
                        priority
                        className="logo"
                    />
                    <div className="report-titles">
                        <h2 className="report-main-title">{reportTitle}</h2>
                        <p className="report-sub-title">
                            Date Range: {dateFrom ? format(parseISO(dateFrom), 'd MMM, yyyy') : 'N/A'} - {dateTo ? format(parseISO(dateTo), 'd MMM, yyyy') : 'N/A'}
                        </p>
                    </div>
                    <div className="report-logo-placeholder"></div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead rowSpan={2} className="align-bottom py-1">Date</TableHead>
                            {users.map(user => <TableHead key={user.id} colSpan={2} className="text-center text-white font-bold py-1">{user.name.split(' ')[0]}</TableHead>)}
                        </TableRow>
                        <TableRow>
                            {users.map(user => (
                                <React.Fragment key={user.id}>
                                    <TableHead className="text-center text-xs font-medium text-white py-1">Tasks</TableHead>
                                    <TableHead className="text-center text-xs font-medium border-r text-white py-1">Likely</TableHead>
                                </React.Fragment>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map(row => (
                            <TableRow key={row.date}>
                                <TableCell className="py-1">{format(parseISO(row.date), 'MMMM do, yyyy')}</TableCell>
                                {users.map(user => (
                                    <React.Fragment key={user.id}>
                                        <TableCell className="text-center py-1">
                                            {((row as any)[user.id] as { tasks: number })?.tasks || 0}
                                        </TableCell>
                                        <TableCell className="text-center border-r py-1">
                                            {((row as any)[user.id] as { likelihood: number })?.likelihood || 0}
                                        </TableCell>
                                    </React.Fragment>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell className="font-bold py-1">Total</TableCell>
                            {users.map(user => (
                                <React.Fragment key={user.id}>
                                    <TableCell className="text-center font-bold py-1">
                                        {totals.find(t => t.userId === user.id)?.totalTasks || 0}
                                    </TableCell>
                                    <TableCell className="text-center font-bold border-r py-1">
                                        {totals.find(t => t.userId === user.id)?.totalLikelihood || 0}
                                    </TableCell>
                                </React.Fragment>
                            ))}
                        </TableRow>
                    </TableFooter>
                </Table>
                <div className="report-footer">
                    <p>&copy; {new Date().getFullYear()} Color Hut. All Rights Reserved.</p>
                </div>
            </div>

            <style jsx global>{`
                @page {
                    size: A4 landscape;
                    margin: 0.5cm;
                }
                .printable-report-area {
                    display: block;
                    padding: 1rem;
                    font-family: sans-serif;
                }
                .report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 1rem;
                }
                .report-titles { text-align: center; }
                .report-main-title { font-size: 1.25rem; font-weight: 700; color: #111827; }
                .report-sub-title { font-size: 0.75rem; color: #6b7280; }
                .logo { 
                  object-fit: contain;
                  border-radius: 8px;
                }
                .report-logo-placeholder { width: 200px; }
                table { width: 100%; border-collapse: collapse; font-size: 0.65rem; }
                th, td { border: 1px solid #e5e7eb; padding: 0.3rem; text-align: left; }
                thead th { 
                  background-color: #111827;
                  color: #ffffff;
                  font-weight: 600; 
                }
                .text-center { text-align: center; }
                tfoot { 
                  background-color: #f9fafb; 
                  font-weight: 700;
                  color: #111827;
                }
                tfoot td { 
                  font-weight: 700;
                }
                .border-r { border-right: 1px solid #e5e7eb; }
                .report-footer { margin-top: 1.5rem; text-align: center; font-size: 0.6rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 0.5rem; }
                
                @media print {
                    html, body {
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                    }
                    .printable-report-area {
                        padding: 0;
                    }
                }
            `}</style>
        </>
    );
}


export default function TeamPerformanceReportPage() {
    const searchParams = useSearchParams();
    const team = (searchParams?.get('team') ?? null) as UserRole | 'all' | null;
    const dateFrom = searchParams?.get('from') ?? null;
    const dateTo = searchParams?.get('to') ?? null;

    return <TeamPerformanceReportContent team={team} dateFrom={dateFrom} dateTo={dateTo} />
}