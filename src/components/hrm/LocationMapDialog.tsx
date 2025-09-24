
"use client";

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import "leaflet-defaulticon-compatibility";

interface LocationInfo {
    lat: number;
    lng: number;
    employeeName: string;
    employeeAvatar?: string;
}

interface LocationMapDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  location: LocationInfo | null;
}

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

// A helper component that will update the map's view and size
function MapUpdater({ center, zoom }: { center: L.LatLngExpression; zoom: number; }) {
    const map = useMap();
    useEffect(() => {
        // Use a short timeout to ensure the dialog animation is complete
        // and the map container has its final size.
        setTimeout(() => {
            map.invalidateSize();
            map.setView(center, zoom);
        }, 100);
    }, [center, zoom, map]);

    return null;
}

export function LocationMapDialog({ isOpen, onOpenChange, location }: LocationMapDialogProps) {
  // If the dialog is not open, render nothing.
  // This ensures the map is completely unmounted when not in use.
  if (!isOpen || !location) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Attendance Location for {location.employeeName}</DialogTitle>
        </DialogHeader>
        {/*
          The key here is that MapContainer is rendered conditionally based on isOpen.
          When isOpen becomes true, the entire map structure is mounted fresh.
        */}
        <div style={{ height: '50vh', width: '100%' }}>
            <MapContainer
                center={[location.lat, location.lng]}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                className="rounded-b-lg"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.lat, location.lng]}>
                  <Popup>
                     <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={location.employeeAvatar} alt={location.employeeName} />
                            <AvatarFallback>{getInitials(location.employeeName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{location.employeeName}</span>
                     </div>
                  </Popup>
                </Marker>
                <MapUpdater center={[location.lat, location.lng]} zoom={15} />
            </MapContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LocationMapDialog;
