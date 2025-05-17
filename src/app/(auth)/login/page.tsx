
"use client";

import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || (!isLoading && currentUser)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-500/10 via-red-500/5 to-background p-4 selection:bg-primary/20 selection:text-primary">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border/0.2)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/0.2)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50 dark:opacity-20"></div>
        {/* Radial gradient for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,theme(colors.background)_90%)]"></div>
      </div>
      <LoginForm />
    </div>
  );
}
