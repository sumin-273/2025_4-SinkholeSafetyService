import React from "react";
import { Zone } from "../data/mockZones";

type Props = {
    zones: Zone[];
    selectedId: string | null;
    onSelect: (id: string) => void;
};

function getColor(level: number) {
    if (level >= 4) return "#ff4d4f";
    if (level === 3) return "#ffa94d";
    if (level === 2) return "#ffe066";
    return "#69db7c";
}

export default function LeftTab({ zones, selectedId, onSelect }: Props) {
    const sorted = [...zones].sort((a, b) => b.danger - a.danger);

    return (
        <div className="card" style={{ display: "grid", gap: 8 }}>
            <div className="section-title">서울시 위험 구</div>

            {sorted.map((z) => {
                const active = z.id === selectedId;
                const color = getColor(z.danger);

                return (
                    <button
                        key={z.id}
                        onClick={() => onSelect(z.id)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: `1px solid ${active ? "#3b8cff" : "#1b2332"}`,
                            background: active ? "#0d1b2f" : "#0c1220",
                            color: "inherit",
                            cursor: "pointer",
                        }}
                    >
                        <span
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: 99,
                                background: color,
                            }}
                        />
                        <span style={{ fontWeight: 600 }}>{z.name}</span>
                        <span style={{ color: "#8aa0b5", fontSize: 13 }}>
                            위험도 {z.danger}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
