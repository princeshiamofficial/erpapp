
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function AttendanceLoginPage() {
  const [employeeId, setEmployeeId] = useState('EMP-001');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const router = useRouter();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !password) {
      toast({
        title: "Login Error",
        description: "Please enter both Employee ID and password.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    // Here you would typically have a different login function for attendance
    // For now, we can simulate a login or use the existing one if applicable.
    // This is a placeholder for actual attendance login logic.
    setTimeout(() => {
        toast({
            title: "Attendance Logged",
            description: `Attendance for Employee ID ${employeeId} has been logged.`,
        });
        setIsLoading(false);
        router.push('/attendance/home'); // Or wherever you want to redirect after
    }, 1500);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-500/10 via-green-500/5 to-background p-4">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border/0.1)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/0.1)_1px,transparent_1px)] bg-[size:30px_30px] opacity-50 dark:opacity-20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,theme(colors.background)_90%)]"></div>
      </div>
      <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-md border-border/30 dark:border-border/50 rounded-xl">
        <CardHeader className="text-center pt-10 pb-6">
            <div className="mx-auto mb-6">
              <Image 
                src="https://i.ibb.co/FFQMvkz/logo-02-01.jpg" 
                alt="Color Hut Logo" 
                width={253} 
                height={64} 
                priority 
                className="object-contain"
              />
            </div>
          <CardTitle className="text-2xl">Attendance Login</CardTitle>
          <CardDescription>Log your attendance with your Employee ID.</CardDescription>
        </CardHeader>
        <CardContent className="py-6 px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                type="text"
                placeholder="e.g., EMP-001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              Log Attendance
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
