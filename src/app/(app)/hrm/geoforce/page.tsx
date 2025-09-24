
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Building, PlusCircle, GlobeLock, Trash2, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider'; 
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


interface CompanyLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
}

export default function GeoforcePage() {
    const [locations, setLocations] = useState<CompanyLocation[]>([]);
    const [companyName, setCompanyName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radius, setRadius] = useState(500); 
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();

    // Mock loading and initial data
    useEffect(() => {
        setTimeout(() => {
            setLocations([
                { id: '1', name: 'Color Hut', latitude: 23.7120822, longitude: 90.4526046, radius: 1 }
            ]);
            setIsLoading(false);
        }, 1000);
    }, []);

    const handleAddLocation = (e: React.FormEvent) => {
        e.preventDefault();
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = radius;

        if (!companyName || isNaN(lat) || isNaN(lng) || isNaN(rad)) {
            toast({ title: "Invalid Input", description: "Please fill all fields with valid data.", variant: "destructive" });
            return;
        }

        const newLocation: CompanyLocation = {
            id: `comp-${Date.now()}`, name: companyName, latitude: lat, longitude: lng, radius: rad,
        };

        setLocations(prev => [...prev, newLocation]);
        toast({ title: "Location Added", description: `${companyName} has been added.` });

        setCompanyName('');
        setLatitude('');
        setLongitude('');
        setRadius(500);
        setIsAddDialogOpen(false);
    };
    
    const handleDeleteLocation = (id: string) => {
        setLocations(prev => prev.filter(loc => loc.id !== id));
        toast({ title: "Location Removed", description: "The office location has been deleted." });
    };

    return (
        <>
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Office Location
                        </h1>
                        <p className="text-base text-muted-foreground mt-1">
                            Dashboard / Office Location
                        </p>
                    </div>
                     <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="w-full sm:w-auto h-11">
                                <PlusCircle className="mr-2 h-5 w-5" />
                                Add Office Location
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Add New Office Location</DialogTitle>
                                <DialogDescription>Define a new geofence for attendance tracking.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddLocation}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="companyName">Office Name</Label>
                                        <Input id="companyName" placeholder="e.g., Head Office" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="latitude">Latitude</Label>
                                            <Input id="latitude" placeholder="e.g., 23.8103" value={latitude} onChange={e => setLatitude(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="longitude">Longitude</Label>
                                            <Input id="longitude" placeholder="e.g., 90.4125" value={longitude} onChange={e => setLongitude(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="radius">Radius: {radius} meters</Label>
                                        <Slider
                                            id="radius"
                                            min={50}
                                            max={2000}
                                            step={50}
                                            value={[radius]}
                                            onValueChange={(value) => setRadius(value[0])}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Location
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Defined Locations</CardTitle>
                        <CardDescription>The list of all configured office geofence locations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Office Location</TableHead>
                                    <TableHead>Longitude</TableHead>
                                    <TableHead>Latitude</TableHead>
                                    <TableHead>Radius (m)</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full"/></TableCell>
                                        </TableRow>
                                    ))
                                ) : locations.length > 0 ? (
                                    locations.map((loc, index) => (
                                        <TableRow key={loc.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell className="font-medium">{loc.name}</TableCell>
                                            <TableCell>{loc.longitude}</TableCell>
                                            <TableCell>{loc.latitude}</TableCell>
                                            <TableCell>{loc.radius}</TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleDeleteLocation(loc.id)} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4"/>
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                 </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No office locations defined.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
