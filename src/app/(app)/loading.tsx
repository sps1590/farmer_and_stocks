import { CropLoader } from "@/components/CropLoader";

// Shown while a screen's data loads: a crop growing in the middle of the screen.
export default function Loading() {
  return (
    <div className="min-h-[60vh]" aria-busy="true">
      <CropLoader />
    </div>
  );
}
