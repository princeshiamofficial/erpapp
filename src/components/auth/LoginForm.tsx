
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MOCK_USERS } from '@/lib/auth-constants';
import { Loader2, LogIn, KeyRound, ShieldCheck, Briefcase } from 'lucide-react'; // Added Briefcase

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      toast({
        title: "Login Failed",
        description: "Invalid email, password, or user not found. Try one of the demo accounts with password 'password'.",
        variant: "destructive",
      });
    }
    // On success, AuthProvider handles redirect
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-md border-border/30 rounded-xl transform hover:scale-[1.01] transition-transform duration-300">
      <CardHeader className="text-center pt-10 pb-6">
        <div className="mx-auto mb-6 p-4 bg-primary/10 rounded-full inline-block shadow-lg border border-primary/20">
           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary drop-shadow-[0_2px_3px_hsl(var(--primary)/0.6)]">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 7L12 12M12 12L22 7M12 12V22M12 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </div>
        <CardTitle className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 dark:to-orange-300 pb-1">TrackFlow</CardTitle>
        <CardDescription className="text-muted-foreground text-md pt-1">Sign in to your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="py-6 px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-card-foreground/90">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., admin@trackflow.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-base bg-background/80 focus:bg-background border-border/50 focus:border-primary focus:ring-primary/50 rounded-lg shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-card-foreground/90">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 text-base bg-background/80 focus:bg-background border-border/50 focus:border-primary focus:ring-primary/50 rounded-lg shadow-sm"
            />
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
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground pt-6 pb-8 px-8 bg-secondary/50 dark:bg-card-foreground/5 rounded-b-xl border-t border-border/30">
        <p className="font-semibold mb-2 text-card-foreground/90">Demo Accounts (password: <span className="font-bold text-primary">password</span>):</p>
        <ul className="list-none space-y-1.5 text-xs w-full">
          {MOCK_USERS.map(user => (
            <li key={user.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-primary/5 transition-colors">
              <span className="flex items-center">
                <Briefcase className="inline-block mr-2 h-4 w-4 text-primary/70" /> 
                <span className="font-medium text-foreground/80">{user.email}</span>
              </span>
              <span className="text-muted-foreground text-[0.7rem] bg-muted/50 px-1.5 py-0.5 rounded-sm">{user.role.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
         <div className="mt-5 text-xs flex items-center text-green-600 dark:text-green-500/90">
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            <span>All connections are secure and encrypted.</span>
        </div>
      </CardFooter>
    </Card>
  );
}
