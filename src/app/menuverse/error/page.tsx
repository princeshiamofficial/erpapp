import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: 'Already Submitted | MenuVerse',
  description: 'You have already requested a MenuVerse demo.',
};

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl border bg-card rounded-xl overflow-hidden text-center">
        <CardHeader className="pt-10 pb-4">
          <div className="mx-auto bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-10 h-10 text-amber-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 tracking-tight">Already Submitted</CardTitle>
          <CardDescription className="text-base mt-2 text-gray-600">
            You have already submitted a demo request!
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <p className="text-gray-600 text-base leading-relaxed">
            Our team will contact you shortly.
          </p>
        </CardContent>
        <CardFooter className="bg-muted/20 border-t px-8 py-6 flex justify-center">
          <Link href="/menuverse" className="w-full">
            <Button variant="outline" className="w-full">Return Home</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
