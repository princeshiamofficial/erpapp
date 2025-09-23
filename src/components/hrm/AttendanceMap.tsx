
"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import "leaflet-defaulticon-compatibility";

interface AttendanceMapProps {
  locations: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  }[];
  liveLatitude?: number;
  liveLongitude?: number;
}

const AttendanceMap: React.FC<AttendanceMapProps> = ({ locations, liveLatitude, liveLongitude }) => {
  const mapCenter: L.LatLngExpression = liveLatitude && liveLongitude 
    ? [liveLatitude, liveLongitude] 
    : (locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [23.8103, 90.4125]);
    
  const mapZoom = liveLatitude || locations.length > 0 ? 14 : 7;
  
  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {locations.map(loc => (
        <React.Fragment key={loc.id}>
            <Marker position={[loc.latitude, loc.longitude]}>
              <Popup>{loc.name}</Popup>
            </Marker>
          <Circle
            center={[loc.latitude, loc.longitude]}
            radius={loc.radius}
            pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
          />
        </React.Fragment>
      ))}
      {liveLatitude && liveLongitude && (
        <Marker position={[liveLatitude, liveLongitude]}>
          <Popup>Your Current Location</Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default AttendanceMap;
