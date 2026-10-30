import { ogImage } from "@/lib/og/card";

// Share cards: /og for home, /og?title=…&path=… per page; v= only busts caches
// (urls built by shareImage in lib/og/image.ts).
export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return ogImage({ title: searchParams.get("title"), path: searchParams.get("path") });
}
