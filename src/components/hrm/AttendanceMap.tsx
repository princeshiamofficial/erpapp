
"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
        // This check prevents errors during server-side rendering
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
    return null; // Return null on the server
};

if (typeof window !== 'undefined') {
    // This code ensures the default icon paths are correctly resolved on the client.
    // It's a common workaround for issues with bundlers like Webpack.
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
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {locations.map(loc => (
        <React.Fragment key={loc.id}>
          {defaultIcon && (
            <Marker position={[loc.latitude, loc.longitude]} icon={defaultIcon}>
              <Popup>{loc.name}</Popup>
            </Marker>
          )}
          <Circle
            center={[loc.latitude, loc.longitude]}
            radius={loc.radius}
            pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
          />
        </React.Fragment>
      ))}
      {liveLatitude && liveLongitude && defaultIcon && (
        <Marker position={[liveLatitude, liveLongitude]} icon={defaultIcon}>
          <Popup>Your Current Location</Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default AttendanceMap;
