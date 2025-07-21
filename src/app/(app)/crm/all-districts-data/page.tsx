
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const districtsData = [
  {
    division: 'Dhaka Division',
    districts: [
      {
        name: 'Dhaka',
        entries: [
          { jobId: 'DHK001', businessName: 'Star Kabab & Restaurant', address: 'Banani, Dhaka', phone: '01712-345678' },
          { jobId: 'DHK002', businessName: 'Aarong', address: 'Gulshan, Dhaka', phone: '01823-456789' },
          { jobId: 'DHK003', businessName: 'Bata Shoe Company', address: 'New Market, Dhaka', phone: '01934-567890' },
        ],
      },
      {
        name: 'Gazipur',
        entries: [
          { jobId: 'GAZ001', businessName: 'Bhawal Resort & Spa', address: 'Sreepur, Gazipur', phone: '01645-678901' },
          { jobId: 'GAZ002', businessName: 'National Park', address: 'Gazipur Sadar', phone: '01556-789012' },
        ],
      },
      {
        name: 'Narayanganj',
        entries: [
            { jobId: 'NJN001', businessName: 'Rupayan Town', address: 'Fatullah, Narayanganj', phone: '01367-890123' },
        ],
      }
    ],
  },
  {
    division: 'Chattogram Division',
    districts: [
      {
        name: 'Chattogram',
        entries: [
          { jobId: 'CTG001', businessName: 'Well Food', address: 'GEC Circle, Chattogram', phone: '01778-901234' },
          { jobId: 'CTG002', businessName: 'Radisson Blu', address: 'Chattogram Bay View', phone: '01889-012345' },
        ],
      },
      {
        name: "Cox's Bazar",
        entries: [
          { jobId: 'CXB001', businessName: 'Mermaid Beach Resort', address: 'Kolatoli, Cox\'s Bazar', phone: '01990-123456' },
          { jobId: 'CXB002', businessName: 'Sea Gull Hotel', address: 'Hotel Motel Zone, Cox\'s Bazar', phone: '01501-234567' },
          { jobId: 'CXB003', businessName: 'Poushee Restaurant', address: 'Main Road, Cox\'s Bazar', phone: '01612-345678' },
        ],
      },
       {
        name: 'Comilla',
        entries: [
          { jobId: 'COM001', businessName: 'Matri Bhandar', address: 'Manoharpur, Comilla', phone: '01723-456789' },
        ],
      },
    ],
  },
  {
    division: 'Sylhet Division',
    districts: [
        {
            name: 'Sylhet',
            entries: [
                { jobId: 'SYL001', businessName: 'Panshi Restaurant', address: 'Zindabazar, Sylhet', phone: '01734-567890' },
                { jobId: 'SYL002', businessName: 'Rose View Hotel', address: 'Shahjalal Uposhohor, Sylhet', phone: '01945-678901' },
            ],
        },
        {
            name: 'Habiganj',
            entries: [
                { jobId: 'HBG001', businessName: 'The Palace Luxury Resort', address: 'Bahubal, Habiganj', phone: '01856-789012' },
            ],
        },
    ]
  }
];

export default function AllDistrictsDataPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return districtsData;
    }

    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return districtsData.map(division => {
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

  }, [searchTerm]);


  return (
    <div className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
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
                  <TableHead className="pr-6">Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? filteredData.map((divisionData, divisionIndex) => {
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
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No results found for "{searchTerm}".
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
