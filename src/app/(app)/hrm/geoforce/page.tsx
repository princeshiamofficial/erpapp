
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Building, PlusCircle, LocateFixed, GlobeLock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';

// === DYNAMIC IMPORTS (TOP LEVEL) ===
// These components will be loaded only on the client-side.
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });


// Define the type for company locations.
interface CompanyLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
}

// === MEMOIZED MAP COMPONENT ===
// This prevents the map from re-rendering when the parent component's state changes.
const GeofenceMap = React.memo(function GeofenceMap({
  locations,
  liveLatitude,
  liveLongitude,
}: {
  locations: CompanyLocation[];
  liveLatitude?: number;
  liveLongitude?: number;
}) {
  return (
    <MapContainer
      center={[23.8103, 90.4125]} // Initial center for Dhaka
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {liveLatitude && liveLongitude && (
        <Marker position={[liveLatitude, liveLongitude]}>
          <Popup>Your current location</Popup>
        </Marker>
      )}
      {locations.map(loc => (
        <React.Fragment key={loc.id}>
          <Marker position={[loc.latitude, loc.longitude]}>
            <Popup>{loc.name}</Popup>
          </Marker>
          <Circle
            center={[loc.latitude, loc.longitude]}
            radius={loc.radius}
            pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
          />
        </React.Fragment>
      ))}
    </MapContainer>
  );
});

GeofenceMap.displayName = 'GeofenceMap';

// Main Page Component
export default function GeoforcePage() {
    const [companies, setCompanies] = useState<CompanyLocation[]>([]);
    const [companyName, setCompanyName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radius, setRadius] = useState('500');
    const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
        // Import the compatibility package on the client side
        import('leaflet-defaulticon-compatibility');
    }, []);

    const handleGetLiveLocation = () => {
        setIsLoadingLocation(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLiveLocation({ lat: latitude, lng: longitude });
                    setLatitude(latitude.toString());
                    setLongitude(longitude.toString());
                    toast({ title: "Location Found", description: "Your current location has been set." });
                    setIsLoadingLocation(false);
                },
                (error) => {
                    toast({ title: "Location Error", description: error.message, variant: "destructive" });
                    setIsLoadingLocation(false);
                },
                { enableHighAccuracy: true }
            );
        } else {
            toast({ title: "Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
            setIsLoadingLocation(false);
        }
    };

    const handleAddCompany = (e: React.FormEvent) => {
        e.preventDefault();
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = parseInt(radius, 10);

        if (!companyName || isNaN(lat) || isNaN(lng) || isNaN(rad)) {
            toast({ title: "Invalid Input", description: "Please fill all fields with valid numbers.", variant: "destructive" });
            return;
        }

        const newCompany: CompanyLocation = {
            id: `comp-${Date.now()}`,
            name: companyName,
            latitude: lat,
            longitude: lng,
            radius: rad,
        };

        setCompanies(prev => [...prev, newCompany]);
        toast({ title: "Company Added", description: `${companyName} has been added to the map.` });

        // Clear form
        setCompanyName('');
        setLatitude('');
        setLongitude('');
        setRadius('500');
        setLiveLocation(null);
    };

    if (!isClient) {
        return (
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <GlobeLock className="h-8 w-8 text-primary"/>
                            Geoforce Management
                        </h1>
                        <p className="text-base text-muted-foreground mt-1">
                            Define and manage geofence locations for attendance tracking.
                        </p>
                    </div>
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1"><Card><CardHeader><CardTitle>Loading Form...</CardTitle></CardHeader><CardContent><div className="space-y-4"><Skeleton className="h-10 w-full rounded-md" /><Skeleton className="h-10 w-full rounded-md" /></div></CardContent></Card></div>
                    <div className="lg:col-span-2"><Card className="h-full min-h-[500px]"><CardHeader><CardTitle>Loading Map...</CardTitle></CardHeader><CardContent className="h-full w-full p-0 bg-muted animate-pulse"></CardContent></Card></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <GlobeLock className="h-8 w-8 text-primary"/>
                        Geoforce Management
                    </h1>
                    <p className="text-base text-muted-foreground mt-1">
                        Define and manage geofence locations for attendance tracking.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Geofence Location</CardTitle>
                            <CardDescription>Define a new company location and its radius.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleAddCompany}>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="companyName">Company Name</Label>
                                    <Input id="companyName" placeholder="e.g., Head Office" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                                </div>
                                <Button type="button" variant="outline" className="w-full" onClick={handleGetLiveLocation} disabled={isLoadingLocation}>
                                    {isLoadingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LocateFixed className="mr-2 h-4 w-4" />}
                                    Get Live Location
                                </Button>
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
                                    <Label htmlFor="radius">Radius (meters)</Label>
                                    <Input id="radius" type="number" placeholder="e.g., 500" value={radius} onChange={e => setRadius(e.target.value)} />
                                </div>
                                <Button type="submit" className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Location
                                </Button>
                            </CardContent>
                        </form>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full min-h-[500px] flex flex-col">
                        <CardHeader><CardTitle>Geofence Map</CardTitle></CardHeader>
                        <CardContent className="h-full w-full p-0">
                            {isClient && (
                                <GeofenceMap
                                    locations={companies} 
                                    liveLatitude={liveLocation?.lat} 
                                    liveLongitude={liveLocation?.lng} 
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
