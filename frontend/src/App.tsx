import { useState } from "react";
import LeftTab from "./components/LeftTab";
import MapView from "./components/Map";
import InfoPanel from "./components/InfoPanel";
import SearchBox from "./components/SearchBox";
import { guDongData, GuInfo, DongInfo } from "./data/guDongData";

export default function App() {
  const [selectedGuId, setSelectedGuId] = useState<string | null>(null);
  const [selectedDong, setSelectedDong] = useState<DongInfo | null>(null);

  const selectedGu: GuInfo | null =
    selectedGuId ? guDongData.find((g) => g.guId === selectedGuId) ?? null : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr 300px",
        height: "100vh",
        background: "#0a0f1a",
      }}
    >
      {/* 왼쪽 패널 */}
      <div style={{ borderRight: "1px solid #1b2332", padding: 16 }}>
        <LeftTab
          selectedGuId={selectedGuId}
          selectedDong={selectedDong}
          onSelectGu={(id) => {
            setSelectedGuId(id);
            setSelectedDong(null);
          }}
          onSelectDong={(dong) => {
            setSelectedDong(dong);
            setSelectedGuId(
              guDongData.find((g) => g.dongs.some((d) => d.id === dong.id))?.guId ?? null
            );
          }}
        />
      </div>

      {/* 중앙 지도 영역 */}
      <div style={{ position: "relative" }}>

        {/* 🔍 검색 UI - 상단 중앙 고정 */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
          }}
        >
          <SearchBox
            zones={guDongData.map((g) => ({
              id: g.guId,
              name: g.guName,
              danger: g.danger,
            }))}
            onSelect={(id) => {
              setSelectedGuId(id);
              setSelectedDong(null);
            }}
            onRemoteSelect={(p) => {
              // 원격 좌표 선택 시: 가장 가까운 구/동 추정 후 선택 상태 갱신
              // 간단히: 거리 최소의 구를 선택하고 지도 이동은 Map 컴포넌트가 처리(선택 변경 시 FlyTo)
              const nearestGu = guDongData
                .slice()
                .sort((a, b) =>
                  distance(a.lat, a.lng, p.lat, p.lng) - distance(b.lat, b.lng, p.lat, p.lng)
                )[0];
              if (nearestGu) {
                setSelectedGuId(nearestGu.guId);
                setSelectedDong(null);
              }
            }}
          />
        </div>

        {/* 지도 */}
        <MapView
          selectedGuId={selectedGuId}
          selectedDong={selectedDong}
          onSelectFromMap={(guId, dong) => {
            if (guId) setSelectedGuId(guId);
            setSelectedDong(dong);
          }}
        />
      </div>

      {/* 오른쪽 정보 패널 */}
      <div style={{ borderLeft: "1px solid #1b2332", padding: 16 }}>
        <InfoPanel gu={selectedDong ? null : selectedGu} dong={selectedDong} />
      </div>
    </div>
  );
}

function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
