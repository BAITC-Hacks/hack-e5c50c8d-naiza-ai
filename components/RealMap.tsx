"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PLACES } from "@/lib/engine/places";
import type { DistrictSnapshot } from "@/lib/engine/types";
import { scoreColor } from "./score-color";

export default function RealMap({
  districts,
  onDistrictClick,
}: {
  districts: DistrictSnapshot[];
  highlight?: string[];
  activeId?: string | null;
  onDistrictClick?: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const clickRef = useRef(onDistrictClick);
  clickRef.current = onDistrictClick;

  const weakest = useMemo(
    () => [...districts].sort((a, b) => a.afterScore - b.afterScore)[0]?.id ?? "nura",
    [districts],
  );
  const [selectedId, setSelectedId] = useState(weakest);
  const selected = districts.find((item) => item.id === selectedId) ?? districts[0];
  const place = selected ? PLACES[selected.id] : undefined;

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const map = L.map(host.current, { scrollWheelZoom: false }).setView([51.14, 71.43], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.clearLayers();
    for (const district of districts) {
      const spot = PLACES[district.id];
      if (!spot) continue;
      const active = district.id === selectedId;
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: active ? 18 : 13,
        color: "#ffffff",
        weight: 3,
        fillColor: scoreColor(district.afterScore),
        fillOpacity: 0.95,
      });
      marker.bindTooltip(`${district.name} · ${district.afterScore.toFixed(1).replace(".", ",")}`, {
        permanent: true,
        direction: "top",
        offset: [0, -6],
      });
      marker.on("click", () => {
        setSelectedId(district.id);
        clickRef.current?.(district.id);
      });
      marker.addTo(group);
    }
  }, [districts, selectedId]);

  return (
    <div className="space-y-3">
      <div ref={host} className="h-[440px] overflow-hidden rounded-3xl border border-line" />
      {selected && place ? (
        <article className="grid gap-0 overflow-hidden rounded-3xl bg-card md:grid-cols-[1.35fr_1fr]">
          <img src={place.photo} alt={`Образ района ${selected.name}`} className="h-56 w-full object-cover md:h-full" />
          <div className="p-4 md:p-5">
            <p className="text-sm font-semibold text-gold-deep">{place.shore}</p>
            <h3 className="font-serif text-3xl">{selected.name}</h3>
            <p className="mt-1 font-serif text-4xl">{selected.afterScore.toFixed(2).replace(".", ",")}</p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{selected.profile}</p>
            <p className="mt-3 text-xs leading-5 text-ink-soft">Точка стоит примерно в характерном месте района. Снимок — образ для симулятора, не официальная фотофиксация. Числа условные.</p>
          </div>
        </article>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {districts.map((district) => {
          const spot = PLACES[district.id];
          if (!spot) return null;
          return (
            <button
              key={district.id}
              type="button"
              onClick={() => {
                setSelectedId(district.id);
                mapRef.current?.panTo([spot.lat, spot.lng]);
                onDistrictClick?.(district.id);
              }}
              className={`overflow-hidden rounded-2xl bg-card text-left ${district.id === selectedId ? "ring-2 ring-gold" : ""}`}
            >
              <img src={spot.photo} alt="" className="h-20 w-full object-cover" />
              <span className="block px-2 py-1.5 text-xs font-semibold">{district.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
