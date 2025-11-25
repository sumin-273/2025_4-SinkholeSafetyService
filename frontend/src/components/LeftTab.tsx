import React, { useState } from "react";
import { guDongData, DongInfo } from "../data/guDongData";

type Props = {
    selectedGuId: string | null;
    selectedDong: DongInfo | null;
    onSelectGu: (id: string) => void;
    onSelectDong: (dong: DongInfo) => void;
};

function getColor(level: number) {
    if (level >= 4) return "#ff4d4f";
    if (level === 3) return "#ffa94d";
    if (level === 2) return "#ffe066";
    return "#69db7c";
}

export default function LeftTab({ selectedGuId, selectedDong, onSelectGu, onSelectDong }: Props) {
    const [openGuId, setOpenGuId] = useState<string | null>(null);

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <h1 className="section-title" style={{ color: "white" }}>싱크홀 안전도 서비스</h1>

            {guDongData.map((gu) => {
                const isActive = gu.guId === selectedGuId;
                const isOpened = openGuId === gu.guId;

                return (
                    <div key={gu.guId}>
                        <button
                            onClick={() => {
                                onSelectGu(gu.guId);
                                setOpenGuId(isOpened ? null : gu.guId);
                            }}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: `1px solid ${isActive ? "#3b8cff" : "#1b2332"}`,
                                background: isActive ? "#0d1b2f" : "#0c1220",
                                color: "white",
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span
                                    style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: "50%",
                                        background: getColor(gu.danger),
                                    }}
                                />
                                <span style={{ fontWeight: 600 }}>{gu.guName}</span>
                            </div>
                            <span style={{ color: "#ccc" }}>위험도 {gu.danger}</span>
                        </button>

                        {isOpened && (
                            <div style={{ marginLeft: 20, marginTop: 6, display: "grid", gap: 6 }}>
                                {gu.dongs.map((dong) => {
                                    const dongActive = selectedDong?.id === dong.id;
                                    return (
                                        <button
                                            key={dong.id}
                                            onClick={() => onSelectDong(dong)}
                                            style={{
                                                padding: "6px 10px",
                                                borderRadius: 8,
                                                border: "1px solid #1b2332",
                                                background: dongActive ? "#112233" : "#0c1220",
                                                color: "white",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <span>{dong.id}</span>
                                            <span style={{ color: "#ccc" }}>위험도 {dong.danger}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
