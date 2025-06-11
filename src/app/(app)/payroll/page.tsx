
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Construction } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PayrollPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="page-title">Payroll Management</h1>
            <p className="page-description">
              Manage employee salaries, deductions, and payments.
            </p>
          </div>
        </div>
         <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl">Payroll Dashboard</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Overview of payroll activities and upcoming payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
            <Construction className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Payroll Page - Under Construction</h3>
            <p className="text-sm max-w-md">
              This section is currently being developed. Features for managing payroll, generating payslips, and tracking payments will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
