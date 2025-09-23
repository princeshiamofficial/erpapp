
"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';

// leaflet-defaulticon-compatibility is not strictly necessary if you handle icons manually
// but it's a quick fix for default icon issues in some bundlers.
// Let's try without it first to minimize dependencies, and add it if icons are broken.

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

// Fix for default icon issue in React-Leaflet with some bundlers
const createDefaultIcon = () => {
    if (typeof window !== 'undefined') {
        return new L.Icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });
    }
    // Return a placeholder or null for server-side rendering
    return null;
};

// If you have issues with the default icon path, you may need to use a library
// like leaflet-defaulticon-compatibility or configure your bundler (e.g., Webpack)
// to handle the icon assets correctly. For simplicity, this direct approach often works.
if (typeof window !== 'undefined') {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
}


const AttendanceMap: React.FC<AttendanceMapProps> = ({ locations, liveLatitude, liveLongitude }) => {
  const mapCenter: L.LatLngExpression = liveLatitude && liveLongitude 
    ? [liveLatitude, liveLongitude] 
    : (locations.length > 0 ? [locations[0].latitude, locations[0].longitude] : [23.8103, 90.4125]);
    
  const mapZoom = liveLatitude || locations.length > 0 ? 14 : 7;
  
  const defaultIcon = createDefaultIcon();
  
  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
      // When using a key, ensure it's stable if you don't want the map to re-initialize
      // A dynamic key can be used to force re-initialization, which can solve some state issues.
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {locations.map(loc => (
        <React.Fragment key={loc.id}>
          <Marker position={[loc.latitude, loc.longitude]} icon={defaultIcon || undefined}>
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
        <Marker position={[liveLatitude, liveLongitude]} icon={defaultIcon || undefined}>
          <Popup>Your Current Location</Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default AttendanceMap;
