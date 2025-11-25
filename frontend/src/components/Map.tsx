import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Circle,
    Tooltip,
    useMap,
    useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { guDongData, DongInfo, GuInfo } from "../data/guDongData";

type Props = {
    selectedGuId: string | null;
    selectedDong: DongInfo | null;
    onSelectFromMap: (guId: string | null, dong: DongInfo | null) => void;
};

const SEOUL_CENTER: LatLngExpression = [37.5665, 126.9780];

function getColor(level: number) {
    if (level >= 4) return "#ff4d4f";
    if (level === 3) return "#ffa94d";
    if (level === 2) return "#ffe066";
    return "#69db7c";
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
}: Props) {
    const [zoom, setZoom] = useState(12);
    const selectedGu = selectedGuId
        ? guDongData.find((g) => g.guId === selectedGuId) ?? null
        : null;

    const showDongCircles = zoom >= 13;

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

            {/* 구 원 */}
            {!showDongCircles &&
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
                ))}

            {/* 동 원 */}
            {showDongCircles &&
                guDongData.flatMap((g) =>
                    g.dongs.map((dong) => (
                        <Circle
                            key={dong.id}
                            center={[dong.lat, dong.lng]}
                            radius={450 + dong.danger * 200}
                            color={getColor(dong.danger)}
                            fillColor={getColor(dong.danger)}
                            fillOpacity={0.55}
                            eventHandlers={{
                                click: () => onSelectFromMap(g.guId, dong),
                            }}
                        >
                            <Tooltip>
                                <div>{dong.id}</div>
                                <div>위험도 {dong.danger}</div>
                            </Tooltip>
                        </Circle>
                    ))
                )}
        </MapContainer>
    );
}
