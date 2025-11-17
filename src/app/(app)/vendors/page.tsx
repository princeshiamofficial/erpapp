
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Plus, ArrowUpDown, Eye, Pencil, Trash2, Loader2, MoreVertical, TrendingUp, Star, Calendar, Clock, BarChartHorizontal, UserRoundX, History, AlertTriangle, Store, PlusCircle, Package, Layers, Edit, Receipt } from 'lucide-react';
import type { Employee, User, VendorProduct, VendorCategory, VendorBill, VendorBillStatus, ServicePaymentMethodItem, BillReport } from '@/types';
import { getEmployees } from '@/lib/employee-service';
import { getUsers } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, isAfter, getDaysInMonth, subMonths, isSameMonth, getDate, endOfMonth, startOfMonth, parse, parseISO, getDay } from 'date-fns';
import { deleteUserAction } from '@/app/(app)/users/actions';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getVendorCategories, deleteVendorCategory } from '@/lib/vendor-category-service';
import { getVendorProducts, deleteVendorProduct } from '@/lib/vendor-product-service';
import { getVendorBills, deleteVendorBill } from '@/lib/vendor-bill-service';
import { getBillReports, deleteBillReport } from '@/lib/bill-report-service';
import { getPaymentMethods } from '@/lib/service-options-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const EditUserInfoDialog = dynamic(() => import('@/components/users/edit-user-info-dialog').then(mod => mod.EditUserInfoDialog));
const DeleteUserDialog = dynamic(() => import('@/components/users/delete-user-dialog').then(mod => mod.DeleteUserDialog));
const AddEditProductDialog = dynamic(() => import('@/components/vendors/AddEditProductDialog').then(mod => mod.AddEditProductDialog));
const AddEditCategoryDialog = dynamic(() => import('@/components/vendors/AddEditCategoryDialog').then(mod => mod.AddEditCategoryDialog));
const DeleteCategoryDialog = dynamic(() => import('@/components/vendors/DeleteCategoryDialog').then(mod => mod.DeleteCategoryDialog));
const DeleteProductDialog = dynamic(() => import('@/components/vendors/DeleteProductDialog').then(mod => mod.DeleteProductDialog));
const AddEditBillDialog = dynamic(() => import('@/components/vendors/AddEditBillDialog').then(mod => mod.AddEditBillDialog));
const AddEditBillPaymentDialog = dynamic(() => import('@/components/vendors/AddEditBillPaymentDialog').then(mod => mod.AddEditBillPaymentDialog));
const DeleteBillReportDialog = dynamic(() => import('@/components/vendors/DeleteBillReportDialog').then(mod => mod.DeleteBillReportDialog));
const AddEditBillReportDialog = dynamic(() => import('@/components/vendors/AddEditBillReportDialog').then(mod => mod.AddEditBillReportDialog));


const getInitials = (name: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const ITEMS_PER_PAGE = 25;

const formatCurrency = (value?: number | null): string => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        const date = parseISO(dateString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }
        return format(date, 'd MMM, yyyy');
    } catch (e) {
        console.error("Invalid date string for formatting:", dateString, e);
        return "Invalid Date";
    }
};


