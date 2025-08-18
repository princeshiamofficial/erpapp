
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Download, Users, Package, Briefcase, ListChecks, Layers, Shield, FileText, Loader2, DatabaseZap } from 'lucide-react';
import { 
  exportOrdersAction, 
  exportUsersAction, 
  exportProjectsAction,
  exportStatusesAction,
  exportServiceModelsAction,
  exportLeadsAction,
  exportEmployeesAction
} from './actions';

interface ExportButtonProps {
  label: string;
  onExport: () => Promise<any[]>;
  filename: string;
  icon: React.ElementType;
}

const ExportButton: React.FC<ExportButtonProps> = ({ label, onExport, filename, icon: Icon }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsLoading(true);
    toast({ title: "Starting Export...", description: `Preparing ${label} data.` });
    try {
      const data = await onExport();
      if (data.length === 0) {
        toast({ title: "No Data", description: `There is no data to export for ${label}.`, variant: "default" });
        return;
      }
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Export Successful", description: `${data.length} records exported for ${label}.` });

    } catch (error) {
      console.error(`Failed to export ${label}:`, error);
      toast({ title: "Export Failed", description: `Could not export ${label}. See console for details.`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isLoading} className="w-full justify-start">
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icon className="mr-2 h-4 w-4" />
      )}
      {isLoading ? `Exporting ${label}...` : `Export ${label}`}
    </Button>
  );
};

export default function BackupPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    // This check is mainly for client-side redirection if a non-admin user somehow navigates here.
    // Server-side checks in actions would prevent actual data access.
    if (typeof window !== 'undefined') {
        router.replace('/dashboard');
    }
    return null; // Render nothing on the server for non-admins
  }
  
  const exportItems = [
    { label: "Orders", onExport: exportOrdersAction, filename: "orders_backup", icon: Package },
    { label: "Users", onExport: exportUsersAction, filename: "users_backup", icon: Users },
    { label: "Projects", onExport: exportProjectsAction, filename: "projects_backup", icon: Briefcase },
    { label: "Leads", onExport: exportLeadsAction, filename: "leads_backup", icon: Shield },
    { label: "Employees", onExport: exportEmployeesAction, filename: "employees_backup", icon: FileText },
    { label: "Order Statuses", onExport: exportStatusesAction, filename: "statuses_backup", icon: ListChecks },
    { label: "Service Models", onExport: exportServiceModelsAction, filename: "models_backup", icon: Layers },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Data Backup & Export</h1>
          <p className="page-description">
            Download your application data as JSON files for backup or external use.
          </p>
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2">
                <DatabaseZap className="h-6 w-6 text-primary" />
                Export Collections
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">
                Select a data collection to export. The data will be downloaded as a structured JSON file.
            </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {exportItems.map((item) => (
                    <ExportButton
                        key={item.filename}
                        label={item.label}
                        onExport={item.onExport}
                        filename={item.filename}
                        icon={item.icon}
                    />
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
