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
        case "A": return "#69db7c";
        case "B": return "#ffe066";
        case "C": return "#ffa94d";
        case "D": return "#ff4d4f";
        case "E": return "#c92a2a";
        default: return "#adb5bd";
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

    /**
     * safetyByDong 구조
     * {
     *   "역삼동": { grade: "D", danger: 4, gu: "강남구" }
     * }
     */
    const [safetyByDong, setSafetyByDong] = useState<Record<string, {
        grade: string;
        danger: number;
        gu: string;
    }>>({});

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
        fetch("/api/safety/seoul")
            .then((r) => r.json())
            .then((data) => {
                const map: Record<string, any> = {};
                data.forEach((d: any) => {
                    // d.dong === "역삼동" (법정동)
                    map[d.dong] = d;
                });
                setSafetyByDong(map);
            })
            .catch((e) => {
                console.error("서울 안전도 API 실패", e);
            });
    }, []);

    /* ---------------- 스타일 ---------------- */

    const styleFeature = useCallback((feature: any) => {
        const adminDong = feature?.properties?.ADM_NM || ""; // 역삼1동
        const legalDong = toLegalDong(adminDong);            // 역삼동
        const info = safetyByDong[legalDong];

        return {
            color: "#1b2332",
            weight: 0.6,
            fillColor: info ? colorByGrade(info.grade) : "#adb5bd",
            fillOpacity: 0.7,
        };
    }, [safetyByDong]);

    /* ---------------- 이벤트 ---------------- */

    const onEachFeature = useCallback((feature: any, layer: any) => {
        const adminDong = feature?.properties?.ADM_NM || "";
        const legalDong = toLegalDong(adminDong);
        const info = safetyByDong[legalDong];
        const entry = dongLookup.get(adminDong);

        const label = info
            ? `${info.gu} ${adminDong} · 등급 ${info.grade}`
            : adminDong;

        layer.bindTooltip(label);

        layer.on({
            click: () => {
                if (!entry) return;
                onSelectFromMap(entry.guId, entry.dong);
            },
            mouseover: () => layer.setStyle({ weight: 1.5 }),
            mouseout: () => geoJsonRef.current?.resetStyle(layer),
        });
    }, [safetyByDong, dongLookup, onSelectFromMap]);

    /* ---------------- 렌더 ---------------- */

    return (
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
                    data={dongGeoJson}
                    style={styleFeature}
                    onEachFeature={onEachFeature}
                    ref={geoJsonRef}
                />
            )}
        </MapContainer>
    );
}
