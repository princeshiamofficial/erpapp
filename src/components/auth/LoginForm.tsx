
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, ShieldCheck, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { PinInput } from '@/components/ui/pin-input';
import type { User } from '@/types';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [show2FAScreen, setShow2FAScreen] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);

  const { login, complete2FALogin } = useAuth();
  const { toast } = useToast();

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
    setIsLoading(true);
    const res = await login(email, password);
    if (res.require2FA && res.pendingUser) {
      setPendingUser(res.pendingUser);
      setShow2FAScreen(true);
      setIsLoading(false);
      return;
    }
    if (!res.success) {
      setIsLoading(false);
    }
  };

  const handleAutoSubmit = async (code: string) => {
    if (!pendingUser || !code.trim() || isLoading) return;
    setIsLoading(true);
    const success = await complete2FALogin(pendingUser, code.trim());
    if (!success) {
      setIsLoading(false);
      setTwoFactorCode('');
    }
  };

  const handle2FASubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingUser || !twoFactorCode.trim() || isLoading) return;
    handleAutoSubmit(twoFactorCode);
  };

  if (show2FAScreen && pendingUser) {
    return (
      <Card className="w-full max-w-[380px] shadow-2xl bg-card/95 backdrop-blur-md border-border/30 dark:border-border/50 rounded-xl transform hover:scale-[1.01] transition-transform duration-300">
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
            <CardTitle className="text-lg font-medium tracking-tight text-foreground">
              Authenticator
            </CardTitle>
          </div>
          <CardDescription className="text-[11px] text-muted-foreground">
            {isUsingBackupCode
              ? "Enter one of your 8-character recovery backup codes."
              : "Enter the 6-digit verification code from your Authenticator app."}
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
                  disabled={isLoading}
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
                    disabled={isLoading}
                    autoFocus
                    className="py-0.5"
                  />
                </div>
              )}

              {isLoading && (
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
                  disabled={isLoading}
                  className="text-[11px] text-primary hover:underline h-auto p-0"
                  onClick={() => {
                    setIsUsingBackupCode(!isUsingBackupCode);
                    setTwoFactorCode('');
                  }}
                >
                  {isUsingBackupCode
                    ? "Switch to 6-digit Authenticator code"
                    : "Use a single-use backup recovery code instead"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center py-2 px-6 bg-secondary/50 dark:bg-card-foreground/5 rounded-b-xl border-t border-border/30">
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
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-md border-border/30 dark:border-border/50 rounded-xl transform hover:scale-[1.01] transition-transform duration-300">
      <CardHeader className="text-center pt-8 pb-4 bg-black rounded-t-xl">
        <div className="mx-auto mb-4">
          <Image
            src="/w-logo.png"
            alt="Color Hut Logo"
            width={253}
            height={64}
            priority
            className="object-contain"
          />
        </div>
        <CardDescription className="text-white text-md pt-1">Sign in to your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="py-6 px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-card-foreground/90">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-base bg-background/80 focus:bg-background border-border/50 dark:border-border/70 rounded-lg shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-card-foreground/90">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 text-base bg-background/80 focus:bg-background border-border/50 dark:border-border/70 rounded-lg shadow-sm pr-10"
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
          <Button type="submit" className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-primary/40 transition-all duration-300 ease-in-out bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transform hover:scale-[1.02]" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            Sign In
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center text-sm text-muted-foreground pt-6 pb-8 px-8 bg-secondary/50 dark:bg-card-foreground/5 rounded-b-xl border-t border-border/30 dark:border-border/50">
        <div className="text-xs flex items-center text-green-600 dark:text-green-500/90">
          <ShieldCheck className="h-4 w-4 mr-1.5" />
          <span>All connections are secure and encrypted.</span>
        </div>
      </CardFooter>
    </Card>
  );
}
