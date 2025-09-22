
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogIn, LogOut, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';

export default function CheckInOutPage() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'Checked In' | 'Checked Out'>('Checked Out');
  const [lastActionTime, setLastActionTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = () => {
    if (status === 'Checked In') {
        toast({ title: "Already Checked In", description: "You are already checked in for the day.", variant: "default" });
        return;
    }
    setStatus('Checked In');
    const now = new Date();
    setLastActionTime(now);
    toast({
      title: "Checked In Successfully",
      description: `You checked in at ${format(now, 'h:mm:ss a')}.`,
    });
  };

  const handleCheckOut = () => {
     if (status === 'Checked Out') {
        toast({ title: "Already Checked Out", description: "You have already checked out.", variant: "default" });
        return;
    }
    setStatus('Checked Out');
    const now = new Date();
    setLastActionTime(now);
    toast({
      title: "Checked Out Successfully",
      description: `You checked out at ${format(now, 'h:mm:ss a')}.`,
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-black p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-md border-border/30 dark:border-border/50 rounded-xl">
        <CardHeader className="text-center space-y-2 pt-8">
          <Clock className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold tracking-tight">Attendance</CardTitle>
          <CardDescription>
            {format(currentTime, "eeee, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 px-6 space-y-8">
            <div className="text-center bg-muted/50 dark:bg-muted/30 p-6 rounded-lg border border-dashed">
                <p className="text-5xl font-mono font-bold text-foreground">
                    {format(currentTime, 'h:mm:ss a')}
                </p>
            </div>
          
            <div className="text-center">
                 <p className="text-sm text-muted-foreground mb-1">Your current status:</p>
                 <p className={`text-lg font-semibold ${status === 'Checked In' ? 'text-green-600' : 'text-red-600'}`}>
                    {status}
                 </p>
                 {lastActionTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Last action at {format(lastActionTime, 'h:mm a')}
                    </p>
                 )}
            </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
                size="lg" 
                className="h-16 text-lg" 
                onClick={handleCheckIn} 
                disabled={status === 'Checked In'}
            >
              <LogIn className="mr-2 h-6 w-6" /> Check In
            </Button>
            <Button 
                size="lg" 
                variant="destructive" 
                className="h-16 text-lg bg-red-600 hover:bg-red-700" 
                onClick={handleCheckOut}
                disabled={status === 'Checked Out'}
            >
              <LogOut className="mr-2 h-6 w-6" /> Check Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
