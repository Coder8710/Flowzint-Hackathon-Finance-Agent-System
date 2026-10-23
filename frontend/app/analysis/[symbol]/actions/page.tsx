"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ActionsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const rawSymbol = (params.symbol as string) || (params.ticker as string);
  const symbol = rawSymbol?.toUpperCase();

  useEffect(() => {
    if (symbol) {
      router.replace(`/analysis/${symbol}/action-plan`);
    } else {
      router.replace("/");
    }
  }, [symbol, router]);

  return null;
}
