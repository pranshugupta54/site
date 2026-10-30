import { ogImage } from "@/lib/og/card";

// Per-page share card: /og?title=…&path=… (see pageMeta in lib/meta.ts).
export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return ogImage({ title: searchParams.get("title"), path: searchParams.get("path") });
}
