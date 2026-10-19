import { FlatView } from "@/components/FlatView";

// Stage 1: the home route renders the flat view. Stage 2 will mount the 3D scene here
// and fall back to FlatView for crawlers, low-power devices and prefers-reduced-motion.
export default function Home() {
  return <FlatView />;
}
