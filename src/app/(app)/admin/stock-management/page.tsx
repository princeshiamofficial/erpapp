
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { 
    Package, 
    TrendingUp, 
    Star, 
    Eye, 
    BarChart, 
    ChevronLeft, 
    ChevronRight, 
    MoreVertical, 
    Edit,
    Box,
    ShoppingCart,
    TrendingDown,
    ShieldCheck,
    Gauge,
    PlusCircle
} from "lucide-react";
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NextImage from 'next/image';
import { RadialChart } from '@/components/ui/radial-chart';
import { cn } from '@/lib/utils';

// Mock Data based on the image
const products = [
  { id: 1, name: '4 Tier Shelving', review: 4.5, performance: 'Excellent', views: 994, sales: 12400, stock: 92, price: 'Custom', visible: true, performanceValue: 95 },
  { id: 2, name: 'Insence Holder', review: 4.5, performance: 'Good', views: 123, sales: 12400, stock: 594, price: 66.00, visible: true, performanceValue: 65 },
  { id: 3, name: 'Ashtray', review: 4.5, performance: 'Good', views: 637, sales: 12400, stock: 362, price: 81.00, visible: false, performanceValue: 70 },
  { id: 4, name: 'Coffee Table', review: 4.5, performance: 'Excellent', views: 148, sales: 12400, stock: 746, price: 'Custom', visible: true, performanceValue: 90 },
  { id: 5, name: '3 Seater Sofa', review: 4.5, performance: 'Bad', views: 817, sales: 12400, stock: 909, price: 'Custom', visible: false, performanceValue: 25 },
  { id: 6, name: 'Candle Holder', review: 4.5, performance: 'Bad', views: 926, sales: 12400, stock: 333, price: 50.00, visible: true, performanceValue: 30 },
  { id: 7, name: 'Table Lamp', review: 4.5, performance: 'Good', views: 71, sales: 12400, stock: 530, price: 318.00, visible: true, performanceValue: 75 },
];

const formatNumber = (num: number) => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
};

const StatCard = ({ title, value, unit, icon: Icon, iconBg, children }: { title: string, value: string, unit: string, icon?: React.ElementType, iconBg?: string, children?: React.ReactNode }) => (
    <div className="flex-1 p-4">
        <p className="text-sm text-gray-500">{title}</p>
        <div className="flex items-center gap-2 mt-1">
            {Icon && <div className={`p-1.5 rounded-md ${iconBg}`}><Icon className="h-4 w-4 text-white"/></div>}
            <span className="text-xl font-bold text-gray-800">{value}</span>
            {children ? children : <span className="text-sm text-gray-500">{unit}</span>}
        </div>
    </div>
);


const PerformanceGauge = ({ value }: { value: number }) => {
    const data = [
        { name: 'performance', value: value, fill: 'hsl(var(--primary))' }
    ];
    return (
        <div className="w-20 h-10">
             <RadialChart
                data={data}
                startAngle={180}
                endAngle={0}
                innerRadius={30}
                outerRadius={40}
                cy="40px"
             />
        </div>
    )
}

export default function StockManagementPage() {
    const [visibility, setVisibility] = useState(products.reduce((acc, p) => ({ ...acc, [p.id]: p.visible }), {} as Record<number, boolean>));

    const handleVisibilityChange = (id: number, checked: boolean) => {
        setVisibility(prev => ({ ...prev, [id]: checked }));
    };
    
    const getPerformanceColor = (performance: string) => {
        switch (performance.toLowerCase()) {
            case 'excellent': return 'text-green-500';
            case 'good': return 'text-yellow-500';
            case 'bad': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="p-4 sm:p-6 min-h-full">
            <Card className="shadow-lg rounded-xl">
                <CardContent className="p-2">
                    <div className="flex flex-col md:flex-row md:items-center md:divide-x md:divide-gray-200">
                        <StatCard title="Active Product" value="352" unit="Product" />
                        <StatCard title="Winning Product" value="3 Seater ..." unit="" icon={Package} iconBg="bg-orange-400" />
                        <StatCard title="Average Performance" value="Good!" unit="" >
                            <Gauge className="h-8 w-8 text-green-500 ml-2" />
                        </StatCard>
                        <StatCard title="Product Sold" value="12,340" unit="Items" />
                        <div className="flex-1 p-4 flex items-center justify-center">
                            <Button className="w-full h-12">
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Add Products
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-6 bg-white rounded-xl shadow-lg">
                <div className="overflow-x-auto">
                    <div className="min-w-full">
                         {products.map((product, index) => (
                            <div key={product.id} className={`grid grid-cols-12 items-center gap-4 px-4 py-3 ${index < products.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                {/* Product Info */}
                                <div className="col-span-12 md:col-span-3 flex items-center gap-4">
                                    <NextImage src={`https://placehold.co/64x64/F2F2F2/333333?text=${product.name.charAt(0)}`} alt={product.name} width={48} height={48} className="rounded-lg bg-gray-100" />
                                    <div>
                                        <p className="font-semibold text-gray-800">{product.name}</p>
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <span>Review: {product.review}</span>
                                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Performance */}
                                <div className="col-span-6 md:col-span-2">
                                    <p className="text-xs text-gray-500 mb-1">Performance</p>
                                    <p className={`font-semibold ${getPerformanceColor(product.performance)}`}>{product.performance}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {product.views}</div>
                                        <div className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {formatNumber(product.sales)}</div>
                                    </div>
                                </div>

                                {/* Gauge */}
                                <div className="col-span-6 md:col-span-1 flex items-center justify-center">
                                    <PerformanceGauge value={product.performanceValue} />
                                </div>

                                {/* Stock */}
                                <div className="col-span-6 md:col-span-1">
                                    <p className="text-xs text-gray-500">Stock</p>
                                    <div className="flex items-center gap-1 font-semibold text-gray-800">
                                        <Box className="h-4 w-4 text-gray-400"/>
                                        {product.stock}
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="col-span-6 md:col-span-2">
                                    <p className="text-xs text-gray-500">Product Price</p>
                                    <p className="font-semibold text-gray-800">
                                        {product.price === 'Custom' ? '$ Custom' : `$ ${Number(product.price).toFixed(2)} USD`}
                                    </p>
                                </div>

                                {/* Visibility */}
                                <div className="col-span-6 md:col-span-1">
                                     <p className="text-xs text-gray-500 mb-1">Visibility</p>
                                    <Switch checked={visibility[product.id]} onCheckedChange={(checked) => handleVisibilityChange(product.id, checked)} />
                                </div>

                                {/* Actions */}
                                <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-2">
                                     <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-200">
                                        <Edit className="h-4 w-4"/>
                                     </Button>
                                      <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-200">
                                        <Eye className="h-4 w-4"/>
                                     </Button>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-200">
                                                <MoreVertical className="h-4 w-4"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                     </DropdownMenu>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
                 <div className="flex items-center justify-between p-4">
                    <Button variant="outline">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>
                    <span className="text-sm text-gray-500">Page 1 of 10</span>
                    <Button variant="outline">
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
