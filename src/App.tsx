// src/App.tsx
import { useMemo, useState } from "react";
import "./index.css";
import { ZONES, Zone } from "./data/mockZones";
import MapView from "./components/Map";
import SearchBox from "./components/SearchBox";
import LeftTab from "./components/LeftTab";
import InfoPanel from "./components/InfoPanel";

export default function App() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const selectedZone: Zone | null = useMemo(() => {
    return ZONES.find(z => z.id === selectedZoneId) ?? null;
  }, [selectedZoneId]);

  return (
    <div className="app">
      <div className="sidebar">
        <div className="section-title">탭</div>
        <LeftTab
          zones={ZONES}
          selectedId={selectedZoneId}
          onSelect={(id) => setSelectedZoneId(id)}
        />
      </div>

      <div className="header">
        <SearchBox
          zones={ZONES}
          onSelect={(id) => setSelectedZoneId(id)}
        />
      </div>

      <div className="map-wrap">
        <div className="map-abs">
          <MapView
            zones={ZONES}
            selectedId={selectedZoneId}
            onSelect={(id) => setSelectedZoneId(id)}
          />
        </div>
      </div>

      <div className="info">
        <InfoPanel zone={selectedZone} />
      </div>
    </div>
  );
}
