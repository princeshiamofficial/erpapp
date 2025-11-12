
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function PaymentHistoryPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full">
            <Construction className="h-8 w-8 text-amber-500 dark:text-amber-400" />
          </div>
          <CardTitle className="mt-4">Under Construction</CardTitle>
          <CardDescription>
            The Payment History page is currently being built.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will soon provide a comprehensive overview of all financial transactions. Please check back later!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
