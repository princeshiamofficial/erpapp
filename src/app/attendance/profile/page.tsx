
"use client";

import React from 'react';
import { User } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
      <div className="text-center">
        <User className="h-24 w-24 text-primary mx-auto opacity-80" />
        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mt-4">Profile</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">This page is under construction.</p>
      </div>
    </div>
  );
}
