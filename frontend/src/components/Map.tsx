import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    GeoJSON,
    useMap,
} from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression, GeoJSON as LeafletGeoJSON } from "leaflet";
import { DongInfo, GuInfo, GuWithDongs } from "../data/guDongData";

/* ---------------- 기본 설정 ---------------- */

type Props = {
    selectedGuId: string | null;
    selectedDong: DongInfo | null;
    onSelectFromMap: (guId: string | null, dong: DongInfo | null) => void;
    guDongData: GuWithDongs[];
};

const SEOUL_CENTER: LatLngExpression = [37.5665, 126.9780];
const SEOUL_BOUNDS: LatLngBoundsExpression = [
    [37.38, 126.76],
    [37.72, 127.19],
];

/* ---------------- 유틸 ---------------- */

// 행정동 → 법정동 변환
// 예: "역삼1동" → "역삼동"
function toLegalDong(adminDong: string) {
    return adminDong.replace(/[0-9]/g, "");
}

function colorByGrade(grade: string) {
    switch (grade) {
        case "A": return "#69db7c";  // 초록 (안전)
        case "B": return "#ffe066";  // 노랑
        case "C": return "#ffa94d";  // 주황
        case "D": return "#ff4d4f";  // 빨강
        default: return "#69db7c";   // 기본값도 A등급 (초록)
    }
}

/* ---------------- 이동 컴포넌트 ---------------- */

function FlyToGu({ gu }: { gu: GuInfo | null }) {
    const map = useMap();
    useEffect(() => {
        if (gu) map.flyTo([gu.lat, gu.lng], 13, { duration: 0.8 });
    }, [gu]);
    return null;
}

function FlyToDong({ dong }: { dong: DongInfo | null }) {
    const map = useMap();
    useEffect(() => {
        if (dong) map.flyTo([dong.lat, dong.lng], 15, { duration: 0.8 });
    }, [dong]);
    return null;
}

/* ================== 메인 ================== */

export default function MapView({
    selectedGuId,
    selectedDong,
    onSelectFromMap,
    guDongData,
}: Props) {
    const [dongGeoJson, setDongGeoJson] = useState<any | null>(null);
    const [safetyByDong, setSafetyByDong] = useState<Record<string, {
        grade: string;
        danger: number;
        gu: string;
        accidentCount: number;
    }>>({});
    const [isLoading, setIsLoading] = useState(true);

    const geoJsonRef = useRef<LeafletGeoJSON | null>(null);

    const selectedGu = selectedGuId
        ? guDongData.find((g) => g.guId === selectedGuId) ?? null
        : null;

    /* ---------------- 동 룩업 ---------------- */

    const dongLookup = useMemo(() => {
        const map = new Map<string, { dong: DongInfo; guId: string }>();
        guDongData.forEach((g) =>
            g.dongs.forEach((d) => map.set(d.id, { dong: d, guId: g.guId }))
        );
        return map;
    }, [guDongData]);

    /* ---------------- GeoJSON 로드 ---------------- */

    useEffect(() => {
        fetch("/dong-polygons.json")
            .then((r) => r.json())
            .then(setDongGeoJson)
            .catch(console.error);
    }, []);

    /* ---------------- 서울 전체 안전도 API ---------------- */

    useEffect(() => {
        console.log("🔍 서울 안전도 데이터 로딩 중...");
        setIsLoading(true);

        fetch("/api/safety/seoul")
            .then((r) => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}`);
                }
                return r.json();
            })
            .then((response) => {
                console.log("✅ API 응답:", response);

                const data = response.data || [];
                const map: Record<string, any> = {};
                data.forEach((item: any) => {
                    map[item.dong] = {
                        grade: item.grade,
                        danger: item.danger,
                        gu: item.gu,
                        accidentCount: item.accidentCount,
                    };
                });

                console.log(" 처리된 안전도 데이터:", map);
                setSafetyByDong(map);
                setIsLoading(false);
            })
            .catch((e) => {
                console.error(" 서울 안전도 API 실패:", e);
                setIsLoading(false);
            });
    }, []);

    /* ---------------- 스타일 함수 ---------------- */

    const getFeatureStyle = useCallback((adminDong: string, isHover: boolean = false) => {
        const legalDong = toLegalDong(adminDong);
        const info = safetyByDong[legalDong];
        const gradeToUse = info ? info.grade : "A";

        return {
            color: "#1b2332",
            weight: isHover ? 2 : 0.6,  // hover 시 테두리 두껍게
            fillColor: colorByGrade(gradeToUse),
            fillOpacity: 0.7,
        };
    }, [safetyByDong]);

    const styleFeature = useCallback((feature: any) => {
        const adminDong = feature?.properties?.ADM_NM || "";
        return getFeatureStyle(adminDong, false);
    }, [getFeatureStyle]);

    /* ---------------- 이벤트  ---------------- */

    const onEachFeature = useCallback((feature: any, layer: any) => {
        const adminDong = feature?.properties?.ADM_NM || "";
        const legalDong = toLegalDong(adminDong);
        const info = safetyByDong[legalDong];
        const entry = dongLookup.get(adminDong);

        const label = info
            ? `${info.gu} ${adminDong} · ${info.grade}등급 (사고 ${info.accidentCount}건)`
            : `${adminDong} · A등급 (사고 0건)`;

        layer.bindTooltip(label);

        layer.on({
            click: () => {
                if (!entry) return;
                onSelectFromMap(entry.guId, entry.dong);
            },
            mouseover: () => {
                // hover 스타일 적용
                layer.setStyle(getFeatureStyle(adminDong, true));
            },
            mouseout: () => {
                // 원래 스타일로 복원
                layer.setStyle(getFeatureStyle(adminDong, false));
            },
        });
    }, [safetyByDong, dongLookup, onSelectFromMap, getFeatureStyle]);

    /* ---------------- GeoJSON 업데이트 ---------------- */

    useEffect(() => {
        if (geoJsonRef.current && Object.keys(safetyByDong).length > 0) {
            // 데이터가 로드되면 모든 레이어의 스타일 재적용
            geoJsonRef.current.eachLayer((layer: any) => {
                const feature = layer.feature;
                if (feature) {
                    const adminDong = feature.properties?.ADM_NM || "";
                    layer.setStyle(getFeatureStyle(adminDong, false));
                }
            });
        }
    }, [safetyByDong, getFeatureStyle]);

    /* ---------------- 렌더 ---------------- */

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {/* 로딩 표시 */}
            {isLoading && (
                <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1000,
                    background: "white",
                    padding: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                }}>
                    안전도 데이터 로딩 중...
                </div>
            )}

            <MapContainer
                center={SEOUL_CENTER}
                zoom={12}
                minZoom={12}
                maxZoom={18}
                maxBounds={SEOUL_BOUNDS}
                style={{ width: "100%", height: "100%" }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <FlyToGu gu={selectedGu} />
                <FlyToDong dong={selectedDong} />

                {dongGeoJson && (
                    <GeoJSON
                        key={JSON.stringify(safetyByDong)}  // 데이터 변경 시 재렌더링
                        data={dongGeoJson}
                        style={styleFeature}
                        onEachFeature={onEachFeature}
                        ref={geoJsonRef}
                    />
                )}
            </MapContainer>


        </div>
    );
}