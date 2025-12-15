import { useState, useEffect } from "react";
import LeftTab from "./components/LeftTab";
import MapView from "./components/Map";
import InfoPanel from "./components/InfoPanel";
import SearchBox from "./components/SearchBox";
import { guDongData, GuInfo, DongInfo, GuWithDongs } from "./data/guDongData";

export default function App() {
  const [selectedGuId, setSelectedGuId] = useState<string | null>(null);
  const [selectedDong, setSelectedDong] = useState<DongInfo | null>(null);
  const [enrichedData, setEnrichedData] = useState<GuWithDongs[]>(guDongData);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 실제 위험도 데이터 로드
  useEffect(() => {
    const loadRealDangerData = async () => {
      try {
        // 모든 구/동 목록 생성
        const allLocations: { gu: string; dong: string }[] = [];
        guDongData.forEach(gu => {
          gu.dongs.forEach(dong => {
            allLocations.push({ gu: gu.guName, dong: dong.id });
          });
        });

        // 벌크 API 호출 (배치 크기 제한)
        const batchSize = 50;
        const results: any[] = [];

        for (let i = 0; i < allLocations.length; i += batchSize) {
          const batch = allLocations.slice(i, i + batchSize);
          const response = await fetch('/api/safety-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locations: batch })
          });
          if (response.ok) {
            const batchResults = await response.json();
            results.push(...batchResults);
          }
        }

        // 데이터 매핑
        const dangerMap = new Map<string, number>();
        results.forEach((r: any) => {
          const key = `${r.gu}:${r.dong}`;
          dangerMap.set(key, r.danger || 3);
        });

        // guDongData 업데이트
        const updated = guDongData.map(gu => {
          const updatedDongs = gu.dongs.map(dong => {
            const key = `${gu.guName}:${dong.id}`;
            return { ...dong, danger: dangerMap.get(key) || dong.danger };
          });
          // 구의 danger는 동들의 평균
          const avgDanger = updatedDongs.length > 0
            ? Math.round(updatedDongs.reduce((sum, d) => sum + d.danger, 0) / updatedDongs.length)
            : gu.danger;
          return { ...gu, danger: avgDanger, dongs: updatedDongs };
        });

        setEnrichedData(updated);
      } catch (error) {
        console.error('위험도 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRealDangerData();
  }, []);

  const selectedGu: GuInfo | null =
    selectedGuId ? enrichedData.find((g) => g.guId === selectedGuId) ?? null : null;

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
        {loading ? (
          <div style={{ color: "#8a95a8", textAlign: "center", padding: 20 }}>위험도 로딩 중...</div>
        ) : (
          <LeftTab
            selectedGuId={selectedGuId}
            selectedDong={selectedDong}
            guDongData={enrichedData}
            onSelectGu={(id) => {
              setSelectedGuId(id);
              setSelectedDong(null);
            }}
            onSelectDong={(dong) => {
              setSelectedDong(dong);
              setSelectedGuId(
                enrichedData.find((g) => g.dongs.some((d) => d.id === dong.id))?.guId ?? null
              );
            }}
          />
        )}
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
            zones={enrichedData.map((g) => ({
              id: g.guId,
              name: g.guName,
              danger: g.danger,
            }))}
            onSelect={(id) => {
              setSelectedGuId(id);
              setSelectedDong(null);
            }}
            onRemoteSelect={(p) => {
              // 원격 좌표 선택 시: 가장 가까운 구를 거리로 선택
              const nearestGu = enrichedData
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
          guDongData={enrichedData}
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
