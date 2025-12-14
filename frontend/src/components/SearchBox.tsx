import React, { useMemo, useState } from "react";
import { GuInfo } from "../data/guDongData";

type Props = {
    zones: { id: string; name: string; danger: number }[];
    onSelect: (id: string) => void;
    onRemoteSelect?: (p: { name: string; lat: number; lng: number }) => void;
};

export default function SearchBox({ zones, onSelect, onRemoteSelect }: Props) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const [remote, setRemote] = useState<{ name: string; lat: number; lng: number } | null>(null);

    const results = useMemo(() => {
        const key = q.trim().toLowerCase();
        if (!key) return [];
        return zones.filter((z) => z.name.toLowerCase().includes(key)).slice(0, 6);
    }, [q, zones]);

    async function searchRemote(text: string) {
        try {
            const resp = await fetch(`http://localhost:3001/api/geocode?q=${encodeURIComponent(text)}`);
            if (!resp.ok) { setRemote(null); return; }
            const data = await resp.json();
            setRemote({ name: data.place_name || text, lat: data.lat, lng: data.lng });
        } catch {
            setRemote(null);
        }
    }

    return (
        <div style={{ width: 420, position: "relative" }}>
            <input
                className="input"
                placeholder="구 이름으로 검색..."
                value={q}
                onChange={(e) => {
                    const v = e.target.value;
                    setQ(v);
                    setOpen(true);
                    // 원격 지오코드 병행 (디바운스 생략: 간단 구현)
                    if (v.trim().length >= 2) {
                        searchRemote(v.trim());
                    } else {
                        setRemote(null);
                    }
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "#0d1b2f",
                    border: "1px solid #2b3b56",
                    color: "white",
                    fontSize: 15,
                }}
            />

            {open && (
                <div
                    className="card"
                    style={{
                        position: "absolute",
                        top: 50,
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        padding: 6,
                        background: "#0d1b2f",
                        borderRadius: 10,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                    }}
                >
                    {/* 원격(Kakao) 결과 한 줄 표시 */}
                    {remote && (
                        <div
                            onMouseDown={() => {
                                // 좌표 검색 결과 선택: 지도 이동은 부모가 처리해야 함
                                setQ(remote.name);
                                // onSelect를 zones id 기반으로 쓰는 구조라면, 지도 이동 로직을 상위에서 remote 좌표로 처리
                                onRemoteSelect && onRemoteSelect(remote);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                borderRadius: 8,
                                cursor: "pointer",
                                border: "1px solid transparent",
                                color: "white",
                                marginTop: 6,
                            }}
                            onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLDivElement).style.borderColor =
                                "#3b8cff")
                            }
                            onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLDivElement).style.borderColor =
                                "transparent")
                            }
                        >
                            <span
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    background: "#3b8cff",
                                }}
                            />
                            <div style={{ fontWeight: 600 }}>{remote.name}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function getColor(level: number) {
    if (level >= 4) return "#ff4d4f";
    if (level === 3) return "#ffa94d";
    if (level === 2) return "#ffe066";
    return "#69db7c";
}
