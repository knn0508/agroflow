import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return Response.json({ error: "Fayl tapılmadı" }, { status: 400 });
    }

    const urls: string[] = [];

    // Vercel's filesystem is read-only: inline images as data URLs instead.
    if (process.env.VERCEL) {
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        urls.push(`data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`);
      }
      return Response.json({ urls }, { status: 200 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const ext = path.extname(file.name || "") || ".jpg";
      const filename = `${Date.now()}-${randomUUID()}${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(path.join(uploadDir, filename), buffer);
      urls.push(`/uploads/${filename}`);
    }

    return Response.json({ urls }, { status: 200 });
  } catch {
    return Response.json({ error: "Yükləmə xətası" }, { status: 500 });
  }
}
