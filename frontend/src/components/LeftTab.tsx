import React, { useEffect, useMemo, useState } from "react";
import { DongInfo, GuWithDongs } from "../data/guDongData";

type Props = {
    selectedGuId: string | null;
    selectedDong: DongInfo | null;
    onSelectGu: (id: string) => void;
    onSelectDong: (dong: DongInfo) => void;
    guDongData: GuWithDongs[];
};

/* 🔴 Map과 동일한 색상 기준 */
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

/* 🔴 동 이름 정규화 (역삼1동 → 역삼동) */
function normalizeDongName(name: string) {
    return name.replace(/[0-9]/g, "");
}

export default function LeftTab({
    selectedGuId,
    selectedDong,
    onSelectGu,
    onSelectDong,
    guDongData,
}: Props) {
    const [openGuId, setOpenGuId] = useState<string | null>(null);

    /* ✅ API 기반 안전도 데이터 */
    const [safetyByDong, setSafetyByDong] = useState<Record<string, {
        grade: string;
        danger: number;
        gu: string;
    }>>({});

    /* ✅ 서울 전체 안전도 API 단 1회 호출 */
    useEffect(() => {
        fetch("/api/safety/seoul")
            .then((r) => r.json())
            .then((data) => {
                const map: any = {};
                data.forEach((d: any) => {
                    map[d.dong] = d; // key: 역삼동
                });
                setSafetyByDong(map);
            })
            .catch(console.error);
    }, []);

    return (
        <div style={{ display: "grid", gap: 12, height: "100vh" }}>
            <h1 className="section-title" style={{ color: "white" }}>
                싱크홀 안전도 서비스
            </h1>

            <div style={{ overflowY: "auto", paddingRight: 6 }}>
                {guDongData.map((gu) => {
                    const isActive = gu.guId === selectedGuId;
                    const isOpened = openGuId === gu.guId;

                    return (
                        <div key={gu.guId}>
                            {/* 구 버튼 */}
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
                                <span style={{ fontWeight: 600 }}>{gu.guName}</span>
                            </button>

                            {/* 동 리스트 */}
                            {isOpened && (
                                <div style={{ marginLeft: 20, marginTop: 6, display: "grid", gap: 6 }}>
                                    {gu.dongs.map((dong) => {
                                        const dongActive = selectedDong?.id === dong.id;

                                        const apiKey = normalizeDongName(dong.id);
                                        const info = safetyByDong[apiKey];

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

                                                {info ? (
                                                    <span
                                                        style={{
                                                            color: colorByGrade(info.grade),
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {info.grade}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#888" }}>–</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
