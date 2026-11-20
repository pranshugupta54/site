import { WrappedView, wrappedMetadata } from "./view";

export const revalidate = 3600; // live github numbers, hourly like the home page

export const generateMetadata = () => wrappedMetadata("intro");

export default function WrappedPage() {
  return <WrappedView id="intro" />;
}
