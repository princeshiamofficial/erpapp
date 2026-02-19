
"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import "leaflet-defaulticon-compatibility";
import { Badge } from '@/components/ui/badge';

interface LiveMonitoringMapProps {
    liveLocations: Record<string, any>;
    center?: [number, number];
    zoom?: number;
}

const DEFAULT_MAP_CENTER: [number, number] = [23.8103, 90.4125]; // Dhaka
const DEFAULT_MAP_ZOOM = 12;

export default function LiveMonitoringMap({ liveLocations, center = DEFAULT_MAP_CENTER, zoom = DEFAULT_MAP_ZOOM }: LiveMonitoringMapProps) {
    return (
        <div className="h-full w-full">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={true}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {Object.values(liveLocations).map((loc: any) => (
                    <Marker key={loc.userId} position={[loc.location.lat, loc.location.lng]}>
                        <Tooltip permanent direction="top" offset={[0, -20]} className="rounded-lg shadow-lg border-none !p-0">
                            <div className="flex items-center gap-2 p-1.5 bg-background rounded-lg border shadow-sm">
                                <div className="flex flex-col">
                                    <span className="font-bold text-xs">{loc.userName}</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] text-muted-foreground">Accuracy: {(loc.accuracy || 0).toFixed(1)}m</span>
                                    </div>
                                </div>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
