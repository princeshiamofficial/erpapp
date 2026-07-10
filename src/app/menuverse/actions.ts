"use server";

import { createMenuverseRegistration } from "@/lib/menuverse-service";
import { headers } from "next/headers";

export async function submitMenuverseDemoRequest(formData: FormData) {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : headersList.get("x-real-ip") || "unknown";

  const data = {
    fullName: formData.get("fullName") as string,
    whatsappNumber: formData.get("whatsapp") as string,
    email: formData.get("email") as string,
    restaurantName: formData.get("restaurantName") as string,
    role: formData.get("role") as string,
    restaurantType: formData.get("type") as string,
    address: formData.get("address") as string,
    numberOfTables: parseInt(formData.get("tables") as string, 10),
    numberOfBranches: formData.get("branches") ? parseInt(formData.get("branches") as string, 10) : undefined,
    ipAddress,
  };

  const result = await createMenuverseRegistration(data);
  return result;
}
