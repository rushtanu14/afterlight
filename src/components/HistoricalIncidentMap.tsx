import { useEffect, useRef, useState } from "react";
import type { GeoPoint, HistoricalScenario, RoadGeometrySnapshot } from "../data/replay";

type HistoricalIncidentMapProps = {
  activePointId: string;
  scenario: HistoricalScenario;
};

export function historicalAnchorLabel(point: GeoPoint) {
  return `${point.label} · illustrative anchor`;
}

export function historicalRoadLabel(road: RoadGeometrySnapshot) {
  return `${road.label} · historical OSM road snapshot · captured ${road.capturedOn}`;
}

function textNode(className: string, text: string) {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

export function HistoricalIncidentMap({ activePointId, scenario }: HistoricalIncidentMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const activePointIdRef = useRef(activePointId);
  const markerRefs = useRef(new Map<string, { glyph: HTMLSpanElement; marker: import("leaflet").Marker }>());
  const [perimeterStatus, setPerimeterStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    activePointIdRef.current = activePointId;
    for (const [pointId, { glyph }] of markerRefs.current) {
      const active = pointId === activePointId;
      glyph.classList.toggle("active", active);
    }
  }, [activePointId]);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    const controller = new AbortController();

    async function renderMap() {
      setPerimeterStatus("loading");
      const L = await import("leaflet");
      if (cancelled || !mapElementRef.current) return;

      const { center, bbox } = scenario.mapGeometry;
      map = L.map(mapElementRef.current, {
        attributionControl: true,
        fadeAnimation: false,
        markerZoomAnimation: false,
        scrollWheelZoom: false,
        zoomAnimation: false
      });
      map.setView([center.latitude, center.longitude], scenario.mapGeometry.zoom);
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: [12, 12] });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
      }).addTo(map);

      for (const road of scenario.mapGeometry.roadSnapshots) {
        for (const path of road.paths) {
          const line = L.polyline(path, {
            color: road.role === "primary" ? "#e8ad67" : road.role === "backup" ? "#88aeca" : "#b8afa4",
            opacity: 0.86,
            weight: road.role === "primary" ? 4 : 3,
            dashArray: road.role === "alternate" ? "7 7" : undefined
          }).addTo(map);
          line.bindTooltip(textNode("historical-road-tooltip", historicalRoadLabel(road)), { sticky: true });
        }
      }

      for (const point of scenario.mapGeometry.points) {
        const active = point.id === activePointIdRef.current;
        const markerGlyph = textNode(
          `historical-marker-glyph historical-marker-${point.kind}${active ? " active" : ""}`,
          point.kind === "fire_origin" ? "F" : point.kind === "household" ? "H" : "R"
        );
        markerGlyph.setAttribute("aria-hidden", "true");
        const marker = L.marker([point.latitude, point.longitude], {
          icon: L.divIcon({
            className: "historical-marker",
            html: markerGlyph,
            iconAnchor: [14, 14],
            iconSize: [28, 28]
          }),
          keyboard: true,
          title: historicalAnchorLabel(point)
        }).addTo(map);
        marker.bindPopup(textNode("historical-marker-label", historicalAnchorLabel(point)), { autoPan: false });
        markerRefs.current.set(point.id, { glyph: markerGlyph, marker });
      }

      const perimeter = scenario.mapGeometry.perimeterLayer;
      if (!perimeter) {
        setPerimeterStatus("unavailable");
        return;
      }

      try {
        const queryUrl = new URL(`${perimeter.serviceUrl.replace(/\/$/, "")}/${perimeter.layerId}/query`);
        queryUrl.search = new URLSearchParams({
          f: "geojson",
          where: "1=1",
          outFields: "*",
          returnGeometry: "true"
        }).toString();
        const response = await fetch(queryUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Perimeter source unavailable");
        const geoJson = await response.json() as { type?: string; features?: unknown[] };
        if (cancelled || geoJson.type !== "FeatureCollection" || !geoJson.features?.length) {
          if (!cancelled) setPerimeterStatus("unavailable");
          return;
        }
        L.geoJSON(geoJson as never, {
          style: {
            color: "#e8ad67",
            fillColor: "#d86f3d",
            fillOpacity: 0.16,
            opacity: 0.9,
            weight: 2
          }
        }).addTo(map);
        setPerimeterStatus("ready");
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setPerimeterStatus("unavailable");
        }
      }
    }

    void renderMap();
    return () => {
      cancelled = true;
      controller.abort();
      markerRefs.current.clear();
      map?.remove();
    };
  }, [scenario]);

  const perimeter = scenario.mapGeometry.perimeterLayer;
  const captureDates = Array.from(new Set(scenario.mapGeometry.roadSnapshots.map((road) => road.capturedOn)));

  return (
    <div className="historical-map">
      <div
        className="historical-map-canvas"
        ref={mapElementRef}
        aria-label={`${scenario.name} historical source map`}
      />
      <div className="historical-map-legend" aria-label="Historical map legend">
        <span><i className="legend-marker">R</i> Row-linked illustrative anchor</span>
        <span><i className="legend-marker">F</i> Fire-location illustrative anchor</span>
        <span><i className="legend-marker">H</i> Household illustrative anchor</span>
      </div>
      <div className="historical-map-provenance">
        <div>
          <strong>Road evidence</strong>
          <span>{scenario.mapGeometry.roadSnapshots.map((road) => historicalRoadLabel(road)).join("; ")}</span>
          <small>Stored geometry only. These lines do not state current road status and are not route recommendations.</small>
          {scenario.mapGeometry.roadSnapshots[0] ? (
            <a href={scenario.mapGeometry.roadSnapshots[0].licenseUrl} target="_blank" rel="noreferrer">
              {scenario.mapGeometry.roadSnapshots[0].attribution} · ODbL
            </a>
          ) : null}
        </div>
        <div>
          <strong>Perimeter evidence</strong>
          {perimeter ? (
            <a href={perimeter.sourceUrl} target="_blank" rel="noreferrer">
              {perimeter.label} · {perimeterStatus === "ready" ? "loaded" : perimeterStatus}
            </a>
          ) : <span>No stored perimeter layer.</span>}
          <small>Road snapshots captured {captureDates.join(", ")}. Map display uses online OpenStreetMap standard tiles.</small>
        </div>
      </div>
    </div>
  );
}
