// src/app/(app)/dr2o/page.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DR2OPage() {
  return (
    <div className="flex justify-center items-center h-full">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>DR 2.O</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is the DR 2.O page. Content to be added.</p>
        </CardContent>
      </Card>
    </div>
  );
}
