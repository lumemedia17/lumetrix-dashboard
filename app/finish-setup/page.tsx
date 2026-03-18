import { Suspense } from "react";
import FinishSetupClient from "./FinishSetupClient";

export default function FinishSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
          Checking payment...
        </div>
      }
    >
      <FinishSetupClient />
    </Suspense>
  );
}