import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const safeSubPath = path.normalize(pathSegments.join("/")).replace(/^(\.\.[\/\\])+/, "");

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const localPath = path.join(uploadsDir, safeSubPath);
  const tmpPath = path.join("/tmp", "uploads", safeSubPath);

  let filePath = "";
  if (fs.existsSync(tmpPath)) {
    filePath = tmpPath;
  } else if (fs.existsSync(localPath)) {
    filePath = localPath;
  } else {
    return new NextResponse("Not Found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };

  const contentType = mimeTypes[ext] || "application/octet-stream";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
