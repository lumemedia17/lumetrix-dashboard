import { Suspense } from "react";
import FinishSetupClient from "./FinishSetupClient";

export default function FinishSetupPage() {
  return (
    <Suspense fallback={null}>
      <FinishSetupClient />
    </Suspense>
  );
}