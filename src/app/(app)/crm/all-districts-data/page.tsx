
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileSpreadsheet, PlusCircle, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TrackingLink, DistrictDataEntry, DivisionData } from '@/types';
import { getOrders } from '@/lib/order-service';
import { getManualDistrictData } from '@/lib/district-data-service'; // Import new service
import { divisions } from '@/lib/district-data';
import Papa from 'papaparse';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { AddEditDistrictDataDialog } from '@/components/crm/AddEditDistrictDataDialog';
import { cn } from '@/lib/utils';
import { DateRangePicker3, type PredefinedRange } from '@/components/dashboard/date-range-picker3';
import type { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';


const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(parseISO(dateString), 'd MMM, yyyy');
    } catch (e) {
        return 'Invalid Date';
    }
};

const formatDistrictData = (orders: TrackingLink[], manualEntries: DistrictDataEntry[]): DivisionData[] => {
    const simplifyString = (str: string) => str.replace(/['’.,\s-]/g, '').toLowerCase();

    // 1. Process all sources into a unified list of entries
    const allEntries: DistrictDataEntry[] = [];

    // Process orders from tracking links
    orders.forEach(order => {
        const companyNameParts = order.companyName.split('•').map(part => part.trim());
        const jobId = (companyNameParts.length > 1 ? companyNameParts[0] : order.id).trim();
        const businessName = companyNameParts.length > 1 ? companyNameParts.slice(1).join(' • ').trim() : order.companyName;
        const phone = order.phoneNumber.trim();

        // Calculate division/district for orders based on address
        let longestMatch: { name: string; division: string; } | null = null;
        let longestMatchLength = 0;
        const simplifiedAddress = simplifyString(order.address);

        for (const div of divisions) {
            for (const dist of div.districts) {
                const namesToMatch = [dist.name, ...(dist.aliases || [])];
                for (const name of namesToMatch) {
                    const simplifiedDistName = simplifyString(name);
                    if (simplifiedDistName.length > 0 && simplifiedAddress.includes(simplifiedDistName)) {
                        if (simplifiedDistName.length > longestMatchLength) {
                            longestMatchLength = simplifiedDistName.length;
                            longestMatch = { name: dist.name, division: div.division };
                        }
                    }
                }
            }
        }

        allEntries.push({
            jobId,
            businessName,
            address: order.address,
            phone,
            orderDate: order.createdAt,
            district: longestMatch ? longestMatch.name : "Unknown",
            division: longestMatch ? longestMatch.division : "Unknown",
        });
    });

    // Add manual entries
    manualEntries.forEach(entry => {
        allEntries.push({
            ...entry,
            jobId: entry.jobId.trim(),
            phone: entry.phone.trim(),
            division: entry.division || 'Unknown',
            district: entry.district || 'Unknown',
        });
    });

    // 2. Sort by date descending (latest first)
    allEntries.sort((a, b) => {
        const dateA = new Date(a.orderDate).getTime();
        const dateB = new Date(b.orderDate).getTime();
        return dateB - dateA;
    });

    // 3. De-duplicate based on Job ID or Phone, keeping the latest (since we sorted)
    const divisionMap: Record<string, Record<string, DistrictDataEntry[]>> = {};
    const seenJobIds = new Set<string>();

    allEntries.forEach(entry => {
        const jobIdLower = entry.jobId.toLowerCase();

        if (seenJobIds.has(jobIdLower)) {
            return; // Skip duplicate
        }

        seenJobIds.add(jobIdLower);

        // 4. Organize into division/district map
        const divisionName = entry.division!;
        const districtName = entry.district!;

        if (!divisionMap[divisionName]) divisionMap[divisionName] = {};
        if (!divisionMap[divisionName][districtName]) divisionMap[divisionName][districtName] = [];
        divisionMap[divisionName][districtName].push(entry);
    });

    const sortedDivisions = Object.entries(divisionMap).sort(([divisionA], [divisionB]) => {
      if (divisionA === 'Unknown') return 1;
      if (divisionB === 'Unknown') return -1;
      return divisionA.localeCompare(divisionB);
    });

    return sortedDivisions.map(([division, districts]) => ({
        division,
        districts: Object.entries(districts).map(([name, entries]) => ({
            name,
            entries,
        })).sort((a,b) => a.name.localeCompare(b.name)),
    }));
};

export default function AllDistrictsDataPage() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [districtData, setDistrictData] = useState<DivisionData[]>([]);
  const [rawOrders, setRawOrders] = useState<TrackingLink[]>([]);
  const [rawManualEntries, setRawManualEntries] = useState<DistrictDataEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [dateRangeLabel, setDateRangeLabel] = useState<string>("All Time");
  const [showAddButton, setShowAddButton] = useState(false);

  const handleDateRangeChange = (
    range: DateRange | undefined,
    displayLabel: string,
    predefinedValue: PredefinedRange | "custom" | null
  ) => {
    setSelectedDateRange(range);
    setDateRangeLabel(displayLabel);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const startStr = (!debouncedSearchTerm && selectedDateRange?.from) ? startOfDay(selectedDateRange.from).toISOString() : undefined;
        const endStr = (!debouncedSearchTerm && selectedDateRange?.to) ? endOfDay(selectedDateRange.to).toISOString() : undefined;
        const role = currentUser?.role;
        
        const [fetchedOrders, fetchedManualEntries] = await Promise.all([
            getOrders(startStr, endStr, role, undefined, undefined, undefined, debouncedSearchTerm),
            getManualDistrictData(startStr, endStr, role, undefined, undefined, undefined, debouncedSearchTerm)
        ]);
        
        setRawOrders(fetchedOrders);
        setRawManualEntries(fetchedManualEntries);
    } catch (error) {
        console.error("Failed to fetch order data for districts page:", error);
        toast({ title: "Error", description: "Could not load district data.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [toast, selectedDateRange, currentUser, debouncedSearchTerm]);
  
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateRange, currentUser, debouncedSearchTerm]);

  useEffect(() => {
    const formattedData = formatDistrictData(rawOrders, rawManualEntries);
    setDistrictData(formattedData);
  }, [rawOrders, rawManualEntries]);

  const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  const filteredData = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.trim().toLowerCase();

    return districtData.map(division => {
      const divisionMatches = division.division.toLowerCase().includes(lowercasedSearchTerm);

      const filteredDistricts = division.districts.map(district => {
        const districtMatches = district.name.toLowerCase().includes(lowercasedSearchTerm);

        const filteredEntries = district.entries.filter(entry => {
          // If no search term, only system admins can see the data by default
          if (!searchTerm && !isSystemAdmin) return false;
          if (!searchTerm) return true;

          // If division or district matches the search term, keep all their entries
          if (divisionMatches || districtMatches) return true;

          // Otherwise check individual entry fields
          return (
            (entry.jobId || '').toLowerCase().includes(lowercasedSearchTerm) ||
            (entry.businessName || '').toLowerCase().includes(lowercasedSearchTerm) ||
            (entry.address || '').toLowerCase().includes(lowercasedSearchTerm) ||
            (entry.phone || '').toLowerCase().includes(lowercasedSearchTerm)
          );
        });
        return { ...district, entries: filteredEntries };
      }).filter(district => district.entries.length > 0);

      return { ...division, districts: filteredDistricts };
    }).filter(division => division.districts.length > 0);

  }, [districtData, searchTerm, selectedDateRange, isSystemAdmin]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no data matching the current filters.",
      });
      return;
    }

    const flattenedData = filteredData.flatMap(division =>
      division.districts.flatMap(district =>
        district.entries.map(entry => ({
          Division: division.division,
          District: district.name,
          'Job ID': entry.jobId,
          'Order Date': formatDate(entry.orderDate),
          'Business Name': entry.businessName,
          Address: entry.address,
          Phone: entry.phone,
        }))
      )
    );

    const csv = Papa.unparse(flattenedData);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'districts_data_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "District data has been downloaded as a CSV file.",
    });
  };
  
  const handleDataSaved = () => {
    setIsAddEditDialogOpen(false);
    // In a real app, you would refetch data here:
    fetchData();
  };

  const canAddData = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'CRM';
  const canExportData = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN';


  return (
    <>
      <div className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8 pt-0">
        <Card className="shadow-xl border bg-card rounded-lg">
          <CardHeader className="sticky top-[4.5rem] z-20 bg-card/95 backdrop-blur-sm border-b p-5 rounded-t-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-grow">
                    <CardTitle 
                      onDoubleClick={() => setShowAddButton(true)} 
                      className="cursor-default select-none"
                    >
                      District Data
                    </CardTitle>
                    <CardDescription>
                      A comprehensive list of data for all divisions and their respective districts.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search table..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background h-10 rounded-md w-full"
                    />
                  </div>
                  <DateRangePicker3 initialRange={selectedDateRange} onDateRangeChange={handleDateRangeChange} />
                  {canAddData && showAddButton && (
                    <Button
                      onClick={() => setIsAddEditDialogOpen(true)}
                      variant="outline"
                      className="h-10 w-full sm:w-auto"
                      disabled={isLoading}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Data
                    </Button>
                  )}
                   {canExportData && (
                    <Button
                      onClick={handleExport}
                      variant="outline"
                      className="h-10 w-full sm:w-auto"
                      disabled={isLoading}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  )}
                </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="sm:overflow-visible">
              <Table containerClassName="overflow-auto sm:overflow-visible">
                <TableHeader className="sm:sticky sm:top-[9.5rem] bg-card z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <TableRow>
                    <TableHead className="w-[200px] text-xs pl-6 py-2 sm:sticky sm:top-[9.5rem] bg-card z-10">Division</TableHead>
                    <TableHead className="w-[180px] text-xs py-2 sm:sticky sm:top-[9.5rem] bg-card z-10">District</TableHead>
                    <TableHead className="text-xs py-2 sm:sticky sm:top-[9.5rem] bg-card z-10">Job ID</TableHead>
                    <TableHead className="text-xs py-2 sm:sticky sm:top-[9.5rem] bg-card z-10">Order Date</TableHead>
                    <TableHead className="text-xs py-2 sm:sticky sm:top-[9.5rem] bg-card z-10">Business Name</TableHead>
                    <TableHead className="text-xs py-2 sm:sticky sm:top-[9.5rem] bg-card z-10">Address</TableHead>
                    <TableHead className="text-xs py-2 sm:sticky sm:top-[9.5rem] bg-card z-10">Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7} className="p-0"><Skeleton className="h-12 w-full"/></TableCell>
                      </TableRow>
                    ))
                  ) : filteredData.length > 0 ? filteredData.map((divisionData, divisionIndex) => {
                    let isFirstDivisionRow = true;

                    return divisionData.districts.flatMap((districtData, districtIndex) => {
                      let isFirstDistrictRow = true;

                      return districtData.entries.map((entry, entryIndex) => {
                        const divisionCell = isFirstDivisionRow ? (
                          <TableCell
                            rowSpan={divisionData.districts.reduce((sum, d) => sum + d.entries.length, 0)}
                            className={cn(
                              "align-top font-semibold text-card-foreground border-r bg-muted/30 py-4 px-4 text-sm pl-6",
                              divisionData.division === 'Unknown' && "bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                            )}
                          >
                            {divisionData.division}
                          </TableCell>
                        ) : null;
                        isFirstDivisionRow = false;

                        const districtCell = isFirstDistrictRow ? (
                          <TableCell
                            rowSpan={districtData.entries.length}
                            className={cn(
                              "align-top text-muted-foreground border-r py-4 px-4 text-sm",
                              districtData.name === 'Unknown' && "bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                            )}
                          >
                            {districtData.name}
                          </TableCell>
                        ) : null;
                        isFirstDistrictRow = false;

                        return (
                          <TableRow key={`${divisionIndex}-${districtIndex}-${entryIndex}`} className="hover:bg-muted/50 text-sm">
                            {divisionCell}
                            {districtCell}
                            <TableCell className="py-3 px-4">{entry.jobId}</TableCell>
                            <TableCell className="py-3 px-4 whitespace-nowrap">{formatDate(entry.orderDate)}</TableCell>
                            <TableCell className="py-3 px-4">{entry.businessName}</TableCell>
                            <TableCell className="py-3 px-4">{entry.address}</TableCell>
                            <TableCell className="py-3 px-4">{entry.phone}</TableCell>
                          </TableRow>
                        );
                      });
                    });
                  }) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        {!isSystemAdmin && !searchTerm.trim() 
                          ? "Please enter a search term to view results." 
                          : `No results found${searchTerm ? ` for "${searchTerm}"` : ''}.`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

            </div>
          </CardContent>
        </Card>
      </div>
      
      <AddEditDistrictDataDialog
        isOpen={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onDataSaved={handleDataSaved}
      />
    </>
  );
}
