
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MOCK_USERS } from '@/lib/auth-constants';
import { Loader2, LogIn, KeyRound } from 'lucide-react';

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
    <Card className="w-full max-w-md shadow-xl bg-card border">
      <CardHeader className="text-center pt-8">
        <div className="mx-auto mb-6">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary drop-shadow-[0_2px_4px_hsl(var(--primary)/0.5)]">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 7L12 12M12 12L22 7M12 12V22M12 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 4.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <CardTitle className="text-4xl font-bold text-card-foreground">Welcome to TrackFlow</CardTitle>
        <CardDescription className="text-muted-foreground text-base pt-1">Sign in to access your dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base text-card-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., admin@trackflow.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-base bg-background focus:bg-background/90"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base text-card-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 text-base bg-background focus:bg-background/90"
            />
          </div>
          <Button type="submit" className="w-full h-12 text-lg shadow-md hover:shadow-lg transition-shadow" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            Sign In
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground pt-6 pb-8">
        <p className="font-semibold mb-2 text-card-foreground">Demo Accounts:</p>
        <ul className="list-disc list-inside space-y-1.5">
          {MOCK_USERS.map(user => (
            <li key={user.id}><span className="font-medium text-foreground/90">{user.email}</span> ({user.role})</li>
          ))}
          <li className="mt-2 flex items-center">
            <KeyRound className="inline-block mr-1.5 h-4 w-4 text-muted-foreground" /> 
            <span>Password for all demo accounts: <span className="font-semibold text-foreground/90">password</span></span>
          </li>
        </ul>
      </CardFooter>
    </Card>
  );
}
