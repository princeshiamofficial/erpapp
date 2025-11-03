
"use client";

import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-cover bg-center p-4 selection:bg-primary/20 selection:text-primary"
      style={{
        backgroundImage: "url('https://i.ibb.co/VYYkxvH9/bg.png')",
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm -z-10" />
      
      {/* Animated background element */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="aurora-bg"></div>
      </motion.div>
      
      <LoginForm />
    </div>
  );
}
