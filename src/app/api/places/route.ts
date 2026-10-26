import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const where: Record<string, unknown> = { status: "APPROVED" };
  if (category) where.category = category;
  if (search) where.OR = [{ name: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }];
  const places = await prisma.place.findMany({
    where,
    include: { entrepreneur: { select: { businessName: true, location: true } } },
  });
  return Response.json(places);
  } catch (e) {
    console.error("GET /api/places failed", e);
    return Response.json({ error: "Server xətası" }, { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Giriş tələb olunur" }, { status: 401 });
    if (session.user.role !== "ENTREPRENEUR") return Response.json({ error: "İcazə yoxdur" }, { status: 403 });
    const profile = await prisma.entrepreneurProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile?.isVerified) return Response.json({ error: "Hesabınız hələ doğrulanmayıb" }, { status: 403 });
    const body = await req.json();
    if (!body?.address || !body?.lat || !body?.lng) {
      return Response.json({ error: "Ünvan xəritədə təsdiqlənməlidir" }, { status: 400 });
    }
    const place = await prisma.place.create({ data: { ...body, entrepreneurProfileId: profile.id, status: "PENDING" } });
    return Response.json(place, { status: 201 });
  } catch {
    return Response.json({ error: "Server xətası" }, { status: 500 });
  }
}
