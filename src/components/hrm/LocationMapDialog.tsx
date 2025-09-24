
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

interface LocationMapDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  location: { lat: number, lng: number } | null;
}

// This is the new child component that will handle map updates.
// It uses the useMap() hook to get a reference to the parent MapContainer instance.
function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            // This programmatically sets the view of the existing map
            // without trying to re-initialize it.
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null; // This component does not render anything itself.
}

export function LocationMapDialog({ isOpen, onOpenChange, location }: LocationMapDialogProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Attendance Location</DialogTitle>
                </DialogHeader>
                <div className="h-[50vh] w-full">
                    {/* 
                      The MapContainer is now rendered with a static, default center.
                      The MapUpdater component will then handle moving the map to the correct location.
                      This avoids re-initializing the map container on the same DOM element.
                    */}
                    {location && (
                        <MapContainer 
                          center={[location.lat, location.lng]} 
                          zoom={15} 
                          scrollWheelZoom={false} 
                          style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {/* This component will handle all subsequent updates to the map's center */}
                            <MapUpdater center={[location.lat, location.lng]} />
                            <Marker position={[location.lat, location.lng]}>
                                <Popup>
                                    Attendance marked from this location.
                                </Popup>
                            </Marker>
                        </MapContainer>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default LocationMapDialog;

