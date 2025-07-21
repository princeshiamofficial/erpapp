
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const districtsData = [
  {
    division: 'Division 1',
    districts: [
      {
        name: 'District 1',
        entries: [
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
        ],
      },
      {
        name: 'District 2',
        entries: [
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
        ],
      },
    ],
  },
  {
    division: 'Division 2',
    districts: [
      {
        name: 'District 1',
        entries: [
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
        ],
      },
      {
        name: 'District 2',
        entries: [
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
          { jobId: '', name: '', businessName: '', address: '', phone: '' },
        ],
      },
    ],
  },
];

export default function AllDistrictsDataPage() {
  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">All Districts Data</h1>
          <p className="page-description">
            View and manage district information.
          </p>
        </div>
      </div>
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader>
          <CardTitle>District Data</CardTitle>
          <CardDescription>
            Data for all divisions and districts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Division</TableHead>
                  <TableHead className="w-[150px]">District</TableHead>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {districtsData.map((divisionData, divisionIndex) => {
                  const totalRowsForDivision = divisionData.districts.reduce((sum, d) => sum + d.entries.length, 0);
                  let isFirstRowOfDivision = true;

                  return divisionData.districts.map((districtData, districtIndex) => {
                    let isFirstRowOfDistrict = true;

                    return districtData.entries.map((entry, entryIndex) => {
                      const divisionCell = isFirstRowOfDivision ? (
                        <TableCell rowSpan={totalRowsForDivision} className="align-top font-semibold text-card-foreground border-r">
                          {divisionData.division}
                        </TableCell>
                      ) : null;
                      isFirstRowOfDivision = false;

                      const districtCell = isFirstRowOfDistrict ? (
                        <TableCell rowSpan={districtData.entries.length} className="align-top text-muted-foreground border-r">
                          {districtData.name}
                        </TableCell>
                      ) : null;
                      isFirstRowOfDistrict = false;

                      return (
                        <TableRow key={`${divisionIndex}-${districtIndex}-${entryIndex}`}>
                          {divisionCell}
                          {districtCell}
                          <TableCell><Input className="h-8" value={entry.jobId} readOnly /></TableCell>
                          <TableCell><Input className="h-8" value={entry.name} readOnly /></TableCell>
                          <TableCell><Input className="h-8" value={entry.businessName} readOnly /></TableCell>
                          <TableCell><Input className="h-8" value={entry.address} readOnly /></TableCell>
                          <TableCell><Input className="h-8" value={entry.phone} readOnly /></TableCell>
                        </TableRow>
                      );
                    });
                  });
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
