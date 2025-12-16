import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    GeoJSON,
    useMap,
} from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression, GeoJSON as LeafletGeoJSON } from "leaflet";
import { DongInfo, GuInfo, GuWithDongs } from "../data/guDongData";
import { fetchSafetyScores, fetchSafetyEvaluation } from "../api";
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
    if (g === 'A') return '#69db7c';  // 초록색 - 안전
    if (g === 'B') return '#ffe066';  // 노란색 - 주의
    if (g === 'C') return '#ffa94d';  // 주황색 - 위험
    if (g === 'D') return '#ff4d4f';  // 빨간색 - 위험
    if (g === 'E') return '#c92a2a';  // 짙은 빨간색 - 매우 위험
    return '#69db7c';  // 기본값: 안전
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
    const [evaluationCache, setEvaluationCache] = useState<Record<string, { score: number; grade: string; evaluateGrade: string }>>({});
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

    // 지도 로드 후 모든 동의 안전도 데이터를 한 번에 가져옴
    useEffect(() => {
        const loadAllDongSafety = async () => {
            if (!dongLookup || dongLookup.size === 0) return;

            const newEvaluationCache: Record<string, any> = {};
            const newSafetyCache: Record<string, any> = {};

            // 모든 동에 대해 평가/사고 데이터 조회
            const dongEntries = Array.from(dongLookup.entries());
            for (let i = 0; i < dongEntries.length; i++) {
                const [dongName, { dong, guId }] = dongEntries[i];  // dongName이 실제 지역명
                const guName = guNameById.get(guId) || "";

                try {
                    // 먼저 평가 데이터 시도
                    const evalRes = await fetch(`/api/safety/evalution?gu=${encodeURIComponent(guName)}&dong=${encodeURIComponent(dongName)}`);
                    if (evalRes.ok) {
                        const evalData = await evalRes.json();
                        newEvaluationCache[dongName] = {
                            score: evalData.score,
                            grade: evalData.grade,
                            evaluateGrade: evalData.evaluateGrade,
                        };
                        continue;
                    }
                } catch (e) {
                    console.warn(`평가 데이터 조회 실패: ${guName} ${dongName}`, e);
                }

                // 평가 데이터가 없으면 사고 데이터 시도
                try {
                    const safetyRes = await fetch(`/api/safety?gu=${encodeURIComponent(guName)}&dong=${encodeURIComponent(dongName)}`);
                    if (safetyRes.ok) {
                        const safetyData = await safetyRes.json();
                        newSafetyCache[dongName] = {
                            score: safetyData.score,
                            grade: safetyData.grade,
                        };
                    }
                } catch (e) {
                    console.warn(`사고 데이터 조회 실패: ${guName} ${dongName}`, e);
                }
            }

            console.log("평가 캐시:", newEvaluationCache);
            console.log("사고 캐시:", newSafetyCache);
            setEvaluationCache(newEvaluationCache);
            setSafetyCache(newSafetyCache);
        };

        loadAllDongSafety();
    }, [dongLookup, guNameById]);

    // Removed unused safety API calls

    const styleFeature = useCallback((feature: any) => {
        const name = feature?.properties?.ADM_NM || "";
        // 평가 데이터 우선, 없으면 기존 안전 데이터 사용
        const evaluation = evaluationCache[name];
        const safety = safetyApiBlocked ? undefined : safetyCache[name];
        const useData = evaluation || safety;
        const danger = dangerByDong.get(name) ?? 3;
        const color = useData ? colorByGrade(useData.grade) : getColor(danger);
        return {
            color: "#1b2332",
            weight: 0.6,
            fillColor: color,
            fillOpacity: 0.65,
        };
    }, [dangerByDong, safetyCache, evaluationCache, safetyApiBlocked]);

    const onEachFeature = useCallback((feature: any, layer: any) => {
        const name = feature?.properties?.ADM_NM || "";
        const entry = dongLookup.get(name);
        const guName = entry ? guNameById.get(entry.guId) || "" : "";
        const key = name;
        // 평가 데이터 우선, 없으면 기존 안전 데이터 사용
        const evaluation = evaluationCache[key];
        const safety = safetyApiBlocked ? undefined : safetyCache[key];
        const useData = evaluation || safety;
        const danger = dangerByDong.get(name) ?? 3;
        let label: string;
        if (useData) {
            if (evaluation) {
                label = `${guName ? `${guName} ` : ""}${name} · [평가] 등급 ${evaluation.grade} · 점수 ${evaluation.score} · (${evaluation.evaluateGrade})`;
            } else if (safety) {
                label = `${guName ? `${guName} ` : ""}${name} · [사고] 등급 ${safety.grade} · 점수 ${safety.score}`;
            } else {
                label = `${guName ? `${guName} ` : ""}${name}`;
            }
        } else {
            label = `${guName ? `${guName} ` : ""}${name} · 위험도 ${danger}`;
        }
        layer.bindTooltip(label);

        layer.on({
            click: () => {
                if (!entry) return;
                onSelectFromMap(entry.guId, entry.dong);
            },
            mouseover: () => {
                try {
                    // only emphasize border; keep fillColor and fillOpacity unchanged
                    layer.setStyle && layer.setStyle({ weight: 1.2 });
                } catch (e) {
                    // ignore
                }
            },
            mouseout: () => {
                geoJsonRef.current?.resetStyle(layer);
            },
        });
    }, [dangerByDong, dongLookup, guNameById, onSelectFromMap, safetyCache, safetyApiBlocked, evaluationCache]);

    useEffect(() => {
        if (!geoJsonRef.current) return;
        // reset polygon styles
        geoJsonRef.current.resetStyle();

        // rebind tooltips so they reflect updated caches
        try {
            // @ts-ignore - eachLayer exists on GeoJSON
            geoJsonRef.current.eachLayer((layer: any) => {
                const feature = layer.feature;
                const name = feature?.properties?.ADM_NM || "";
                const entry = dongLookup.get(name);
                const guName = entry ? guNameById.get(entry.guId) || "" : "";
                const evaluation = evaluationCache[name];
                const safety = safetyApiBlocked ? undefined : safetyCache[name];
                const useData = evaluation || safety;
                const danger = dangerByDong.get(name) ?? 3;
                let label: string;
                if (useData) {
                    if (evaluation) {
                        label = `${guName ? `${guName} ` : ""}${name} · [평가] 등급 ${evaluation.grade} · 점수 ${evaluation.score} · (${evaluation.evaluateGrade})`;
                    } else if (safety) {
                        label = `${guName ? `${guName} ` : ""}${name} · [사고] 등급 ${safety.grade} · 점수 ${safety.score}`;
                    } else {
                        label = `${guName ? `${guName} ` : ""}${name}`;
                    }
                } else {
                    label = `${guName ? `${guName} ` : ""}${name} · 위험도 ${danger}`;
                }
                try {
                    layer.unbindTooltip();
                    layer.bindTooltip(label);
                } catch (e) {
                    // ignore layers that don't support tooltips
                }

                // 강제 스타일 갱신 (fillColor 적용)
                try {
                    const fillColor = useData ? colorByGrade(useData.grade) : getColor(danger);
                    layer.setStyle && layer.setStyle({ fillColor });

                    // rebind pointer handlers so they use current cache values
                    try {
                        // remove previous handlers
                        layer.off && layer.off('mouseover');
                        layer.off && layer.off('mouseout');
                        layer.off && layer.off('click');

                        const currentFill = fillColor;
                        layer.on && layer.on({
                            click: () => {
                                if (!entry) return;
                                onSelectFromMap(entry.guId, entry.dong);
                            },
                            mouseover: () => {
                                try {
                                    console.debug("layer mouseover", name, currentFill);
                                    layer.setStyle && layer.setStyle({ weight: 1.2, fillColor: currentFill });
                                } catch (e) { }
                            },
                            mouseout: () => {
                                try {
                                    console.debug("layer mouseout", name, currentFill);
                                    layer.setStyle && layer.setStyle({ weight: 0.6, fillOpacity: 0.65, fillColor: currentFill });
                                } catch (e) {
                                    geoJsonRef.current?.resetStyle(layer);
                                }
                            },
                        });
                    } catch (e) {
                        // ignore event binding errors
                    }
                } catch (e) {
                    // some layers may not support setStyle
                }
            });
        } catch (e) {
            console.warn("툴팁 갱신 실패", e);
        }
    }, [safetyCache, evaluationCache, styleFeature, dangerByDong, dongLookup, guNameById, safetyApiBlocked]);

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
