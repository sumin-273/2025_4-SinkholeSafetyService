import React, { useMemo, useState } from "react";
import { GuInfo } from "../data/guDongData";

// 환경변수에서 API URL 가져오기
const API_BASE = process.env.REACT_APP_API_BASE || '';

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
            // ← 환경변수 사용
            const resp = await fetch(`${API_BASE}/api/geocode?q=${encodeURIComponent(text)}`);
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

            {open && (results.length > 0 || remote) && (
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
                    {/* 로컬 구 목록 결과 */}
                    {results.map((z) => (
                        <div
                            key={z.id}
                            onMouseDown={() => {
                                setQ(z.name);
                                onSelect(z.id);
                                setOpen(false);
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
                                    background: getColor(z.danger),
                                }}
                            />
                            <div style={{ fontWeight: 600 }}>{z.name}</div>
                        </div>
                    ))}

                    {/* 원격(Kakao) 결과 한 줄 표시 */}
                    {remote && results.length === 0 && (
                        <div
                            onMouseDown={() => {
                                setQ(remote.name);
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