
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Briefcase } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-description">
              Manage and oversee all ongoing and completed projects.
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl">Project Overview</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Future home for project listings and management tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-16 w-16 text-muted-foreground opacity-30 mb-4" data-ai-hint="briefcase folder" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Projects Coming Soon</h3>
            <p className="text-muted-foreground">
              This section will display project details, progress, and more.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
