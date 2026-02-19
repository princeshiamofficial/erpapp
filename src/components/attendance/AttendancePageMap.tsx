
"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import "leaflet-defaulticon-compatibility";

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

interface AttendancePageMapProps {
    currentLocation: { lat: number; lng: number };
    officeLocations: any[];
    locationStatus: string;
}

export default function AttendancePageMap({ currentLocation, officeLocations, locationStatus }: AttendancePageMapProps) {
    return (
        <MapContainer
            center={[currentLocation.lat, currentLocation.lng]}
            zoom={16}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[currentLocation.lat, currentLocation.lng]} />
            {officeLocations.map((office: any) => (
                <Circle
                    key={office.id}
                    center={[office.latitude, office.longitude]}
                    radius={office.radius}
                    pathOptions={{
                        color: locationStatus === 'Inside Office Location' ? '#10b981' : '#ef4444',
                        fillColor: locationStatus === 'Inside Office Location' ? '#10b981' : '#ef4444',
                        fillOpacity: 0.2
                    }}
                />
            ))}
            <MapUpdater center={[currentLocation.lat, currentLocation.lng]} />
        </MapContainer>
    );
}
