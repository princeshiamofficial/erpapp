
"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface ChipIconProps extends React.SVGProps<SVGSVGElement> {}

export function ChipIcon({ className, ...props }: ChipIconProps) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto", className)}
      {...props}
    >
      <rect width="32" height="24" rx="3" fill="currentColor" />
      <path
        d="M9 12H23"
        stroke="#202124"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 5V19"
        stroke="#202124"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="12"
        y="8"
        width="8"
        height="8"
        rx="1.5"
        stroke="#202124"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
    </svg>
  );
}
