
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Building, PlusCircle, LocateFixed, GlobeLock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { Slider } from '@/components/ui/slider'; // Import the Slider component

// Define the type for company locations.
interface CompanyLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
}

// === MAIN PAGE COMPONENT ===
export default function GeoforcePage() {
    const [companies, setCompanies] = useState<CompanyLocation[]>([]);
    const [companyName, setCompanyName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radius, setRadius] = useState(500); // Changed to number
    const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; accuracy: number; } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();

    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<any>(null); // To hold the map instance
    const liveLocationMarker = useRef<any>(null); // To hold the live marker instance
    const liveLocationCircle = useRef<any>(null); // To hold the live circle instance
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        setIsClient(true);
        // Cleanup function to stop watching position when component unmounts
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isClient && mapRef.current && !leafletMap.current) {
            import('leaflet').then(L => {
                import('leaflet-defaulticon-compatibility').then(() => {
                    const map = L.map(mapRef.current!, { attributionControl: false }).setView([23.8103, 90.4125], 13);
                    leafletMap.current = map;

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map);
                });
            });
        }
    }, [isClient]);

    // Effect to update map when locations change, without re-initializing
    useEffect(() => {
        if (leafletMap.current && isClient) {
             import('leaflet').then((L) => {
                // Clear existing company layers
                leafletMap.current.eachLayer((layer: any) => {
                    if (layer.options && layer.options.pane === 'markerPane' && layer !== liveLocationMarker.current) {
                        leafletMap.current.removeLayer(layer);
                    }
                    if (layer.options && layer.options.pane === 'overlayPane' && layer !== liveLocationCircle.current && !layer.getAttribution) {
                         leafletMap.current.removeLayer(layer);
                    }
                });

                // Add new company locations with their radius circle
                companies.forEach(loc => {
                    L.marker([loc.latitude, loc.longitude]).addTo(leafletMap.current).bindPopup(loc.name);
                    L.circle([loc.latitude, loc.longitude], { radius: loc.radius, color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }).addTo(leafletMap.current);
                });

                // Update or create live location marker and circle
                if (liveLocation) {
                    if (!liveLocationMarker.current) {
                        liveLocationMarker.current = L.marker([liveLocation.lat, liveLocation.lng]).addTo(leafletMap.current).bindPopup("Your current location");
                    } else {
                        liveLocationMarker.current.setLatLng([liveLocation.lat, liveLocation.lng]);
                    }
                    if (!liveLocationCircle.current) {
                        liveLocationCircle.current = L.circle([liveLocation.lat, liveLocation.lng], { radius: liveLocation.accuracy, color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.15 }).addTo(leafletMap.current);
                    } else {
                        liveLocationCircle.current.setLatLng([liveLocation.lat, liveLocation.lng]).setRadius(liveLocation.accuracy);
                    }
                }
             });
        }
    }, [companies, liveLocation, isClient]);


    const handleGetLiveLocation = () => {
        if ("geolocation" in navigator && navigator.geolocation.watchPosition) {
            // If already watching, clear it first.
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
                setIsLoadingLocation(false);
                toast({ title: "Live Tracking Stopped", description: "Stopped watching your location." });
                return;
            }
            
            setIsLoadingLocation(true);
            toast({ title: "Starting Live Tracking...", description: "Your location will be updated automatically." });

            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude: lat, longitude: lng, accuracy } = position.coords;
                    
                    // Only update state if the location has changed significantly to avoid excessive re-renders
                    if (liveLocation?.lat !== lat || liveLocation?.lng !== lng) {
                        setLiveLocation({ lat, lng, accuracy });
                        setLatitude(lat.toString());
                        setLongitude(lng.toString());
                    }

                    // Pan the map to the new location only the first time
                    if (leafletMap.current && isLoadingLocation) { // Changed to check isLoadingLocation
                        leafletMap.current.setView([lat, lng], 17); // Zoom in closer
                    }
                    setIsLoadingLocation(false); // Stop showing loading state after first fix
                },
                (error) => {
                    toast({ title: "Location Error", description: error.message, variant: "destructive" });
                    setIsLoadingLocation(false);
                    if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            toast({ title: "Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive" });
        }
    };

    const handleAddCompany = (e: React.FormEvent) => {
        e.preventDefault();
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = radius; // Already a number

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
        setRadius(500);
    };
    
    const isWatchingLocation = watchIdRef.current !== null;


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
                                <Button
                                    type="button"
                                    variant={isWatchingLocation ? 'destructive' : 'outline'}
                                    className="w-full"
                                    onClick={handleGetLiveLocation}
                                    disabled={isLoadingLocation}
                                >
                                    {isLoadingLocation ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                    ) : (
                                        <LocateFixed className="mr-2 h-4 w-4" />
                                    )}
                                    {isLoadingLocation ? 'Starting...' : (isWatchingLocation ? 'Stop Live Tracking' : 'Get Live Location')}
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
                            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

