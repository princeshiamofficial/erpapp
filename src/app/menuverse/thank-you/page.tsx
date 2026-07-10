import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: 'Thank You | MenuVerse',
  description: 'Thank you for requesting a MenuVerse demo.',
};

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl border bg-card rounded-xl overflow-hidden text-center">
        <CardHeader className="pt-10 pb-4">
          <div className="mx-auto bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-10 h-10 text-emerald-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 tracking-tight">Thank you!</CardTitle>
          <CardDescription className="text-base mt-2 text-gray-600">
            Your request has been received successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <p className="text-gray-600 text-base leading-relaxed">
            Our MenuVerse team will contact you on your WhatsApp number shortly to schedule your free demo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
