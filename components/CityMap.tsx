"use client";

import dynamic from "next/dynamic";
import type { DistrictSnapshot } from "@/lib/engine/types";

const RealMap = dynamic(() => import("./RealMap"), {
  ssr: false,
  loading: () => <div className="h-[440px] animate-pulse rounded-3xl bg-paper-deep" />,
});

export function CityMap({
  districts,
  highlight = [],
  activeId,
  onDistrictClick,
}: {
  districts: DistrictSnapshot[];
  highlight?: string[];
  activeId?: string | null;
  onDistrictClick?: (id: string) => void;
}) {
  return <RealMap districts={districts} highlight={highlight} activeId={activeId} onDistrictClick={onDistrictClick} />;
}
