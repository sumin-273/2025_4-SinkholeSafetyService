import React, { useEffect, useMemo, useState } from "react";
import { GuInfo, DongInfo } from "../data/guDongData";

type Props = {
    gu: GuInfo | null;
    dong: DongInfo | null;
};

type SafetyItem = {
    gu: string;
    dong: string;
    grade: string;
    danger: number;
    score: number;
    accidentCount: number;
};

/* ---------------- 공통 유틸 ---------------- */

function normalizeDongName(name: string) {
    return name.replace(/[0-9]/g, "");
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

/* ---------------- 컴포넌트 ---------------- */

export default function InfoPanel({ gu, dong }: Props) {
    const [safetyMap, setSafetyMap] = useState<Record<string, SafetyItem>>({});
    const [loading, setLoading] = useState(false);
    const [showGradeInfo, setShowGradeInfo] = useState(false);

    /* ✅ 서울 전체 안전도 API 단 1회 호출 */
    useEffect(() => {
        setLoading(true);
        fetch("/api/safety/seoul")
            .then((r) => r.json())
            .then((data: SafetyItem[]) => {
                const map: Record<string, SafetyItem> = {};
                data.forEach((d) => {
                    map[d.dong] = d; // key: 역삼동
                });
                setSafetyMap(map);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    /* ✅ 선택된 동의 API 안전도 */
    const safety = useMemo(() => {
        if (!dong) return null;
        const key = normalizeDongName(dong.id);
        return safetyMap[key] ?? null;
    }, [dong, safetyMap]);

    /* ---------------- 아무것도 선택 안 됨 ---------------- */
    if (!dong && !gu) {
        return (
            <div className="card">
                <div className="section-title">지역 정보</div>
                <div>지도의 동을 선택해주세요.</div>
            </div>
        );
    }

    /* ---------------- 동 선택됨 ---------------- */
    if (dong) {
        const grade = safety?.grade ?? "-";
        const color = colorByGrade(grade);

        return (
            <div className="card" style={{ display: "grid", gap: 14 }}>
                <div className="section-title">선택된 동</div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: color,
                        }}
                    />
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{dong.id}</div>
                </div>

                {loading ? (
                    <div style={{ color: "#98a7b5" }}>안전도 계산 중...</div>
                ) : safety ? (
                    <div style={{ color: "#cfd6e1", lineHeight: 1.6 }}>
                        <div>
                            등급 <b style={{ color }}>{safety.grade}</b>
                        </div>
                        <div>
                            점수 <b>{safety.score}</b>
                        </div>
                        <div style={{ fontSize: 13, color: "#8a95a8" }}>
                            최근 5개월 사고 {safety.accidentCount}건
                        </div>
                    </div>
                ) : (
                    <div style={{ color: "#8a95a8" }}>
                        최근 5개월 사고 없음 · A등급
                    </div>
                )}

                {/* 등급 기준 버튼 */}
                <button
                    onClick={() => setShowGradeInfo(v => !v)}
                    style={{
                        marginTop: 12,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #2b3b56",
                        background: "#0d1b2f",
                        color: "#cfd6e1",
                        cursor: "pointer",
                        fontWeight: 600,
                    }}
                >
                    📊 등급 기준
                </button>

                {showGradeInfo && (
                    <div
                        style={{
                            marginTop: 8,
                            padding: 12,
                            borderRadius: 10,
                            background: "#0c1220",
                            border: "1px solid #1b2332",
                            fontSize: 12,
                            color: "#8a95a8",
                        }}
                    >
                        <div>A: 매우 안전</div>
                        <div>B: 안전</div>
                        <div>C: 보통</div>
                        <div>D: 위험</div>
                        <div>E: 매우 위험</div>
                    </div>
                )}
            </div>
        );
    }

    /* ---------------- 구 선택됨 (요청대로 간단 처리) ---------------- */
    if (gu) {
        return (
            <div className="card">
                <div className="section-title">선택된 구</div>
                <div style={{ color: "#cfd6e1" }}>
                    동을 선택하면 상세 안전도가 표시됩니다.
                </div>
            </div>
        );
    }

    return null;
}
