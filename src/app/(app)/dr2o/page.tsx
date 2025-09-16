// src/app/(app)/dr2o/page.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Mock data for demonstration purposes
const mockData = [
  {
    date: "2024-07-26",
    newCustomers: ["Acme Corp", "Innovate LLC", "Solutions Inc."],
    oldCustomers: ["Global Tech", "Pioneer Ltd.", "Sunrise Co.", "Quantum Group"],
  },
  {
    date: "2024-07-25",
    newCustomers: ["Nexus Systems", "Vertex Industries", "Apex Digital"],
    oldCustomers: ["Starlight Ent.", "Keystone LLC", "Momentum Inc.", "Zenith Corp"],
  },
  {
    date: "2024-07-24",
    newCustomers: ["Omega Solutions", "Hyperion Co.", "Nova Enterprises"],
    oldCustomers: ["Cascade LLC", "Fusion Works", "Silverstone", "Horizon Ltd."],
  },
  // Add more mock data rows as needed
];

export default function DR2OPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl">DR 2.O - Daily Reporting</CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">
                Daily follow-up report for new and old customers.
            </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>New Customer 1</TableHead>
                  <TableHead>New Customer 2</TableHead>
                  <TableHead>New Customer 3</TableHead>
                  <TableHead>Old Customer Follow-up 1</TableHead>
                  <TableHead>Old Customer Follow-up 2</TableHead>
                  <TableHead>Old Customer Follow-up 3</TableHead>
                  <TableHead>Old Customer Follow-up 4</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-muted-foreground">{row.date}</TableCell>
                    <TableCell>{row.newCustomers[0] || 'N/A'}</TableCell>
                    <TableCell>{row.newCustomers[1] || 'N/A'}</TableCell>
                    <TableCell>{row.newCustomers[2] || 'N/A'}</TableCell>
                    <TableCell>{row.oldCustomers[0] || 'N/A'}</TableCell>
                    <TableCell>{row.oldCustomers[1] || 'N/A'}</TableCell>
                    <TableCell>{row.oldCustomers[2] || 'N/A'}</TableCell>
                    <TableCell>{row.oldCustomers[3] || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
