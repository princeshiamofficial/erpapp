
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, LogOut, Shield, LifeBuoy, Bell, Settings, User as UserIcon, Palette, CalendarPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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


export default function ProfilePage() {
  const { currentUser, logout, isLoading } = useAuth();
  const router = useRouter();

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

        {/* Account Section */}
        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <ProfileLink href="#" icon={UserIcon} label="Edit Profile Information" />
            <ProfileLink href="#" icon={Bell} label="Notifications" />
            <ProfileLink href="#" icon={CalendarPlus} label="Leave Request" />
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <ProfileLink href="https://colorhutbd.xyz" icon={LifeBuoy} label="Help & Support Center" isExternal />
          </CardContent>
        </Card>
        
        {/* Logout Button */}
        <div className="pt-4">
            <Button variant="destructive" className="w-full h-12 text-md" onClick={logout}>
                <LogOut className="mr-2 h-5 w-5" />
                Logout
            </Button>
        </div>

      </div>
    </div>
  );
}
