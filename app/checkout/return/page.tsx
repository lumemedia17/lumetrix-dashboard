import { Suspense } from "react";
import { firstParam } from "@/lib/plans";
import CheckoutReturnClient from "./CheckoutReturnClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sessionId = firstParam(params.session_id) ?? null;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
          Verifying checkout...
        </div>
      }
    >
      <CheckoutReturnClient sessionId={sessionId} />
    </Suspense>
  );
}
