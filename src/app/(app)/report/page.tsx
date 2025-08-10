
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { TrackingLink } from '@/types';
import { getOrders } from '@/lib/order-service';
import { useToast } from '@/hooks/use-toast';
import { Package } from 'lucide-react';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
    }).format(value);
};

interface ProductSalesData {
  product: string;
  sales: number;
  quantity: number;
  percentage: number;
}

export default function ReportPage() {
  const [orders, setOrders] = useState<TrackingLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrderData = async () => {
      setIsLoading(true);
      try {
        const fetchedOrders = await getOrders();
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Failed to fetch orders for report:", error);
        toast({
          title: "Error",
          description: "Could not load order data for the report.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrderData();
  }, [toast]);

  const productSalesData: ProductSalesData[] = useMemo(() => {
    if (orders.length === 0) {
      return [];
    }

    const salesMap: Map<string, { sales: number; quantity: number }> = new Map();

    orders.forEach(order => {
      if (order.orderItems && Array.isArray(order.orderItems)) {
        
        const hasDesignCharge = order.orderItems.some(item =>
          item.model.toLowerCase().includes('design charge')
        );
        
        const hasMenuBook = order.orderItems.some(item =>
          item.model.toLowerCase().includes('menu book')
        );

        const hasMenuCard = order.orderItems.some(item =>
            item.model.toLowerCase().includes('menu card')
        );

        const hasPizzaBox = order.orderItems.some(item =>
            item.model.toLowerCase().includes('pizza box')
        );

        if (hasDesignCharge) {
          const orderTotal = order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
          const existingDesignCharge = salesMap.get('Design Charge') || { sales: 0, quantity: 0 };
          salesMap.set('Design Charge', {
            sales: existingDesignCharge.sales + orderTotal,
            quantity: existingDesignCharge.quantity + 1,
          });
        } else if (hasMenuBook) {
          const orderTotal = order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
          const existingMenuBook = salesMap.get('Menu Book') || { sales: 0, quantity: 0 };
          salesMap.set('Menu Book', {
            sales: existingMenuBook.sales + orderTotal,
            quantity: existingMenuBook.quantity + 1,
          });
        } else if (hasMenuCard) {
            const orderTotal = order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
            const existingMenuCard = salesMap.get('Menu Card') || { sales: 0, quantity: 0 };
            salesMap.set('Menu Card', {
                sales: existingMenuCard.sales + orderTotal,
                quantity: existingMenuCard.quantity + 1,
            });
        } else if (hasPizzaBox) {
            const orderTotal = order.orderItems.reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
            const existingPizzaBox = salesMap.get('Pizza Box') || { sales: 0, quantity: 0 };
            salesMap.set('Pizza Box', {
                sales: existingPizzaBox.sales + orderTotal,
                quantity: existingPizzaBox.quantity + 1,
            });
        } else {
          order.orderItems.forEach(item => {
            const existing = salesMap.get(item.model) || { sales: 0, quantity: 0 };
            salesMap.set(item.model, {
              sales: existing.sales + (item.lineItemTotalPrice || 0),
              quantity: existing.quantity + (item.quantity || 0),
            });
          });
        }
      }
    });

    const totalSales = Array.from(salesMap.values()).reduce((acc, { sales }) => acc + sales, 0);

    if (totalSales === 0) {
      return [];
    }

    return Array.from(salesMap.entries())
      .map(([product, data]) => ({
        product,
        sales: data.sales,
        quantity: data.quantity,
        percentage: (data.sales / totalSales) * 100,
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [orders]);


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
            An overview of sales distribution and quantity sold across all products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity Sold</TableHead>
                <TableHead className="text-right">Sales Amount</TableHead>
                <TableHead className="w-[30%] text-center">Sales Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-4">
                        <Skeleton className="h-2.5 w-2/3" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : productSalesData.length > 0 ? (
                productSalesData.map((item) => (
                  <TableRow key={item.product}>
                    <TableCell className="font-medium">{item.product}</TableCell>
                    <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.sales)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-4">
                          <Progress value={item.percentage} className="w-2/3 h-2.5" indicatorClassName="bg-primary" />
                          <Badge variant="outline" className="w-16 justify-center">{item.percentage.toFixed(1)}%</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Package className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                    No sales data available. Create some orders to see performance data here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