export default function VendorsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("vendor_list");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isAddEditProductDialogOpen, setIsAddEditProductDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any | null>(null); 
  const [productToDelete, setProductToDelete] = useState<VendorProduct | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const [isAddEditBillDialogOpen, setIsAddEditBillDialogOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<VendorBill | null>(null);
  const [billToDelete, setBillToDelete] = useState<VendorBill | null>(null);
  const [isDeletingBill, setIsDeletingBill] = useState(false);


  const [isAddEditCategoryDialogOpen, setIsAddEditCategoryDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<VendorCategory | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [billReports, setBillReports] = useState<BillReport[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<ServicePaymentMethodItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddEditBillReportDialogOpen, setIsAddEditBillReportDialogOpen] = useState(false);
  const [isAddEditBillPaymentDialogOpen, setIsAddEditBillPaymentDialogOpen] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<BillReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<BillReport | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState(false);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedCategories, fetchedProducts, fetchedBills, fetchedPaymentMethods, fetchedBillReports] = await Promise.all([
        getUsers(),
        getVendorCategories(),
        getVendorProducts(),
        getVendorBills(),
        getPaymentMethods(),
        getBillReports(), 
      ]);
      setAllUsers(fetchedUsers);
      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
      setBills(fetchedBills);
      setPaymentMethods(fetchedPaymentMethods);
      setBillReports(fetchedBillReports); 
    } catch (error) {
      console.error("Failed to fetch vendor page data:", error);
      toast({ title: "Error", description: "Could not load required data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN')) {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, fetchData, router]);

  const filteredVendors = useMemo(() => {
    const vendors = allUsers.filter(u => u.role === 'VENDOR');
    if (!searchTerm) return vendors;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(lowerSearchTerm) ||
      (vendor.email && vendor.email.toLowerCase().includes(lowerSearchTerm)) ||
      (vendor.companyName && vendor.companyName.toLowerCase().includes(lowerSearchTerm))
    );
  }, [allUsers, searchTerm]);
  
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    const lowerSearchTerm = productSearchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowerSearchTerm) ||
      product.category.toLowerCase().includes(lowerSearchTerm)
    );
  }, [products, productSearchTerm]);

  const filteredBills = useMemo(() => {
    if (!searchTerm) return bills;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return bills.filter(bill =>
        bill.vendorName.toLowerCase().includes(lowerSearchTerm) ||
        (bill.billId && bill.billId.toLowerCase().includes(lowerSearchTerm))
    );
  }, [bills, searchTerm]);
  
  const billReportsByVendor = useMemo(() => {
    let reportsToFilter = billReports;
    if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        reportsToFilter = billReports.filter(report =>
            report.vendorName.toLowerCase().includes(lowerSearchTerm) ||
            report.invoiceId.toLowerCase().includes(lowerSearchTerm)
        );
    }
  
    const grouped = reportsToFilter.reduce((acc, report) => {
        const vendorId = report.vendorId;
        if (!acc[vendorId]) {
            acc[vendorId] = [];
        }
        acc[vendorId].push(report);
        return acc;
    }, {} as Record<string, BillReport[]>);
  
    return Object.entries(grouped)
        .sort(([vendorIdA], [vendorIdB]) => {
            const vendorA = allUsers.find(u => u.id === vendorIdA);
            const vendorB = allUsers.find(u => u.id === vendorIdB);
            return (vendorA?.name || '').localeCompare(vendorB?.name || '');
        });
  }, [billReports, searchTerm, allUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handleUserSaved = () => {
    setUserToEdit(null);
    fetchData();
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const result = await deleteUserAction(userToDelete.id);
    setIsDeleting(false);
    setUserToDelete(null);

    if (result.success) {
      toast({ title: "Vendor Deleted", description: "The vendor user account has been successfully deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete the vendor.", variant: "destructive" });
    }
  };
  
  const handleProductSaved = () => {
    toast({ title: "Success", description: "Product has been saved."});
    setIsAddEditProductDialogOpen(false);
    setProductToEdit(null);
    fetchData();
  };

  const handleOpenAddProductDialog = () => {
    setProductToEdit(null);
    setIsAddEditProductDialogOpen(true);
  };
  
  const handleOpenEditProductDialog = (product: any) => {
    setProductToEdit(product);
    setIsAddEditProductDialogOpen(true);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    const result = await deleteVendorProduct(productToDelete.id);
    setIsDeletingProduct(false);
    setProductToDelete(null);

    if (result) {
      toast({ title: "Product Deleted" });
      fetchData();
    } else {
      toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
    }
  };

  const handleBillSaved = () => {
    setIsAddEditBillDialogOpen(false);
    setBillToEdit(null);
    fetchData();
  };
  
  const handleBillPaymentSaved = () => {
    setIsAddEditBillPaymentDialogOpen(false);
    setReportToEdit(null);
    fetchData();
  };

  const handleOpenAddBillDialog = () => {
    setReportToEdit(null);
    setIsAddEditBillReportDialogOpen(true);
  };
  
  const handleOpenAddPaymentDialog = () => {
    setReportToEdit(null);
    setIsAddEditBillPaymentDialogOpen(true);
  };


  const handleOpenEditBillDialog = (bill: VendorBill) => {
    setBillToEdit(bill);
    setIsAddEditBillDialogOpen(true);
  };
  
  const handleConfirmDeleteBill = async () => {
      if (!billToDelete) return;
      setIsDeletingBill(true);
      const result = await deleteVendorBill(billToDelete.id);
      setIsDeletingBill(false);
      setBillToDelete(null);
      if (result) {
        toast({ title: "Bill Deleted" });
        fetchData();
      } else {
        toast({ title: "Error", description: "Failed to delete bill.", variant: "destructive" });
      }
  };

  const handleOpenEditReportDialog = (report: BillReport) => {
    setReportToEdit(report);
    setIsAddEditBillPaymentDialogOpen(true); // Re-using payment dialog for editing
  };

  const handleConfirmDeleteReport = async () => {
    if (!reportToDelete) return;
    setIsDeletingReport(true);
    const result = await deleteBillReport(reportToDelete.id);
    setIsDeletingReport(false);
    setReportToDelete(null);

    if (result.success) {
      toast({ title: "Report Deleted", description: "The bill report has been deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };


  const handleCategorySaved = () => {
    toast({ title: "Success", description: "Category has been saved." });
    setIsAddEditCategoryDialogOpen(false);
    setCategoryToEdit(null);
    fetchData();
  };

  const handleOpenAddCategoryDialog = () => {
    setCategoryToEdit(null);
    setIsAddEditCategoryDialogOpen(true);
  };

  const handleOpenEditCategoryDialog = (category: any) => {
    setCategoryToEdit(category);
    setIsAddEditCategoryDialogOpen(true);
  };
  
  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    const result = await deleteVendorCategory(categoryToDelete.id);
    setIsDeletingCategory(false);
    setCategoryToDelete(null);
    if (result) {
      toast({ title: "Category Deleted" });
      fetchData();
    } else {
      toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" });
    }
  };
  
  const getStatusBadgeClass = (status: VendorBillStatus) => {
    switch (status) {
        case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
        case 'Unpaid': return 'bg-red-100 text-red-800 border-red-200';
        case 'Partially Paid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const totalPages = useMemo(() => {
    if (activeTab === 'vendor_list') return Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
    if (activeTab === 'products') return Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    if (activeTab === 'vendor_bills') return Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
    if (activeTab === 'bill_reports') return Math.ceil(billReportsByVendor.length / ITEMS_PER_PAGE);
    return 1;
  }, [activeTab, filteredVendors, filteredProducts, filteredBills, billReportsByVendor]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    if (activeTab === 'vendor_list') return filteredVendors.slice(startIndex, endIndex);
    if (activeTab === 'products') return filteredProducts.slice(startIndex, endIndex);
    if (activeTab === 'vendor_bills') return filteredBills.slice(startIndex, endIndex);
    if (activeTab === 'bill_reports') return billReportsByVendor;
    return [];
  }, [activeTab, currentPage, filteredVendors, filteredProducts, filteredBills, billReportsByVendor]);

  const renderPagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; 
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (currentPage < 3) endPage = maxPagesToShow;
      else if (currentPage > totalPages - 2) startPage = totalPages - maxPagesToShow + 1;
      
      if (startPage > 1) {
        pageNumbers.push(1);
        if (startPage > 2) pageNumbers.push('...');
      }
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers.map((page, index) => (
        <PaginationItem key={index}>
        {page === '...' ? <PaginationEllipsis />
        : <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number);}} className={cn(currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
            {page}
          </PaginationLink>
        }
        </PaginationItem>
    ));
  };
  
  if (!currentUser || !['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role)) {
    return <div className="p-8 text-center">Access Denied.</div>
  }

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'vendor_list':
        return (
          <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl font-bold text-gray-800">Vendors List</CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
                    </div>
                </div>
            </div>
            </CardHeader>
            <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Vendor Name</TableHead>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={`skel-vendor-${i}`}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    ))
                    ) : paginatedData.length > 0 ? (
                    (paginatedData as User[]).map(vendor => (
                        <TableRow key={vendor.id} className="hover:bg-muted/50">
                        <TableCell className="pl-6 font-medium">
                            <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border"><AvatarImage src={vendor.avatarUrl || undefined} alt={vendor.name}/><AvatarFallback>{getInitials(vendor.name)}</AvatarFallback></Avatar>
                            <span>{vendor.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>{vendor.companyName || 'N/A'}</TableCell>
                        <TableCell>{vendor.phone || 'N/A'}</TableCell>
                        <TableCell>{vendor.address || 'N/A'}</TableCell>
                        <TableCell>
                          {vendor.category ? <Badge variant="secondary">{vendor.category}</Badge> : 'N/A'}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setUserToEdit(vendor)} className="cursor-pointer"><Edit className="mr-2 h-4 w-4" />Edit Info</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setUserToDelete(vendor)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Vendor</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow><TableCell colSpan={6} className="h-48 text-center"><Store className="mx-auto h-12 w-12 opacity-30 mb-3" />No vendors found.</TableCell></TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
            </CardContent>
             {totalPages > 1 && (
                <CardFooter className="py-4 border-t">
                    <Pagination><PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                        {renderPagination()}
                        <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                    </PaginationContent></Pagination>
                </CardFooter>
            )}
          </Card>
        );
      case 'products':
        return (
          <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle className="text-xl font-bold text-gray-800">Products</CardTitle>
                    <CardDescription>Manage vendor products here.</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Search products..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
                    </div>
                    <Button 
                        className="h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={handleOpenAddProductDialog}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : 
              filteredProducts.length > 0 ? (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Product Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredProducts.map(product => (
                              <TableRow key={product.id}>
                                  <TableCell className="font-medium">{product.name}</TableCell>
                                  <TableCell>{product.category}</TableCell>
                                  <TableCell>{formatCurrency(product.price)}</TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem onSelect={() => handleOpenEditProductDialog(product)} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => setProductToDelete(product)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed rounded-lg">
                    <Package className="h-10 w-10 mb-2" />
                    <p className="font-semibold">No Products Yet</p>
                    <p className="text-sm">Click "Add New Product" to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      case 'categories':
        return (
          <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">Categories</CardTitle>
                <CardDescription>Manage vendor product categories here.</CardDescription>
              </div>
              <Button className="h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleOpenAddCategoryDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : categories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map(cat => (
                    <Card key={cat.id} className="group relative">
                      <CardContent className="p-4 flex items-center justify-center">
                        <span className="font-semibold text-center">{cat.name}</span>
                      </CardContent>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleOpenEditCategoryDialog(cat)} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setCategoryToDelete(cat)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed rounded-lg">
                  <Layers className="h-10 w-10 mb-2" />
                  <p className="font-semibold">No Categories Yet</p>
                  <p className="text-sm">Click "Add New Category" to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
        case 'vendor_bills':
          return (
            <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
                <CardHeader className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-800">Vendor Bills</CardTitle>
                        <CardDescription>Manage bills and payments for vendors.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-grow sm:flex-grow-0">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input placeholder="Search bills..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
                      </div>
                      <Button 
                        className="h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => setIsAddEditBillDialogOpen(true)}
                      >
                          <PlusCircle className="mr-2 h-4 w-4" /> Create New bill
                      </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-64 w-full" /> : paginatedData.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bill ID</TableHead>
                                    <TableHead>Bill Date</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Due</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(paginatedData as VendorBill[]).map(bill => {
                                   const vendor = allUsers.find(u => u.id === bill.vendorId);
                                   return (
                                    <TableRow key={bill.id}>
                                        <TableCell className="font-mono">{bill.billId}</TableCell>
                                        <TableCell>{formatDate(bill.billDate)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-9 w-9 border"><AvatarImage src={vendor?.avatarUrl || undefined} alt={bill.vendorName}/><AvatarFallback>{getInitials(bill.vendorName)}</AvatarFallback></Avatar>
                                                <div>
                                                    <div className="font-medium">{vendor?.companyName}</div>
                                                    <div className="text-xs text-muted-foreground">{vendor?.name}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatCurrency(bill.total)}</TableCell>
                                        <TableCell className="text-destructive font-medium">{formatCurrency(bill.dueAmount)}</TableCell>
                                        <TableCell><Badge className={getStatusBadgeClass(bill.status)}>{bill.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => handleOpenEditBillDialog(bill)} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                    <DropdownMenuItem asChild><Link href={`/bill/${bill.id}`} target="_blank"><Eye className="mr-2 h-4 w-4" />View Bill</Link></DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => setBillToDelete(bill)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-gray-500 py-16">
                          <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                          <p className="font-semibold">No Bills Found</p>
                          <p className="text-sm">Create a new bill to see it here.</p>
                        </div>
                    )}
                </CardContent>
                {totalPages > 1 && (
                    <CardFooter className="py-4 border-t">
                        <Pagination><PaginationContent>
                            <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                            {renderPagination()}
                            <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                        </PaginationContent></Pagination>
                    </CardFooter>
                )}
              </Card>
        );
        case 'bill_reports':
            const reportsByVendor = paginatedData as [string, BillReport[]][];
            return (
              <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
                  <CardHeader className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div>
                          <CardTitle className="text-xl font-bold text-gray-800">Bill Reports</CardTitle>
                          <CardDescription>View and analyze billing reports.</CardDescription>
                      </div>
                       <div className="flex items-center gap-2">
                            <Button className="h-10 rounded-full" onClick={handleOpenAddBillDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
                            </Button>
                            <Button className="h-10 rounded-full" onClick={handleOpenAddPaymentDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Payment
                            </Button>
                       </div>
                  </CardHeader>
                  <CardContent>
                      {isLoading ? <Skeleton className="h-64 w-full" /> : reportsByVendor.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full space-y-3">
                          {reportsByVendor.map(([vendorId, reports], index) => {
                            const vendor = allUsers.find(u => u.id === vendorId);
                            const totalAmount = reports.reduce((sum, r) => sum + r.amount, 0);
                            const totalPayment = reports.reduce((sum, r) => sum + r.payment, 0);
                            const totalDue = totalAmount - totalPayment;

                            return (
                              <div key={vendorId} className="group relative bg-muted/30 rounded-lg shadow-sm border">
                              <AccordionItem value={`vendor-${index}`} className="border-b-0">
                                  <AccordionTrigger className="px-4 py-3 text-left font-semibold text-foreground hover:no-underline">
                                  <div className="flex items-center gap-4 flex-1">
                                      {vendor && (
                                        <Avatar className="h-9 w-9 border"><AvatarImage src={vendor.avatarUrl || undefined} /><AvatarFallback>{getInitials(vendor.name)}</AvatarFallback></Avatar>
                                      )}
                                      <div className="flex-1">
                                          <p className="text-sm font-medium">{vendor?.name || 'Unknown Vendor'}</p>
                                          <p className="text-xs text-muted-foreground">{reports.length} transaction(s)</p>
                                      </div>
                                  </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-2 sm:px-4 pt-0 pb-4">
                                      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                                          <div>
                                              <p className="text-xs text-muted-foreground">Total Billed</p>
                                              <p className="font-semibold">{formatCurrency(totalAmount)}</p>
                                          </div>
                                           <div>
                                              <p className="text-xs text-muted-foreground">Total Paid</p>
                                              <p className="font-semibold text-green-600">{formatCurrency(totalPayment)}</p>
                                          </div>
                                           <div>
                                              <p className="text-xs text-muted-foreground">Status</p>
                                              <p className="font-semibold">
                                                  {totalDue <= 0 ? 
                                                      <Badge variant="outline" className="text-green-600 border-green-600">Paid</Badge> : 
                                                      <Badge variant="destructive">Due</Badge>
                                                  }
                                              </p>
                                          </div>
                                          <div>
                                              {totalDue > 0 ? (
                                                  <>
                                                      <p className="text-xs text-muted-foreground">Balance Due</p>
                                                      <p className="font-semibold text-destructive">{formatCurrency(totalDue)}</p>
                                                  </>
                                              ) : (
                                                  <>
                                                      <p className="text-xs text-muted-foreground">Advanced</p>
                                                      <p className="font-semibold text-blue-600">{formatCurrency(Math.abs(totalDue))}</p>
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 mt-4">
                                        <div className="space-y-2">
                                          <h4 className="font-semibold text-sm border-b pb-1">Billing</h4>
                                          <Table>
                                              <TableHeader>
                                                  <TableRow>
                                                      <TableHead>Date</TableHead>
                                                      <TableHead>Invoice ID</TableHead>
                                                      <TableHead className="text-right">Amount</TableHead>
                                                      <TableHead className="text-right">Action</TableHead>
                                                  </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                  {reports.filter(r => r.amount > 0).map(report => (
                                                      <TableRow key={`${report.id}-billing`}>
                                                          <TableCell>{formatDate(report.date)}</TableCell>
                                                          <TableCell>{report.invoiceId}</TableCell>
                                                          <TableCell className="text-right">{formatCurrency(report.amount)}</TableCell>
                                                           <TableCell className="text-right">
                                                            <DropdownMenu>
                                                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onSelect={() => handleOpenEditReportDialog(report)} className="cursor-pointer"><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => setReportToDelete(report)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                            </DropdownMenu>
                                                          </TableCell>
                                                      </TableRow>
                                                  ))}
                                              </TableBody>
                                          </Table>
                                        </div>

                                        <div className="space-y-2">
                                           <h4 className="font-semibold text-sm border-b pb-1">Payment</h4>
                                           <Table>
                                              <TableHeader>
                                                  <TableRow>
                                                      <TableHead>Date</TableHead>
                                                      <TableHead>Method</TableHead>
                                                      <TableHead className="text-right">Payment</TableHead>
                                                      <TableHead className="text-right">Action</TableHead>
                                                  </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                 {reports.filter(r => r.payment > 0).map(report => (
                                                      <TableRow key={`${report.id}-payment`}>
                                                          <TableCell>{formatDate(report.date)}</TableCell>
                                                          <TableCell>{report.method}</TableCell>
                                                          <TableCell className="text-right">{formatCurrency(report.payment)}</TableCell>
                                                          <TableCell className="text-right">
                                                            <DropdownMenu>
                                                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onSelect={() => handleOpenEditReportDialog(report)} className="cursor-pointer"><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => setReportToDelete(report)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                              </DropdownMenuContent>
                                                            </DropdownMenu>
                                                          </TableCell>
                                                      </TableRow>
                                                  ))}
                                              </TableBody>
                                           </Table>
                                        </div>
                                      </div>
                                  </AccordionContent>
                              </AccordionItem>
                              </div>
                            )
                          })}
                        </Accordion>
                      ) : (
                        <div className="text-center text-gray-500 py-16">
                            <BarChartHorizontal className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <p className="font-semibold">No Bill Reports Found</p>
                            <p className="text-sm">Create a new bill report to see it here.</p>
                        </div>
                      )}
                  </CardContent>
              </Card>
            );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-6">
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex h-10 items-center justify-center text-muted-foreground bg-white p-1 rounded-full shadow-sm border border-gray-200">
            <TabsTrigger value="vendor_list" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Vendor List</TabsTrigger>
            <TabsTrigger value="products" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Products</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Categories</TabsTrigger>
            <TabsTrigger value="vendor_bills" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Vendor Bills</TabsTrigger>
            <TabsTrigger value="bill_reports" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Bill Reports</TabsTrigger>
          </TabsList>
            <div className="mt-6">
                {renderActiveTabContent()}
            </div>
        </Tabs>
      </div>

      {userToEdit && (
        <EditUserInfoDialog
            user={userToEdit}
            onUserInfoUpdated={handleUserSaved}
            isOpen={!!userToEdit}
            onOpenChange={() => setUserToEdit(null)}
            availableCategories={categories}
        />
      )}

      {userToDelete && (
        <DeleteUserDialog
          isOpen={!!userToDelete}
          onOpenChange={() => setUserToDelete(null)}
          onConfirmDelete={handleConfirmDelete}
          user={userToDelete}
          isDeleting={isDeleting}
        />
      )}
      
      {categoryToDelete && (
        <DeleteCategoryDialog
          isOpen={!!categoryToDelete}
          onOpenChange={() => setCategoryToDelete(null)}
          onConfirmDelete={handleConfirmDeleteCategory}
          category={categoryToDelete}
          isDeleting={isDeletingCategory}
        />
      )}

      {productToDelete && (
        <DeleteProductDialog
          isOpen={!!productToDelete}
          onOpenChange={() => setProductToDelete(null)}
          onConfirmDelete={handleConfirmDeleteProduct}
          product={productToDelete}
          isDeleting={isDeletingProduct}
        />
      )}

      <AddEditProductDialog
        isOpen={isAddEditProductDialogOpen}
        onOpenChange={setIsAddEditProductDialogOpen}
        onProductSaved={handleProductSaved}
        product={productToEdit}
        currentUser={currentUser}
        categories={categories}
      />
      
      <AddEditCategoryDialog
        isOpen={isAddEditCategoryDialogOpen}
        onOpenChange={setIsAddEditCategoryDialogOpen}
        onCategorySaved={handleCategorySaved}
        category={categoryToEdit}
      />
      
      <AddEditBillDialog
          isOpen={isAddEditBillDialogOpen}
          onOpenChange={(open) => {
              setIsAddEditBillDialogOpen(open);
              if (!open) setBillToEdit(null);
          }}
          onBillSaved={handleBillSaved}
          bill={billToEdit}
          currentUser={currentUser}
          vendors={filteredVendors}
          products={products}
      />

      <AddEditBillPaymentDialog
          isOpen={isAddEditBillPaymentDialogOpen}
          onOpenChange={setIsAddEditBillPaymentDialogOpen}
          onSave={handleBillPaymentSaved}
          vendors={filteredVendors}
          paymentMethods={paymentMethods}
          reportToEdit={reportToEdit}
      />

       <AddEditBillReportDialog
          isOpen={isAddEditBillReportDialogOpen}
          onOpenChange={setIsAddEditBillReportDialogOpen}
          onSave={handleBillPaymentSaved}
          vendors={filteredVendors}
          reportToEdit={reportToEdit}
      />
      
       {billToDelete && (
        <AlertDialog open={!!billToDelete} onOpenChange={() => setBillToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the bill record. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBillToDelete(null)} disabled={isDeletingBill}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteBill} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingBill}>
                {isDeletingBill ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Deleting...</> : "Delete Bill"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {reportToDelete && (
          <DeleteBillReportDialog
              isOpen={!!reportToDelete}
              onOpenChange={() => setReportToDelete(null)}
              onConfirmDelete={handleConfirmDeleteReport}
              report={reportToDelete}
              isDeleting={isDeletingReport}
          />
      )}
    </>
  );
}

    