
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ChevronRight,
  LogOut,
  Bell,
  User as UserIcon,
  Loader2,
  MapPin,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUp,
  RefreshCw,
  CalendarPlus
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

interface ProfileLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isExternal?: boolean;
}

const ProfileLink: React.FC<ProfileLinkProps> = ({ href, icon: Icon, label, isExternal }) => (
  <Link href={href} target={isExternal ? '_blank' : '_self'} rel={isExternal ? 'noopener noreferrer' : ''}>
    <div className="flex items-center p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
      <Icon className="h-5 w-5 mr-4 text-muted-foreground" />
      <span className="flex-1 font-medium text-foreground">{label}</span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </div>
  </Link>
);

interface StatCardProps {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    value: string;
    isFaded?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, subtitle, value, isFaded }) => (
    <Card className={cn("bg-card shadow-sm transition-all", isFaded && "opacity-40")}>
        <CardContent className="p-4">
            <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", 
                    isFaded ? "bg-gray-200 dark:bg-gray-700" : "bg-green-100 dark:bg-green-900"
                )}>
                    <Icon className={cn("h-5 w-5", isFaded ? "text-gray-400 dark:text-gray-500" : "text-green-600 dark:text-green-300")} />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
            </div>
            <p className="text-3xl font-bold text-foreground mt-3">{value}</p>
        </CardContent>
    </Card>
);

export default function ProfilePage() {
  const { currentUser, logout, isLoading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState('');
  const [locationAddress, setLocationAddress] = useState('Loading location...');
  
  useEffect(() => {
    setCurrentDate(format(new Date(), "eeee, d MMMM yyyy"));
    
    // Fetch and display location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use OpenStreetMap's Nominatim for reverse geocoding
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!response.ok) {
            throw new Error('Failed to fetch address');
          }
          const data = await response.json();
          const address = data.display_name;
          setLocationAddress(address || `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          setLocationAddress("Could not determine address");
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        setLocationAddress("Location permission denied");
      });
    } else {
      setLocationAddress("Geolocation not supported");
    }

  }, []);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/attendance/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900">
        <style>{`
            body {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none;  /* Internet Explorer 10+ */
            }
            body::-webkit-scrollbar {
                display: none; /* Safari and Chrome */
            }
        `}</style>
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-28">
        
        {/* User Info Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                <AvatarImage src={currentUser?.avatarUrl || undefined} alt={currentUser?.name} />
                <AvatarFallback className="text-2xl bg-muted">{getInitials(currentUser?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{currentUser?.name}</h1>
                <p className="text-md text-muted-foreground">{currentUser?.email}</p>
              </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* New Attendance Summary Section */}
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <p className="text-sm text-muted-foreground">{currentDate}</p>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200/50 py-1.5 px-3 max-w-full">
                  <MapPin className="h-4 w-4 mr-2"/>
                  <span className="truncate">{locationAddress}</span>
                </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={ArrowDownLeft} title="Check In" subtitle="Early" value="07:58" />
                <StatCard icon={ArrowUpRight} title="Check Out" subtitle="Not Yet" value="17:00" isFaded />
                <StatCard icon={ArrowUp} title="Absence" subtitle="November" value="3 Day" />
                <StatCard icon={RefreshCw} title="Total Attended" subtitle="November" value="15 Day" />
            </div>
        </div>

        {/* Account Section */}
        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            
            <ProfileLink href="#" icon={Bell} label="Notifications" />
            <ProfileLink href="#" icon={CalendarPlus} label="Leave Request" />
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
