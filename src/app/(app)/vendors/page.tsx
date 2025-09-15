

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Plus, ArrowUpDown, Eye, Pencil, Trash2, Loader2, MoreVertical, TrendingUp, Star, Calendar, Clock, BarChartHorizontal, UserRoundX, History, AlertTriangle, Store, PlusCircle, Package, Layers } from 'lucide-react';
import type { Employee, User, VendorProduct, VendorCategory } from '@/types';
import { getEmployees } from '@/lib/employee-service';
import { getUsers } from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, isAfter, getDaysInMonth, subMonths, isSameMonth, getDate, endOfMonth, startOfMonth, parse } from 'date-fns';
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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { getVendorCategories, deleteVendorCategory } from '@/lib/vendor-category-service';
import { getVendorProducts, deleteVendorProduct } from '@/lib/vendor-product-service'; // Import deleteVendorProduct
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AddUserDialog = dynamic(() => import('@/components/users/add-user-dialog').then(mod => mod.AddUserDialog));
const EditUserInfoDialog = dynamic(() => import('@/components/users/edit-user-info-dialog').then(mod => mod.EditUserInfoDialog));
const DeleteUserDialog = dynamic(() => import('@/components/users/delete-user-dialog').then(mod => mod.DeleteUserDialog));
const AddEditProductDialog = dynamic(() => import('@/components/vendors/AddEditProductDialog').then(mod => mod.AddEditProductDialog));
const AddEditCategoryDialog = dynamic(() => import('@/components/vendors/AddEditCategoryDialog').then(mod => mod.AddEditCategoryDialog));
const DeleteCategoryDialog = dynamic(() => import('@/components/vendors/DeleteCategoryDialog').then(mod => mod.DeleteCategoryDialog));
const DeleteProductDialog = dynamic(() => import('@/components/vendors/DeleteProductDialog').then(mod => mod.DeleteProductDialog));


const getInitials = (name: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
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
  
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddEditProductDialogOpen, setIsAddEditProductDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<any | null>(null); 
  const [productToDelete, setProductToDelete] = useState<VendorProduct | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);


  const [isAddEditCategoryDialogOpen, setIsAddEditCategoryDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<VendorCategory | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedCategories, fetchedProducts] = await Promise.all([
        getUsers(),
        getVendorCategories(),
        getVendorProducts(),
      ]);
      setAllUsers(fetchedUsers);
      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
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

  const handleUserSaved = () => {
    setUserToEdit(null);
    setIsAddUserDialogOpen(false);
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


  const vendorListContent = (
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
                ) : filteredVendors.length > 0 ? (
                filteredVendors.map(vendor => (
                    <TableRow key={vendor.id} className="hover:bg-muted/50">
                    <TableCell className="pl-6 font-medium">
                        <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                            <AvatarImage src={vendor.avatarUrl || undefined} alt={vendor.name}/>
                            <AvatarFallback>{getInitials(vendor.name)}</AvatarFallback>
                        </Avatar>
                        <span>{vendor.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>{vendor.companyName || 'N/A'}</TableCell>
                    <TableCell>{vendor.phone || 'N/A'}</TableCell>
                    <TableCell>{vendor.address || 'N/A'}</TableCell>
                    <TableCell>{vendor.category || 'N/A'}</TableCell>
                    <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setUserToEdit(vendor)} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />Edit Info</DropdownMenuItem>
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
    </Card>
  );

  const productsContent = (
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
                               <TableCell>{product.price}</TableCell>
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
  
  const categoriesContent = (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleOpenEditCategoryDialog(cat)} className="cursor-pointer">
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setCategoryToDelete(cat)} className="cursor-pointer text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

  const vendorBillsContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="text-xl font-bold text-gray-800">Vendor Bill's</CardTitle>
                <CardDescription>This is a placeholder for Vendor Bill's content.</CardDescription>
            </div>
            <Button className="h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New bill
            </Button>
        </CardHeader>
        <CardContent>
            <div className="text-center text-gray-500 py-16">
                Content for Vendor Bill's goes here.
            </div>
        </CardContent>
    </Card>
  );
  
  if (!currentUser || !['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role)) {
    return <div className="p-8 text-center">Access Denied.</div>;
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex h-10 items-center justify-center text-muted-foreground bg-white p-1 rounded-full shadow-sm border border-gray-200">
            <TabsTrigger value="vendor_list" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Vendor List</TabsTrigger>
            <TabsTrigger value="products" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Products</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Categories</TabsTrigger>
            <TabsTrigger value="vendor_bills" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Vendor Bill's</TabsTrigger>
          </TabsList>
            <div className="mt-6">
                <TabsContent value="vendor_list">{vendorListContent}</TabsContent>
                <TabsContent value="products">{productsContent}</TabsContent>
                <TabsContent value="categories">{categoriesContent}</TabsContent>
                <TabsContent value="vendor_bills">{vendorBillsContent}</TabsContent>
            </div>
        </Tabs>
      </div>

      <AddUserDialog 
        onUserAdded={handleUserSaved}
        currentUser={currentUser}
        isOpen={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        defaultRole="VENDOR"
      />

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


      {currentUser && (
        <AddEditProductDialog
          isOpen={isAddEditProductDialogOpen}
          onOpenChange={setIsAddEditProductDialogOpen}
          onProductSaved={handleProductSaved}
          product={productToEdit}
          currentUser={currentUser}
          categories={categories}
        />
      )}
      
      <AddEditCategoryDialog
        isOpen={isAddEditCategoryDialogOpen}
        onOpenChange={setIsAddEditCategoryDialogOpen}
        onCategorySaved={handleCategorySaved}
        category={categoryToEdit}
      />
    </>
  );
}
