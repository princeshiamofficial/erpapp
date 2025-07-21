
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const districtsData = [
  {
    division: 'Division 1',
    districts: [
      {
        name: 'District 1',
        entries: [
          { jobId: 'J001', businessName: 'Alice\'s Wonderland', address: '123 Main St', phone: '555-0101' },
          { jobId: 'J002', businessName: 'Bob\'s Burgers', address: '456 Oak Ave', phone: '555-0102' },
          { jobId: 'J003', businessName: 'Charlie\'s Chocolate', address: '789 Pine Ln', phone: '555-0103' },
        ],
      },
      {
        name: 'District 2',
        entries: [
          { jobId: 'J004', businessName: 'Diana\'s Diner', address: '101 Maple Dr', phone: '555-0104' },
          { jobId: 'J005', businessName: 'Eve\'s Eatery', address: '212 Birch Rd', phone: '555-0105' },
        ],
      },
    ],
  },
  {
    division: 'Division 2',
    districts: [
      {
        name: 'District 3',
        entries: [
          { jobId: 'J006', businessName: 'Frank\'s Fish', address: '321 Elm Ct', phone: '555-0106' },
          { jobId: 'J007', businessName: 'Grace\'s Grill', address: '654 Spruce Blvd', phone: '555-0107' },
        ],
      },
      {
        name: 'District 4',
        entries: [
          { jobId: 'J008', businessName: 'Heidi\'s Hangar', address: '987 Cedar Way', phone: '555-0108' },
          { jobId: 'J009', businessName: 'Ivan\'s Ice Cream', address: '111 Redwood St', phone: '555-0109' },
          { jobId: 'J010', businessName: 'Judy\'s Juices', address: '222 Aspen Ave', phone: '555-0110' },
          { jobId: 'J011', businessName: 'Mallory\'s Market', address: '333 Willow Ln', phone: '555-0111' },
        ],
      },
    ],
  },
];

export default function AllDistrictsDataPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
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
          <CardTitle>District Data</CardTitle>
          <CardDescription>
            A comprehensive list of data for all divisions and their respective districts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] text-base pl-6">Division</TableHead>
                  <TableHead className="w-[180px] text-base">District</TableHead>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="pr-6">Phone</TableHead>
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
                        <TableCell rowSpan={totalRowsForDivision} className="align-top font-semibold text-card-foreground border-r bg-muted/30 p-4 text-base pl-6">
                          {divisionData.division}
                        </TableCell>
                      ) : null;
                      isFirstRowOfDivision = false;

                      const districtCell = isFirstRowOfDistrict ? (
                        <TableCell rowSpan={districtData.entries.length} className="align-top text-muted-foreground border-r p-4 font-medium">
                          {districtData.name}
                        </TableCell>
                      ) : null;
                      isFirstRowOfDistrict = false;

                      return (
                        <TableRow key={`${divisionIndex}-${districtIndex}-${entryIndex}`} className="hover:bg-muted/50">
                          {divisionCell}
                          {districtCell}
                          <TableCell className="p-4">{entry.jobId}</TableCell>
                          <TableCell className="p-4">{entry.businessName}</TableCell>
                          <TableCell className="p-4">{entry.address}</TableCell>
                          <TableCell className="p-4 pr-6">{entry.phone}</TableCell>
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
