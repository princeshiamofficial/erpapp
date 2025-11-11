
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu } from '@/components/ui/sidebar';
import { SidebarNavigation } from '@/components/layout/SidebarNavigation';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AppProviders } from './AppProviders';
import { GlobalSettings, User } from '@/types';
import { SidebarTrigger } from '@/components/ui/sidebar';


interface ClientLayoutProps {
    children: React.ReactNode;
    initialUser: User | null;
    initialGlobalSettings: GlobalSettings;
    showBottomNav: boolean;
}

export function ClientLayout({ children, initialUser, initialGlobalSettings, showBottomNav }: ClientLayoutProps) {
    return (
        <AppProviders initialUser={initialUser} initialGlobalSettings={initialGlobalSettings}>
            <div className="flex min-h-svh w-full">
                <Sidebar
                collapsible="icon"
                className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl print:hidden"
                >
                <SidebarHeader className="p-4 flex items-center justify-between h-20 border-b border-sidebar-border/70 bg-black text-white">
                    <Link href="/dashboard" className="flex items-center group-data-[collapsible=icon]:hidden">
                    <Image
                        src="https://i.ibb.co/FFQMvkz/logo-02-01.jpg"
                        alt="Color Hut Logo"
                        width={160}
                        height={40}
                        priority
                        className="object-contain"
                    />
                    </Link>
                    <div className="group-data-[collapsible=icon]:mx-auto">
                    <SidebarTrigger className="hidden md:flex text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md p-1.5" />
                    </div>
                </SidebarHeader>
                <SidebarContent className="flex-1 pt-3">
                    <SidebarMenu className="p-2.5 space-y-1.5">
                    <SidebarNavigation />
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter className="p-3.5 border-t border-sidebar-border/70">
                    <Button
                    variant="ghost"
                    className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 rounded-md text-sm py-2.5 px-3"
                    data-logout-button
                    >
                    <LogOut className="mr-3 h-5 w-5 shrink-0 group-data-[collapsible=icon]:mr-0" />
                    <span className="truncate group-data-[collapsible=icon]:hidden font-medium">Logout</span>
                    </Button>
                </SidebarFooter>
                </Sidebar>
                <div className="flex-1 flex flex-col">
                <AppHeader />
                    <main
                    className={cn(
                        "flex-1 p-4 sm:p-6 lg:p-8 bg-background selection:bg-primary/20 selection:text-primary",
                        showBottomNav && "pb-24" // Add more padding to avoid overlap
                    )}
                    >
                    {children}
                    </main>
                {showBottomNav && <BottomNavigation />}
                </div>
            </div>
        </AppProviders>
    );
}
