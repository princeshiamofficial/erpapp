
"use client";

import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import "leaflet-defaulticon-compatibility";

interface LocationMapDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  location: { lat: number, lng: number } | null;
}

export function LocationMapDialog({ isOpen, onOpenChange, location }: LocationMapDialogProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        // Only run this effect when the dialog is open and we have a location and a ref to the container div
        if (isOpen && location && mapContainerRef.current) {
            // Check if the map is NOT already initialized in this specific container
            if (!mapInstanceRef.current) {
                // Initialize the map
                const map = L.map(mapContainerRef.current).setView([location.lat, location.lng], 15);
                mapInstanceRef.current = map;

                // Add the tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                // Add a marker
                L.marker([location.lat, location.lng]).addTo(map)
                    .bindPopup('Attendance marked from this location.')
                    .openPopup();
            } else {
                // If map instance already exists, just update its view
                mapInstanceRef.current.setView([location.lat, location.lng], 15);
            }
        }

        // Cleanup function: This is the crucial part.
        // It runs when the component unmounts or BEFORE the effect runs again.
        // When the dialog closes (isOpen becomes false), this cleanup will destroy the map.
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, location]); // Effect dependencies

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Attendance Location</DialogTitle>
                </DialogHeader>
                {/* 
                  The map container div. 
                  Leaflet will attach the map here.
                  It is important that this div is always present in the DOM when the dialog is open.
                */}
                <div 
                    ref={mapContainerRef} 
                    style={{ height: '50vh', width: '100%' }}
                />
            </DialogContent>
        </Dialog>
    );
}

export default LocationMapDialog;
