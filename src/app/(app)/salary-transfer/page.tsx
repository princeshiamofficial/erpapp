
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function SalaryTransferPage() {
  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header hidden">
        <div>
          <h1 className="page-title">Salary Transfer</h1>
          <p className="page-description">
            Manage and process employee salary transfers.
          </p>
        </div>
      </div>
       <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
            <Construction className="h-16 w-16 text-primary mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Under Construction</h2>
            <p className="text-gray-500 mt-2">
                This feature is currently being developed and will be available soon.
            </p>
        </CardContent>
       </Card>
    </div>
  );
}
