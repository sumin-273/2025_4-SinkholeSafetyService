import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    GeoJSON,
    useMap,
} from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression, GeoJSON as LeafletGeoJSON } from "leaflet";
import { DongInfo, GuInfo, GuWithDongs } from "../data/guDongData";
import { fetchSafetyScores } from "../api";
// heatmap 제거됨

type Props = {
    selectedGuId: string | null;
    selectedDong: DongInfo | null;
    onSelectFromMap: (guId: string | null, dong: DongInfo | null) => void;
    guDongData: GuWithDongs[];
};

const SEOUL_CENTER: LatLngExpression = [37.5665, 126.9780];
const SEOUL_BOUNDS: LatLngBoundsExpression = [
    [37.38, 126.76], // 남서 (서울 외곽만 포함)
    [37.72, 127.19], // 북동
];

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

export default function MapView({
    selectedGuId,
    selectedDong,
    onSelectFromMap,
    guDongData,
}: Props) {
    const [dongGeoJson, setDongGeoJson] = useState<any | null>(null);
    const [safetyCache, setSafetyCache] = useState<Record<string, { score: number; grade: string }>>({});
    const [safetyApiBlocked, setSafetyApiBlocked] = useState(false);
    const geoJsonRef = useRef<LeafletGeoJSON | null>(null);
    // 등급 정보 팝업은 InfoPanel로 이동
    const selectedGu = selectedGuId
        ? guDongData.find((g) => g.guId === selectedGuId) ?? null
        : null;

    // 동 위험도 맵 (이름→danger)
    const dangerByDong = useMemo(() => {
        const map = new Map<string, number>();
        guDongData.forEach((g) => g.dongs.forEach((d) => map.set(d.id, d.danger)));
        return map;
    }, [guDongData]);

    // 동 룩업 (이름→동/구)
    const dongLookup = useMemo(() => {
        const map = new Map<string, { dong: DongInfo; guId: string }>();
        guDongData.forEach((g) => g.dongs.forEach((d) => map.set(d.id, { dong: d, guId: g.guId })));
        return map;
    }, [guDongData]);

    // 구 ID→구 이름 맵
    const guNameById = useMemo(() => {
        const map = new Map<string, string>();
        guDongData.forEach((g) => map.set(g.guId, g.guName));
        return map;
    }, [guDongData]);

    // 동 경계 GeoJSON 로드
    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            try {
                const res = await fetch("/dong-polygons.json", { signal: controller.signal });
                if (!res.ok) throw new Error(`geojson load failed: ${res.status}`);
                const json = await res.json();
                setDongGeoJson(json);
            } catch (e) {
                if (!controller.signal.aborted) console.warn("동 경계 로드 실패", e);
            }
        };
        load();
        return () => controller.abort();
    }, []);

    // Removed unused safety API calls

    const styleFeature = useCallback((feature: any) => {
        const name = feature?.properties?.ADM_NM || "";
        const safety = safetyApiBlocked ? undefined : safetyCache[name];
        const danger = dangerByDong.get(name) ?? 3;
        const color = safety ? colorByGrade(safety.grade) : getColor(danger);
        return {
            color: "#1b2332",
            weight: 0.6,
            fillColor: color,
            fillOpacity: 0.65,
        };
    }, [dangerByDong, safetyCache, safetyApiBlocked]);

    const onEachFeature = useCallback((feature: any, layer: any) => {
        const name = feature?.properties?.ADM_NM || "";
        const entry = dongLookup.get(name);
        const guName = entry ? guNameById.get(entry.guId) || "" : "";
        const key = name;
        const safety = safetyApiBlocked ? undefined : safetyCache[key];
        const danger = dangerByDong.get(name) ?? 3;
        const label = safety
            ? `${guName ? `${guName} ` : ""}${name} · 등급 ${safety.grade} · 점수 ${safety.score}`
            : `${guName ? `${guName} ` : ""}${name} · 위험도 ${danger}`;
        layer.bindTooltip(label);

        const ensureSafety = async () => {
            if (!entry || safetyCache[key] || safetyApiBlocked) return;
            try {
                const data = await fetchSafetyScores(guName, name);
                const next = { score: Number(data.score) || 0, grade: String(data.grade || "-") };
                setSafetyCache((prev) => prev[key] ? prev : { ...prev, [key]: next });
                geoJsonRef.current?.resetStyle(layer);
            } catch (e) {
                console.warn("safety API 호출 실패", e);
                setSafetyApiBlocked(true);
            }
        };
        ensureSafety();

        layer.on({
            click: () => {
                if (!entry) return;
                onSelectFromMap(entry.guId, entry.dong);
            },
            mouseover: () => {
                layer.setStyle({ weight: 1.2, fillOpacity: 0.78 });
            },
            mouseout: () => {
                geoJsonRef.current?.resetStyle(layer);
            },
        });
    }, [dangerByDong, dongLookup, guNameById, onSelectFromMap, safetyCache, safetyApiBlocked]);

    useEffect(() => {
        if (geoJsonRef.current) {
            geoJsonRef.current.resetStyle();
        }
    }, [safetyCache, styleFeature]);

    return (
        <MapContainer
            center={SEOUL_CENTER}
            zoom={12}
            minZoom={12}
            maxZoom={18}
            maxBounds={SEOUL_BOUNDS}
            maxBoundsViscosity={0.8}
            style={{ width: "100%", height: "100%" }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyToGu gu={selectedGu} />
            <FlyToDong dong={selectedDong} />

            {/* 동 폴리곤 */}
            {dongGeoJson && (
                <GeoJSON
                    data={dongGeoJson as any}
                    style={styleFeature}
                    onEachFeature={onEachFeature}
                    ref={geoJsonRef}
                />
            )}


            {/* 범례 */}
            <div
                style={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    padding: "10px 12px",
                    background: "#0c1220",
                    border: "1px solid #1b2332",
                    borderRadius: 10,
                    color: "#cfd6e1",
                    fontSize: 12,
                    zIndex: 1000,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>위험도 범례</div>
                {[1, 2, 3, 4, 5].map((d) => (
                    <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 14, height: 14, borderRadius: "50%", background: getColor(d) }} />
                        <span>위험도 {d}</span>
                    </div>
                ))}
            </div>
        </MapContainer >
    );
}
