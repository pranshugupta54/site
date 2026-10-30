import { getSitePulls } from "@/lib/github";

// Tofu's open PR count for the footer vitals, fetched client-side. Serves the
// number and nothing else from the GitHub payload; 204 on a cold failure
// (no snapshot yet), else a failed refresh keeps serving the last good count.
export const revalidate = 300;

export async function GET() {
  const pulls = await getSitePulls({ revalidate });
  if (!pulls) return new Response(null, { status: 204 });
  return Response.json({ open: pulls.open });
}
