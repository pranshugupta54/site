import { SLIDE_IDS } from "@/lib/wrapped";
import { WrappedView, wrappedMetadata } from "../view";

export const revalidate = 3600;
export const dynamicParams = false; // only real slide ids; a hidden slide opens the intro

type Props = { params: Promise<{ slide: string }> };

export const generateStaticParams = () => SLIDE_IDS.filter((id) => id !== "intro").map((slide) => ({ slide }));

export async function generateMetadata({ params }: Props) {
  return wrappedMetadata((await params).slide);
}

export default async function WrappedSlidePage({ params }: Props) {
  return <WrappedView id={(await params).slide} />;
}
