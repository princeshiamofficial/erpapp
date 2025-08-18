
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2, Database, Wand2, CheckCircle, AlertTriangle } from 'lucide-react';
import { migrateCollectionAction, type CollectionId, type MigrationResult } from './actions';

const MIGRATABLE_COLLECTIONS: CollectionId[] = [
  'customOrderStatuses',
  'employees',
  'globalSettings',
  'leads',
  'orders',
  'personalTransactions',
  'projects',
  'purchaseRequests',
  'serviceLaminations',
  'serviceModels',
  'servicePaymentMethods',
  'users',
];


export default function MigrateToApiPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [migrationStatus, setMigrationStatus] = useState<Record<CollectionId, 'idle' | 'loading' | 'success' | 'error'>>(
    MIGRATABLE_COLLECTIONS.reduce((acc, curr) => ({ ...acc, [curr]: 'idle' }), {} as any)
  );
  const [migrationResults, setMigrationResults] = useState<Record<CollectionId, MigrationResult | null>>({});

  const handleMigrate = async (collectionId: CollectionId) => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    setMigrationStatus(prev => ({ ...prev, [collectionId]: 'loading' }));
    setMigrationResults(prev => ({...prev, [collectionId]: null}));

    toast({
      title: `Starting Migration for: ${collectionId}`,
      description: "Please do not navigate away from this page.",
    });

    try {
      const result = await migrateCollectionAction(collectionId, currentUser);
      setMigrationResults(prev => ({ ...prev, [collectionId]: result }));

      if (result.success) {
        toast({
          title: "Migration Successful",
          description: `Migrated ${result.migratedCount} of ${result.readCount} documents for ${collectionId}.`,
        });
        setMigrationStatus(prev => ({ ...prev, [collectionId]: 'success' }));
      } else {
        toast({
          title: "Migration Failed",
          description: result.error || `Failed to migrate ${collectionId}.`,
          variant: "destructive",
          duration: 10000,
        });
        setMigrationStatus(prev => ({ ...prev, [collectionId]: 'error' }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Migration Error",
        description: errorMessage,
        variant: "destructive",
      });
      setMigrationStatus(prev => ({ ...prev, [collectionId]: 'error' }));
    }
  };
  
  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    return (
        <div className="flex h-full w-full items-center justify-center p-8 text-center">
            <div className="bg-card p-8 rounded-lg shadow-xl border">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">You must be a System Administrator to access this page.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Data Migration to API</h1>
          <p className="page-description">
            Transfer existing Firestore data to the new API database. Run this once for each collection.
          </p>
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Migration Control Panel
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Click 'Migrate' for each collection. This action reads from Firestore and writes to your new API. It will not delete existing API data.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MIGRATABLE_COLLECTIONS.map(collectionId => (
              <Card key={collectionId} className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="text-base capitalize">{collectionId.replace(/([A-Z])/g, ' $1')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleMigrate(collectionId)}
                    disabled={migrationStatus[collectionId] === 'loading'}
                    className="w-full"
                  >
                    {migrationStatus[collectionId] === 'loading' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    {migrationStatus[collectionId] === 'loading' ? 'Migrating...' : 'Migrate'}
                  </Button>
                </CardContent>
                {migrationResults[collectionId] && (
                  <div className="px-6 pb-4 text-xs">
                     {migrationResults[collectionId]?.success ? (
                         <p className="text-green-600 flex items-center gap-1.5"><CheckCircle className="h-4 w-4"/> Migrated: {migrationResults[collectionId]?.migratedCount} / {migrationResults[collectionId]?.readCount}</p>
                     ) : (
                         <p className="text-destructive flex items-center gap-1.5"><AlertTriangle className="h-4 w-4"/> Error: {migrationResults[collectionId]?.error?.substring(0, 100)}...</p>
                     )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
