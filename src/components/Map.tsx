import { useState, useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    Circle,
    Tooltip,
    useMap,
    useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { Zone } from "../data/mockZones";

type Props = {
    zones: Zone[];
    selectedId: string | null;
    onSelect: (id: string) => void;
};

// ✅ 서울 중심
const SEOUL_CENTER: LatLngExpression = [37.5665, 126.9780];

// ✅ 위험도별 색상 함수
function getColor(level: number) {
    if (level >= 4) return "#ff4d4f"; // 매우 위험
    if (level === 3) return "#ffa94d"; // 주의
    if (level === 2) return "#ffe066"; // 관심
    return "#69db7c"; // 안전
}

// ✅ 지도 줌 감시
function ZoomWatcher({ setZoom }: { setZoom: (z: number) => void }) {
    const map = useMapEvents({
        zoomend: () => setZoom(map.getZoom()),
    });
    return null;
}

// ✅ 선택된 구로 부드럽게 이동
function FlyToZone({ zone }: { zone: Zone | null }) {
    const map = useMap();
    useEffect(() => {
        if (!zone) return;
        map.flyTo([zone.lat, zone.lng], 13, { duration: 0.8 });
    }, [zone, map]);
    return null;
}

export default function MapView({ zones, selectedId, onSelect }: Props) {
    const [zoom, setZoom] = useState(12);
    const selectedZone = zones.find((z) => z.id === selectedId) ?? null;

    // ✅ 줌 비율에 따른 반경 스케일 계산
    const getZoomScale = (z: number) => {
        // zoom 값(11~15)에 따라 비율 다르게
        if (z <= 11) return 2.0;   // 많이 축소 → 크게 표시
        if (z === 12) return 1.6;
        if (z === 13) return 1.2;
        if (z === 14) return 0.8;
        if (z >= 15) return 0.5;   // 많이 확대 → 작게 표시
        return 1.0;
    };

    const zoomScale = getZoomScale(zoom);

    return (
        <MapContainer
            center={SEOUL_CENTER}
            zoom={12}
            minZoom={11}
            maxZoom={15}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom
        >
            {/* 지도 타일 */}
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* 줌 이벤트 감시 */}
            <ZoomWatcher setZoom={setZoom} />

            {/* 선택된 구로 이동 */}
            <FlyToZone zone={selectedZone} />

            {/* ✅ 구 단위 원(circle) 표시 */}
            {zones.map((z) => {
                const color = getColor(z.danger);
                const isSelected = z.id === selectedId;

                // ✅ 기본 반경(m) + 위험도 기반
                const baseRadius = 1200 + z.danger * 300;

                // ✅ 줌 스케일 적용
                const radiusMeters = baseRadius * zoomScale;

                return (
                    <Circle
                        key={z.id}
                        center={[z.lat, z.lng]}
                        radius={radiusMeters}
                        color={color}
                        fillColor={color}
                        fillOpacity={isSelected ? 0.55 : 0.35}
                        weight={isSelected ? 3 : 1.5}
                        eventHandlers={{
                            click: () => onSelect(z.id),
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                            <div style={{ fontWeight: 600 }}>{z.name}</div>
                            <div>위험도: {z.danger}단계</div>
                        </Tooltip>
                    </Circle>
                );
            })}
        </MapContainer>
    );
}
