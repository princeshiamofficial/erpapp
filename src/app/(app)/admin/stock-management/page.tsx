
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Archive, RefreshCw, PackageCheck, PackageX } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getModels } from '@/lib/service-options-service';
import type { ServiceModelItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';

export default function StockManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allModels, setAllModels] = useState<ServiceModelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const models = await getModels();
      setAllModels(models);
    } catch (error) {
      toast({ title: "Error", description: "Could not load model data for stock management.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') {
      fetchData();
    }
  }, [currentUser, fetchData]);


  const stockItems = useMemo(() => {
    let items = allModels.filter(model => model.isReadyMade);
    if (searchTerm) {
      items = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return items.sort((a,b) => (a.stockCount ?? 0) - (b.stockCount ?? 0)); // Sort by stock, lowest first
  }, [allModels, searchTerm]);


  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return <div className="p-8 text-center">Access Denied. You must be an Administrator to view this page.</div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title flex items-center gap-3"><Archive className="h-8 w-8" /> Stock Management</h1>
          <p className="page-description">Monitor and manage stock levels for ready-made products.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" />
            Adjust Stock
          </Button>
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-card-foreground text-xl">Product Stock Levels</CardTitle>
            <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
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
                  <TableHead className="pl-6 w-[80px]">Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skel-stock-${i}`}>
                      <TableCell className="pl-6"><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                      <TableCell className="pr-6 text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : stockItems.length > 0 ? (
                    stockItems.map(item => (
                       <TableRow key={item.id}>
                         <TableCell className="pl-6">
                           <NextImage 
                              src={item.imageUrl || `https://placehold.co/64x64.png`}
                              alt={item.name}
                              width={48}
                              height={48}
                              className="rounded-md object-cover bg-muted border"
                           />
                         </TableCell>
                         <TableCell className="font-medium">{item.name}</TableCell>
                         <TableCell className="text-center">
                            <span className={cn(
                                "font-bold text-lg",
                                (item.stockCount ?? 0) <= 0 ? "text-destructive" : ((item.stockCount ?? 0) <= 10 ? "text-yellow-600" : "text-green-600")
                            )}>
                                {item.stockCount ?? 0}
                            </span>
                         </TableCell>
                         <TableCell className="pr-6 text-right">
                           <Button variant="outline" size="sm" className="h-9">Adjust</Button>
                         </TableCell>
                       </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      {searchTerm ? (
                         <div className="flex flex-col items-center gap-3">
                            <PackageX className="h-12 w-12 opacity-50" />
                            <p className="font-semibold">No products found for "{searchTerm}"</p>
                            <p className="text-sm">Try a different search term.</p>
                         </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                            <Archive className="mx-auto h-12 w-12 opacity-50" />
                            <p className="font-semibold">No ready-made products found.</p>
                            <p className="text-sm">Go to Model Management to mark items as "ready-made" to track stock.</p>
                        </div>
                      )}
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
