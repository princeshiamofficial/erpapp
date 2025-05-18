
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image'; // Added import for Image
// import { Logo } from '@/components/layout/Logo'; // Logo SVG no longer used here

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
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
    const success = await login(email, password);
    if (!success) {
      // Toast is already handled by login function for specific errors (banned, invalid creds)
      // This is a fallback, or if login returns false without specific toast
      // Consider removing if login always toasts on failure.
    }
    // On success, AuthProvider handles redirect
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-md border-border/30 dark:border-border/50 rounded-xl transform hover:scale-[1.01] transition-transform duration-300">
      <CardHeader className="text-center pt-10 pb-6">
        <div className="mx-auto mb-6">
           <Image 
            src="/images/color-hut-logo.png" 
            alt="Color Hut Logo" 
            width={253} // Aspect ratio ~3.96 (1059/267), for height 64, width is ~253
            height={64} 
            priority 
            className="object-contain"
           />
        </div>
        {/* CardTitle and CardDescription can remain if the logo itself contains the "Color Hut" text and tagline */}
        {/* <CardTitle className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 dark:to-orange-300 pb-1">Color Hut</CardTitle> */}
        <CardDescription className="text-muted-foreground text-md pt-1">Sign in to your workspace.</CardDescription>
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
              className="h-12 text-base bg-background/80 focus:bg-background border-border/50 dark:border-border/70 focus:border-primary focus:ring-primary/50 rounded-lg shadow-sm"
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
                className="h-12 text-base bg-background/80 focus:bg-background border-border/50 dark:border-border/70 focus:border-primary focus:ring-primary/50 rounded-lg shadow-sm pr-10"
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
