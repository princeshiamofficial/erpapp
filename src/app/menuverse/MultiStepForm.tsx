"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

import { submitMenuverseDemoRequest } from "./actions";

export function MultiStepForm() {
  const router = useRouter();

  const handleAction = async (formData: FormData) => {
    const result = await submitMenuverseDemoRequest(formData);
    if (result.success) {
      router.push('/menuverse/thank-you');
    } else {
      if (result.error === "Already submitted from this IP address") {
        router.push('/menuverse/error');
      } else {
        alert("Failed to submit request. Please try again.");
      }
    }
  };
  return (
    <Card className="shadow-xl border bg-card rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b pb-6 pt-8 px-4 sm:px-8 text-white">
        <div className="text-center">
          <CardTitle className="text-2xl sm:text-3xl text-white leading-tight">Transform Your Restaurant with MenuVerse</CardTitle>
          <CardDescription className="text-base mt-3 max-w-2xl mx-auto text-slate-300">
            Experience next-gen restaurant management with a free QR menu & website demo.
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-8">
        <form id="demo-form" className="space-y-8" action={handleAction}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
              <Input id="fullName" name="fullName" placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number <span className="text-red-500">*</span></Label>
              <Input id="whatsapp" name="whatsapp" type="tel" placeholder="+880 1712-345678" pattern="^(\+?880\s?|0)?(13|14|15|16|17|18|19)\d{2}-?\d{6}$" title="Please enter a valid Bangladeshi phone number (e.g. 01712345678 or +880 1712-345678)" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
              <Input id="email" name="email" type="email" placeholder="john@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Restaurant Name <span className="text-red-500">*</span></Label>
              <Input id="restaurantName" name="restaurantName" placeholder="Spicy Corner" required />
            </div>
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="role">Your Role <span className="text-red-500">*</span></Label>
                <Select name="role" required>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Restaurant Type</Label>
                <Select name="type">
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select restaurant type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="fast-food">Fast Food</SelectItem>
                    <SelectItem value="bakery">Bakery</SelectItem>
                    <SelectItem value="cloud-kitchen">Cloud Kitchen</SelectItem>
                    <SelectItem value="fine-dining">Fine Dining</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 mt-2 border-t pt-6">
              <Label htmlFor="address">Restaurant Address <span className="text-red-500">*</span></Label>
              <Input id="address" name="address" placeholder="123 Food Street, NY" required />
            </div>
            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="tables">Number of Tables <span className="text-red-500">*</span></Label>
                <Input id="tables" name="tables" type="number" min="1" placeholder="24" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branches">Branches (Optional)</Label>
                <Input id="branches" name="branches" type="number" min="1" placeholder="3" />
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      
      <CardFooter className="bg-muted/20 border-t px-4 sm:px-8 py-4 sm:py-6 flex flex-col items-center gap-4">
        <Button type="submit" form="demo-form" className="w-full h-12 text-base font-semibold">Request a Free Demo</Button>
        <p className="text-xs text-muted-foreground text-center">
          By submitting, you agree to be contacted by our team about MenuVerse.
        </p>
      </CardFooter>
    </Card>
  );
}
