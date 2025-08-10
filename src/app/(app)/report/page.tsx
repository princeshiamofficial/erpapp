
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ReportPage() {
  return (
    <div className="space-y-6 p-1 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-description">
            View and generate reports for your business operations.
          </p>
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader>
          <CardTitle>Reporting Dashboard</CardTitle>
          <CardDescription>
            This section is under construction. More reporting features will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <BarChart3 className="h-24 w-24 text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">Coming Soon</h3>
            <p className="text-muted-foreground mt-2">
                Advanced reporting capabilities are being developed.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
