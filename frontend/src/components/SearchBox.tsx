import React, { useMemo, useState } from "react";
import { GuInfo } from "../data/guDongData";

type Props = {
    zones: { id: string; name: string; danger: number }[];
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
        <div style={{ width: 420, position: "relative" }}>
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

            {open && results.length > 0 && (
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
