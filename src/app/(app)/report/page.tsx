"use client";

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD', // Using USD as a placeholder
    }).format(value);
};

const productSalesData = [
  { product: "Premium Matte", sales: 12500, percentage: 45 },
  { product: "Standard Gloss", sales: 8200, percentage: 29 },
  { product: "Luxury Silk", sales: 4500, percentage: 16 },
  { product: "Eco-Friendly Recycled", sales: 2700, percentage: 10 },
];

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

      <Card>
        <CardHeader>
          <CardTitle>Product Sales Performance</CardTitle>
          <CardDescription>
            An overview of sales distribution across different products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Sales Amount</TableHead>
                <TableHead className="text-center">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productSalesData.map((item) => (
                <TableRow key={item.product}>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.sales)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-4">
                        <Progress value={item.percentage} className="w-2/3 h-2.5" indicatorClassName="bg-primary" />
                        <Badge variant="outline" className="w-16 justify-center">{item.percentage}%</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
