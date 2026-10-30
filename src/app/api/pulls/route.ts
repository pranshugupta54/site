import { getSitePulls } from "@/lib/github";

// Tofu's open PR count for the footer vitals, fetched client-side. Serves the
// number and nothing else from the GitHub payload; 204 on any failure.
export const revalidate = 300;

export async function GET() {
  const pulls = await getSitePulls({ revalidate });
  if (!pulls) return new Response(null, { status: 204 });
  return Response.json({ open: pulls.open });
}
