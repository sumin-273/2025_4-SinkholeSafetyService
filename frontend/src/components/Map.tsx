import { useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Circle,
    Tooltip,
    useMap,
    useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { DongInfo, GuInfo, GuWithDongs } from "../data/guDongData";
import "leaflet-heatmap";
// HeatmapOverlay is provided by leaflet-heatmap via global scope
declare const HeatmapOverlay: any;
import { fetchSafetyScores } from "../api";

type Props = {
    selectedGuId: string | null;
    selectedDong: DongInfo | null;
    onSelectFromMap: (guId: string | null, dong: DongInfo | null) => void;
    guDongData: GuWithDongs[];
};

const SEOUL_CENTER: LatLngExpression = [37.5665, 126.9780];

function getColor(level: number) {
    if (level >= 4) return "#ff4d4f";
    if (level === 3) return "#ffa94d";
    if (level === 2) return "#ffe066";
    return "#69db7c";
}

function colorByGrade(grade: string | null) {
    const g = String(grade || '').toUpperCase();
    if (g === 'D') return '#ff4d4f';
    if (g === 'C') return '#ffa94d';
    if (g === 'B') return '#ffe066';
    if (g === 'A') return '#69db7c';
    return '#69db7c';
}

// 구로 이동
function FlyToGu({ gu }: { gu: GuInfo | null }) {
    const map = useMap();
    useEffect(() => {
        if (!gu) return;
        map.flyTo([gu.lat, gu.lng], 13, { duration: 0.8 });
    }, [gu]);
    return null;
}

// 동으로 이동
function FlyToDong({ dong }: { dong: DongInfo | null }) {
    const map = useMap();
    useEffect(() => {
        if (!dong) return;
        map.flyTo([dong.lat, dong.lng], 15, { duration: 0.8 });
    }, [dong]);
    return null;
}

// 줌 감시
function ZoomWatcher({ setZoom }: { setZoom: (z: number) => void }) {
    const map = useMapEvents({
        zoomend: () => setZoom(map.getZoom()),
    });
    return null;
}

export default function MapView({
    selectedGuId,
    selectedDong,
    onSelectFromMap,
    guDongData,
}: Props) {
    const [zoom, setZoom] = useState(12);
    const [safety, setSafety] = useState<{ score: number; grade: string } | null>(null);
    const [showHeatmap, setShowHeatmap] = useState(false);
    // 등급 정보 팝업은 InfoPanel로 이동
    const selectedGu = selectedGuId
        ? guDongData.find((g) => g.guId === selectedGuId) ?? null
        : null;

    const showDongCircles = zoom >= 13;
    const [safetyCache, setSafetyCache] = useState<Record<string, { score: number; grade: string }>>({});

    // 선택 변경 시 안전도 API 호출
    useEffect(() => {
        const run = async () => {
            try {
                const guName = selectedGu?.guName || guDongData.find(g => g.dongs.some(d => d.id === selectedDong?.id))?.guName || "";
                const dongName = selectedDong?.id || "";
                if (!guName || !dongName) {
                    setSafety(null);
                    return;
                }
                const key = `${guName}:${dongName}`;
                if (safetyCache[key]) {
                    setSafety(safetyCache[key]);
                    return;
                }
                const data = await fetchSafetyScores(guName, dongName);
                const s = { score: Number(data.score) || 0, grade: String(data.grade || "-") };
                setSafety(s);
                setSafetyCache(prev => ({ ...prev, [key]: s }));
            } catch (e) {
                console.warn("safety API 호출 실패", e);
                setSafety(null);
            }
        };
        run();
    }, [selectedGu?.guName, selectedDong?.id]);

    // Prepare heatmap data (use dongs of selected gu if selected, else all)
    const heatmapData = useMemo(() => {
        const source = selectedGu ? selectedGu.dongs : guDongData.flatMap((g) => g.dongs);
        const points = source.map((d) => ({ lat: d.lat, lng: d.lng, value: d.danger }));
        return { max: 5, data: points };
    }, [selectedGu]);

    return (
        <MapContainer
            center={SEOUL_CENTER}
            zoom={12}
            style={{ width: "100%", height: "100%" }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <ZoomWatcher setZoom={setZoom} />

            <FlyToGu gu={selectedGu} />
            <FlyToDong dong={selectedDong} />

            {/* Heatmap toggle button */}
            <div
                style={{ position: "absolute", top: 70, left: 16, zIndex: 1000 }}
            >
                <button
                    onClick={() => setShowHeatmap((v) => !v)}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #2b3b56",
                        background: showHeatmap ? "#16355f" : "#0d1b2f",
                        color: "#cfd6e1",
                        cursor: "pointer",
                    }}
                >
                    {showHeatmap ? "히트맵 끄기" : "히트맵 켜기"}
                </button>
            </div>

            {/* Heatmap overlay */}
            {showHeatmap && (
                <HeatmapController data={heatmapData} />
            )}


            {/* 구 원 */}
            {
                !showDongCircles &&
                guDongData.map((gu) => (
                    <Circle
                        key={gu.guId}
                        center={[gu.lat, gu.lng]}
                        radius={1200 + gu.danger * 300}
                        color={getColor(gu.danger)}
                        fillColor={getColor(gu.danger)}
                        fillOpacity={0.45}
                        eventHandlers={{
                            click: () => onSelectFromMap(gu.guId, null),
                        }}
                    >
                        <Tooltip>
                            <div>{gu.guName}</div>
                            <div>위험도 {gu.danger}</div>
                        </Tooltip>
                    </Circle>
                ))
            }

            {/* 동 원 */}
            {
                showDongCircles &&
                guDongData.flatMap((g) =>
                    g.dongs.map((dong) => (
                        <Circle
                            key={dong.id}
                            center={[dong.lat, dong.lng]}
                            radius={
                                selectedGu && selectedDong && selectedGu.guId === g.guId && selectedDong.id === dong.id && safety
                                    ? 500 + (safety.score || 0) * 8
                                    : 450 + dong.danger * 200
                            }
                            color={
                                selectedGu && selectedDong && selectedGu.guId === g.guId && selectedDong.id === dong.id && safety
                                    ? colorByGrade(safety.grade)
                                    : getColor(dong.danger)
                            }
                            fillColor={
                                selectedGu && selectedDong && selectedGu.guId === g.guId && selectedDong.id === dong.id && safety
                                    ? colorByGrade(safety.grade)
                                    : getColor(dong.danger)
                            }
                            fillOpacity={0.55}
                            eventHandlers={{
                                click: () => onSelectFromMap(g.guId, dong),
                            }}
                        >
                            <Tooltip>
                                <div>{dong.id}</div>
                                <div>위험도 {dong.danger}</div>
                                {selectedGu && selectedDong && selectedGu.guId === g.guId && selectedDong.id === dong.id && safety ? (
                                    <div style={{ marginTop: 4 }}>
                                        실제 등급 {safety.grade} · 점수 {safety.score}
                                    </div>
                                ) : null}
                            </Tooltip>
                        </Circle>
                    ))
                )
            }
        </MapContainer >
    );
}

// Controller to integrate leaflet-heatmap with React Leaflet map
function HeatmapController({ data }: { data: { max: number; data: Array<{ lat: number; lng: number; value: number }> } }) {
    const map = useMap();
    useEffect(() => {
        const overlay = new HeatmapOverlay({
            radius: 25,
            maxOpacity: 0.6,
            scaleRadius: true,
            useLocalExtrema: false,
            latField: "lat",
            lngField: "lng",
            valueField: "value",
        });
        overlay.addTo(map);
        overlay.setData(data);
        return () => {
            try { overlay.remove(); } catch { /* ignore */ }
        };
    }, [map, data]);
    return null;
}
