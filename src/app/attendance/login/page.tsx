
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, Eye, EyeOff, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { PinInput } from '@/components/ui/pin-input';

export default function AttendanceLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  // 2FA state
  const [show2FAScreen, setShow2FAScreen] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);
  const { login, complete2FALogin, currentUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && currentUser && !currentUser.isBanned) {
      router.replace('/attendance');
    }
  }, [currentUser, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Login Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    const res = await login(email, password, '/attendance');
    if (res.require2FA && res.pendingUser) {
      setPendingUser(res.pendingUser);
      setShow2FAScreen(true);
      setIsSubmitting(false);
      return;
    }
    if (!res.success) {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = async (code: string) => {
    if (!pendingUser || !code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const success = await complete2FALogin(pendingUser, code.trim(), '/attendance');
    if (!success) {
      setIsSubmitting(false);
      setTwoFactorCode('');
    }
  };

  const handle2FASubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingUser || !twoFactorCode.trim() || isSubmitting) return;
    handleAutoSubmit(twoFactorCode);
  };
  
  if (isAuthLoading || (currentUser && !currentUser.isBanned)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border/0.1)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/0.1)_1px,transparent_1px)] bg-[size:30px_30px] opacity-50 dark:opacity-20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,theme(colors.background)_90%)]"></div>
      </div>
      
      <div className="text-center mb-8">
        <Clock className="h-24 w-24 text-primary mx-auto opacity-80" data-ai-hint="giant clock person adjusting" />
        <p className="text-muted-foreground mt-2">Time tracking, simplified.</p>
      </div>

      {show2FAScreen && pendingUser ? (
        <Card className="w-full max-w-[360px] bg-card/95 backdrop-blur-md border-border/30 dark:border-border/50 rounded-xl">
          <CardHeader className="text-center pt-5 pb-1 px-6">
            <div className="flex items-center justify-center gap-2 mb-0.5">
              <Image
                src="/gp.webp"
                alt="Authenticator"
                width={26}
                height={26}
                priority
                className="object-contain drop-shadow-sm"
              />
              <CardTitle className="text-lg font-medium text-foreground">Authenticator</CardTitle>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground">
              {isUsingBackupCode
                ? "Enter one of your 8-character backup codes."
                : "Enter 6-digit code from your Authenticator app."}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2.5 px-6">
            <form onSubmit={handle2FASubmit} className="space-y-3">
              <div className="space-y-1.5 text-center">
                {isUsingBackupCode ? (
                  <Input
                    type="text"
                    placeholder="e.g. 3F65-1BDE"
                    value={twoFactorCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setTwoFactorCode(val);
                      if (val.replace(/[^A-Z0-9]/g, '').length === 8) {
                        handleAutoSubmit(val);
                      }
                    }}
                    autoFocus
                    disabled={isSubmitting}
                    className="h-10 text-center text-base font-mono font-bold tracking-widest uppercase bg-background/80 border-border/50 rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="flex justify-center">
                    <PinInput
                      value={twoFactorCode}
                      onChange={(val) => {
                        setTwoFactorCode(val);
                        if (val.length === 6) {
                          handleAutoSubmit(val);
                        }
                      }}
                      length={6}
                      mask={false}
                      size="sm"
                      disabled={isSubmitting}
                      autoFocus
                      className="py-0.5"
                    />
                  </div>
                )}

                {isSubmitting && (
                  <div className="flex items-center justify-center py-1 text-muted-foreground gap-1.5 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Verifying...</span>
                  </div>
                )}
                
                <div className="pt-0.5">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={isSubmitting}
                    className="text-[11px] text-primary hover:underline h-auto p-0"
                    onClick={() => {
                      setIsUsingBackupCode(!isUsingBackupCode);
                      setTwoFactorCode('');
                    }}
                  >
                    {isUsingBackupCode
                      ? "Switch to 6-digit Authenticator code"
                      : "Use a backup recovery code instead"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center py-2 px-6 bg-secondary/50 rounded-b-xl border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShow2FAScreen(false);
                setPendingUser(null);
                setTwoFactorCode('');
                setIsUsingBackupCode(false);
              }}
            >
              <ArrowLeft className="mr-1 h-3 w-3" /> Back to Login
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="w-full max-w-sm bg-card/95 backdrop-blur-md border-border/30 dark:border-border/50 rounded-xl">
          <CardHeader className="text-center pt-8 pb-4">
            <CardTitle className="text-2xl">Login</CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg" 
                  disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
