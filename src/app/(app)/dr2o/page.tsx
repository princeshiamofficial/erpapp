
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
  {
    date: "2024-07-23",
    newCustomers: ["Quantum Creations", "Stellar Solutions", "Vanguard Ind."],
    oldCustomers: ["Bluebird Co.", "Summit Group", "Evergreen LLC", "Crystal Clear"],
  },
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
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50 dark:bg-muted/30">
                <TableRow>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-muted/30 z-10">Date</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 dark:bg-green-900/20">New Customer 1</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 dark:bg-green-900/20">New Customer 2</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 dark:bg-green-900/20">New Customer 3</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Old Customer Follow-up 1</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Old Customer Follow-up 2</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Old Customer Follow-up 3</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Old Customer Follow-up 4</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200 dark:bg-card dark:divide-border/50">
                {mockData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-gray-100 dark:hover:bg-muted/50 transition-colors duration-150">
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200 sticky left-0 bg-white dark:bg-card z-10">{row.date}</TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.newCustomers[0] || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.newCustomers[1] || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.newCustomers[2] || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.oldCustomers[0] || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.oldCustomers[1] || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.oldCustomers[2] || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.oldCustomers[3] || 'N/A'}</TableCell>
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
