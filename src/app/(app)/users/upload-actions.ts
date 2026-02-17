
"use server";

import { smartCompress } from "@/lib/image-utils";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function uploadOptimizedAvatarAction(formData: FormData): Promise<{ success: boolean; file_url?: string; error?: string }> {
    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, error: "No file provided." };
    }

    try {
        // 1. Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Compress to 100KB target
        const optimizedBuffer = await smartCompress(buffer, 100);

        // 3. Create a unique filename
        const filename = `${uuidv4()}.jpg`;
        const uploadDir = path.join(process.cwd(), "storage", "uploads");

        // Ensure directory exists (just in case)
        await fs.mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, filename);

        // 4. Save to storage/uploads
        await fs.writeFile(filePath, optimizedBuffer);

        // 5. Return the local URL
        const fileUrl = `/uploads/${filename}`;

        return { success: true, file_url: fileUrl };

    } catch (error) {
        console.error("Local Upload Action Error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Internal server error during local image storage." };
    }
}
