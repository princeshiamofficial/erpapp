
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';

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
            This page is under construction. Data for all districts will be displayed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
          <Map className="h-24 w-24 mb-4 text-primary/30" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">This section is currently under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
