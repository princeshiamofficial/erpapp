
"use client";

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import "leaflet-defaulticon-compatibility";

interface LocationMapDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  location: { lat: number, lng: number } | null;
}

// This child component gets access to the map instance and updates it programmatically.
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export function LocationMapDialog({ isOpen, onOpenChange, location }: LocationMapDialogProps) {
    if (!isOpen || !location) {
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
                      The MapContainer is rendered with a default static center to initialize it only once.
                      The MapUpdater component will then move the view to the correct location.
                    */}
                    <MapContainer 
                      center={[23.8103, 90.4125]} // Default center, will be updated by MapUpdater
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
                        <MapUpdater center={[location.lat, location.lng]} />
                    </MapContainer>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default LocationMapDialog;
