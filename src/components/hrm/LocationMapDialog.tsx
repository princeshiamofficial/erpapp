
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

interface LocationMapDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  location: { lat: number, lng: number } | null;
}

export function LocationMapDialog({ isOpen, onOpenChange, location }: LocationMapDialogProps) {
    const [mapKey, setMapKey] = useState(Date.now());

    useEffect(() => {
        // When the dialog is opened, generate a new key.
        // This forces React to unmount the old MapContainer and mount a new one,
        // preventing the "Map container is already initialized" error.
        if (isOpen) {
            setMapKey(Date.now());
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Attendance Location</DialogTitle>
                </DialogHeader>
                <div className="h-[50vh] w-full">
                    {/* Key change: Using a dynamic key ensures the component is fully remounted */}
                    {isOpen && location && (
                        <MapContainer
                          key={mapKey}
                          center={[location.lat, location.lng]} 
                          zoom={15} 
                          scrollWheelZoom={false} 
                          style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
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
