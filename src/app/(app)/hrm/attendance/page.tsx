
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, BarChartHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function AttendancePage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("attendees_report");

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <p>Access Denied. You must be an Administrator to view this page.</p>
            </div>
        );
    }

    const attendeesReportContent = (
        <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl font-bold text-gray-800">Attendees Report</CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Filter by date..."
                        className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"
                        type="date"
                    />
                    </div>
                    <Button variant="outline" className="h-10 rounded-full border-gray-200 bg-white"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
                </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>In Time</TableHead>
                        <TableHead>Out Time</TableHead>
                        <TableHead>Hours Worked</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-48 text-gray-500">
                                <BarChartHorizontal className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                No attendance data recorded for the selected period.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                </div>
            </CardContent>
        </Card>
    );

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'attendees_report':
                return attendeesReportContent;
            default:
                return attendeesReportContent;
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
                    <TabsTrigger value="attendees_report" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Attendees Report</TabsTrigger>
                </TabsList>
                <div className="mt-6">
                    {renderActiveTab()}
                </div>
            </Tabs>
        </div>
    );
}
