
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Category = 'POP' | 'POG' | 'OC' | 'OD' | 'B2B';

// Mock data for the pipeline table with new categories
const mockPipelineData = [
  {
    id: 'pipe_1',
    businessName: 'Innovate Corp',
    phone: '01712345678',
    source: 'Referral',
    address: '123 Tech Street, Dhaka',
    category: 'POP' as Category,
    schedule: '2024-08-15',
    notes: 'Interested in enterprise package. Follow up next week.',
  },
  {
    id: 'pipe_2',
    businessName: 'Creative Minds',
    phone: '01987654321',
    source: 'Website',
    address: '456 Art Avenue, Chittagong',
    category: 'POG' as Category,
    schedule: '2024-08-18',
    notes: 'Needs a quote for 5000 units.',
  },
  {
    id: 'pipe_3',
    businessName: 'Global Exports',
    phone: '01611223344',
    source: 'Cold Call',
    address: '789 Trade Tower, Gulshan',
    category: 'B2B' as Category,
    schedule: '2024-09-01',
    notes: '',
  },
  {
    id: 'pipe_4',
    businessName: 'Digital Solutions',
    phone: '01555667788',
    source: 'Facebook',
    address: 'Suite 202, ABC Plaza, Banani',
    category: 'OC' as Category,
    schedule: '2024-08-22',
    notes: 'Scheduled a demo for next Tuesday.',
  },
  {
    id: 'pipe_5',
    businessName: 'Artisan Crafts',
    phone: '01333445566',
    source: 'Referral',
    address: 'Dhanmondi 27, Dhaka',
    category: 'OD' as Category,
    schedule: '2024-08-25',
    notes: 'Follow up on the sample design.',
  },
];

const categoryColors: Record<Category, string> = {
  POP: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700',
  POG: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700',
  OC: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-700',
  OD: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700',
  B2B: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700',
};

export default function PipeLinePage() {
  // In a real application, you would use useState and useEffect to fetch data.
  // For this example, we'll use the mock data directly.
  const pipelineData = mockPipelineData;

  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Sales Pipeline</h1>
          <p className="page-description">
            Track and manage potential sales leads and opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow font-semibold h-10"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Lead
          </Button>
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <CardTitle className="text-card-foreground text-xl">Pipeline Leads</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">
                All potential leads are listed here.
              </CardDescription>
            </div>
            <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pipeline..."
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
                  <TableHead className="pl-6">Business Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineData.length > 0 ? (
                  pipelineData.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="pl-6 font-medium text-foreground">{lead.businessName}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lead.source}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.address}</TableCell>
                      <TableCell>
                         <Badge className={cn(categoryColors[lead.category] || 'bg-gray-100 text-gray-800')}>
                          {lead.category}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.schedule}</TableCell>
                      <TableCell className="text-muted-foreground text-xs truncate max-w-xs" title={lead.notes}>
                        {lead.notes || 'N/A'}
                      </TableCell>
                      <TableCell className="pr-6 text-right space-x-2 whitespace-nowrap">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Edit Lead">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete Lead">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 h-[300px]">
                      <p className="text-lg text-muted-foreground font-medium">No leads in the pipeline.</p>
                      <p className="text-sm text-muted-foreground">Click "Add New Lead" to get started.</p>
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
