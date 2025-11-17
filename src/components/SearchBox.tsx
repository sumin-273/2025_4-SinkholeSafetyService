import React, { useMemo, useState } from "react";
import { Zone } from "../data/mockZones";

type Props = {
    zones: Zone[];
    onSelect: (id: string) => void;
};

export default function SearchBox({ zones, onSelect }: Props) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);

    const results = useMemo(() => {
        const key = q.trim().toLowerCase();
        if (!key) return [];
        return zones.filter((z) => z.name.toLowerCase().includes(key)).slice(0, 6);
    }, [q, zones]);

    return (
        <div style={{ width: 520, position: "relative" }}>
            <input
                className="input"
                placeholder="구 이름으로 검색..."
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && results.length > 0 && (
                <div
                    className="card"
                    style={{
                        position: "absolute",
                        top: 46,
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        padding: 6,
                    }}
                >
                    {results.map((z) => (
                        <div
                            key={z.id}
                            onMouseDown={() => {
                                onSelect(z.id);
                                setQ(z.name);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 10px",
                                borderRadius: 8,
                                cursor: "pointer",
                                border: "1px solid transparent",
                            }}
                            onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLDivElement).style.borderColor =
                                "#2b3b56")
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
                                    borderRadius: 99,
                                    background: getColor(z.danger),
                                }}
                            />
                            <div style={{ fontWeight: 600 }}>{z.name}</div>
                            <div style={{ marginLeft: "auto", color: "#8aa0b5" }}>
                                위험도 {z.danger}
                            </div>
                        </div>
                    ))}
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
