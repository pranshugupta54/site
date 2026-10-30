import { ogImage, OG_ALT, OG_SIZE } from "@/lib/og/card";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

// Home share card — same family as the per-page /og cards.
export default function OpengraphImage() {
  return ogImage();
}
