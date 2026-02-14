
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;
        const extension = path.extname(originalName);
        const filename = `${uuidv4()}${extension}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");

        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);

        const fileUrl = `/uploads/${filename}`;

        return NextResponse.json({
            success: true,
            file_url: fileUrl,
            message: "File uploaded successfully"
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Internal Server Error"
        }, { status: 500 });
    }
}
