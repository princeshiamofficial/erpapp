
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { TrackingLink, DistrictDataEntry, DivisionData } from '@/types';
import { getOrders } from '@/lib/order-service';
import { divisions } from '@/lib/district-data';

const AddEditDistrictDataDialog = dynamic(() => import('@/components/crm/AddEditDistrictDataDialog').then(mod => mod.AddEditDistrictDataDialog));


const formatDistrictData = (orders: TrackingLink[]): DivisionData[] => {
    const divisionMap: Record<string, Record<string, DistrictDataEntry[]>> = {};

    orders.forEach(order => {
        const addressParts = order.address.split(',').map(part => part.trim());
        const districtName = addressParts.length > 1 ? addressParts[addressParts.length - 1] : "Unknown";

        let divisionName = "Unknown";
        for (const div of divisions) {
            if (div.districts.some(dist => dist.name === districtName)) {
                divisionName = div.division;
                break;
            }
        }

        if (!divisionMap[divisionName]) {
            divisionMap[divisionName] = {};
        }
        if (!divisionMap[divisionName][districtName]) {
            divisionMap[divisionName][districtName] = [];
        }

        divisionMap[divisionName][districtName].push({
            jobId: order.id,
            businessName: order.companyName,
            address: order.address,
            phone: order.phoneNumber,
        });
    });

    return Object.entries(divisionMap).map(([division, districts]) => ({
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

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DistrictDataEntry | null>(null);

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
  
  const handleOpenAddDialog = () => {
    setEditingEntry(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (entry: DistrictDataEntry) => {
    setEditingEntry(entry);
    setIsAddEditDialogOpen(true);
  };
  
  const handleDataSaved = () => {
    setIsAddEditDialogOpen(false);
    setEditingEntry(null);
    toast({ title: "Success", description: "District data has been saved." });
    // In a real scenario, you'd re-fetch data here.
    // For now, we just close the dialog.
    // fetchData(); 
  };


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
                  <Button className="h-10" onClick={handleOpenAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Data
                  </Button>
                </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] text-base pl-6">Division</TableHead>
                    <TableHead className="w-[180px] text-base">District</TableHead>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7} className="p-0"><Skeleton className="h-14 w-full"/></TableCell>
                      </TableRow>
                    ))
                  ) : filteredData.length > 0 ? filteredData.map((divisionData, divisionIndex) => {
                    let isFirstDivisionRow = true;

                    return divisionData.districts.flatMap((districtData, districtIndex) => {
                      let isFirstDistrictRow = true;

                      return districtData.entries.map((entry, entryIndex) => {
                        const divisionCell = isFirstDivisionRow ? (
                          <TableCell rowSpan={divisionData.districts.reduce((sum, d) => sum + d.entries.length, 0)} className="align-top font-semibold text-card-foreground border-r bg-muted/30 p-4 text-base pl-6">
                            {divisionData.division}
                          </TableCell>
                        ) : null;
                        isFirstDivisionRow = false;

                        const districtCell = isFirstDistrictRow ? (
                          <TableCell rowSpan={districtData.entries.length} className="align-top text-muted-foreground border-r p-4 font-medium">
                            {districtData.name}
                          </TableCell>
                        ) : null;
                        isFirstDistrictRow = false;

                        return (
                          <TableRow key={`${divisionIndex}-${districtIndex}-${entryIndex}`} className="hover:bg-muted/50">
                            {divisionCell}
                            {districtCell}
                            <TableCell className="p-4">{entry.jobId}</TableCell>
                            <TableCell className="p-4">{entry.businessName}</TableCell>
                            <TableCell className="p-4">{entry.address}</TableCell>
                            <TableCell className="p-4">{entry.phone}</TableCell>
                            <TableCell className="p-4 pr-6 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditDialog(entry)}>
                                  <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    });
                  }) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
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
      <AddEditDistrictDataDialog 
        isOpen={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onDataSaved={handleDataSaved}
        entry={editingEntry}
      />
    </>
  );
}
