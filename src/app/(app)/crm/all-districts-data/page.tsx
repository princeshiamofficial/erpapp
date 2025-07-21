
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TrackingLink, DistrictDataEntry, DivisionData } from '@/types';
import { getOrders } from '@/lib/order-service';
import { divisions } from '@/lib/district-data';


const formatDistrictData = (orders: TrackingLink[]): DivisionData[] => {
    const divisionMap: Record<string, Record<string, DistrictDataEntry[]>> = {};

    orders.forEach(order => {
        let foundDistrict: { name: string; division: string; } | null = null;
        
        const addressParts = order.address.toLowerCase().split(/[\s,]+/).map(p => p.trim().replace(/[.,!?:;]$/, ''));

        for (const div of divisions) {
            for (const dist of div.districts) {
                if (addressParts.includes(dist.name.toLowerCase())) {
                    foundDistrict = { name: dist.name, division: div.division };
                    break;
                }
            }
            if (foundDistrict) break;
        }

        const districtName = foundDistrict ? foundDistrict.name : "Unknown";
        const divisionName = foundDistrict ? foundDistrict.division : "Unknown";

        if (!divisionMap[divisionName]) {
            divisionMap[divisionName] = {};
        }
        if (!divisionMap[divisionName][districtName]) {
            divisionMap[divisionName][districtName] = [];
        }

        const companyNameParts = order.companyName.split('•').map(part => part.trim());
        const jobId = companyNameParts.length > 1 ? companyNameParts[0] : order.id;
        const businessName = companyNameParts.length > 1 ? companyNameParts.slice(1).join(' • ').trim() : order.companyName;

        divisionMap[divisionName][districtName].push({
            jobId: jobId,
            businessName: businessName,
            address: order.address,
            phone: order.phoneNumber,
        });
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
        })),
    }));
};

export default function AllDistrictsDataPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [districtData, setDistrictData] = useState<DivisionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const fetchedOrders = await getOrders();
        const formattedData = formatDistrictData(fetchedOrders);
        setDistrictData(formattedData);
    } catch (error) {
        console.error("Failed to fetch order data for districts page:", error);
        toast({ title: "Error", description: "Could not load district data.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return districtData;
    }

    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return districtData.map(division => {
      const filteredDistricts = division.districts.map(district => {
        const filteredEntries = district.entries.filter(entry =>
          entry.jobId.toLowerCase().includes(lowercasedSearchTerm) ||
          entry.businessName.toLowerCase().includes(lowercasedSearchTerm) ||
          entry.address.toLowerCase().includes(lowercasedSearchTerm) ||
          entry.phone.toLowerCase().includes(lowercasedSearchTerm) ||
          district.name.toLowerCase().includes(lowercasedSearchTerm) ||
          division.division.toLowerCase().includes(lowercasedSearchTerm)
        );
        return { ...district, entries: filteredEntries };
      }).filter(district => district.entries.length > 0);

      return { ...division, districts: filteredDistricts };
    }).filter(division => division.districts.length > 0);

  }, [districtData, searchTerm]);


  return (
    <>
      <div className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8 pt-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">All Districts Data</h1>
            <p className="page-description">
              View and manage district information across all divisions.
            </p>
          </div>
        </div>
        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-grow">
                    <CardTitle>District Data</CardTitle>
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
                </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] text-xs pl-6 py-2">Division</TableHead>
                    <TableHead className="w-[180px] text-xs py-2">District</TableHead>
                    <TableHead className="text-xs py-2">Job ID</TableHead>
                    <TableHead className="text-xs py-2">Business Name</TableHead>
                    <TableHead className="text-xs py-2">Address</TableHead>
                    <TableHead className="text-xs py-2">Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="p-0"><Skeleton className="h-12 w-full"/></TableCell>
                      </TableRow>
                    ))
                  ) : filteredData.length > 0 ? filteredData.map((divisionData, divisionIndex) => {
                    let isFirstDivisionRow = true;

                    return divisionData.districts.flatMap((districtData, districtIndex) => {
                      let isFirstDistrictRow = true;

                      return districtData.entries.map((entry, entryIndex) => {
                        const divisionCell = isFirstDivisionRow ? (
                          <TableCell rowSpan={divisionData.districts.reduce((sum, d) => sum + d.entries.length, 0)} className="align-top font-semibold text-card-foreground border-r bg-muted/30 py-3 px-4 text-sm pl-6">
                            {divisionData.division}
                          </TableCell>
                        ) : null;
                        isFirstDivisionRow = false;

                        const districtCell = isFirstDistrictRow ? (
                          <TableCell rowSpan={districtData.entries.length} className="align-top text-muted-foreground border-r py-3 px-4 text-sm">
                            {districtData.name}
                          </TableCell>
                        ) : null;
                        isFirstDistrictRow = false;

                        return (
                          <TableRow key={`${divisionIndex}-${districtIndex}-${entryIndex}`} className="hover:bg-muted/50 text-sm">
                            {divisionCell}
                            {districtCell}
                            <TableCell className="py-2.5 px-4">{entry.jobId}</TableCell>
                            <TableCell className="py-2.5 px-4">{entry.businessName}</TableCell>
                            <TableCell className="py-2.5 px-4">{entry.address}</TableCell>
                            <TableCell className="py-2.5 px-4">{entry.phone}</TableCell>
                          </TableRow>
                        );
                      });
                    });
                  }) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No results found{searchTerm ? ` for "${searchTerm}"` : ''}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
