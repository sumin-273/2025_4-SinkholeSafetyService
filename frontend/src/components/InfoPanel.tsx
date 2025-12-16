import React, { useEffect, useMemo, useState } from "react";
import { GuInfo, DongInfo } from "../data/guDongData";

const API_BASE = process.env.REACT_APP_API_BASE || '';

type Props = {
    gu: GuInfo | null;
    dong: DongInfo | null;
};



type AccidentItem = {
    sagoNo: number;
    width: number;
    depth: number;
    grade: string;
    danger: number;
    date: string;
};

type SafetyItem = {
    gu: string;
    dong: string;
    grade: string;
    danger: number;
    accidentCount: number;
    accidents?: AccidentItem[];
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
        default: return "#adb5bd";
    }
}

/* ---------------- 컴포넌트 ---------------- */

export default function InfoPanel({ gu, dong }: Props) {
    const [safetyData, setSafetyData] = useState<SafetyItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showGradeInfo, setShowGradeInfo] = useState(false);

    /*  서울 전체 안전도 API 단 1회 호출 */
    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE}/api/safety/seoul`)
            .then((r) => r.json())
            .then((response) => {
                const data = response.data || [];
                setSafetyData(data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    /*  선택된 동의 안전도 정보 */
    const safety = useMemo(() => {
        if (!dong) return null;
        const key = normalizeDongName(dong.id);
        return safetyData.find(s => s.dong === key) ?? null;
    }, [dong, safetyData]);

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
        const grade = safety?.grade ?? "A";
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
                    <>
                        <div style={{ color: "#cfd6e1", lineHeight: 1.6 }}>
                            <div>
                                등급 <b style={{ color }}>{safety.grade}</b>
                            </div>
                            <div style={{ fontSize: 13, color: "#8a95a8", marginTop: 4 }}>
                                최근 5개월 사고 {safety.accidentCount}건
                            </div>
                        </div>

                        {/*  개별 사고 목록 (D등급 → A등급 순) */}
                        {safety.accidents && safety.accidents.length > 0 && (
                            <div style={{
                                marginTop: 8,
                                padding: 12,
                                borderRadius: 10,
                                background: "#0c1220",
                                border: "1px solid #1b2332",
                            }}>
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#cfd6e1",
                                    marginBottom: 8
                                }}>
                                    사고 내역 (위험도 순)
                                </div>

                                <div style={{ display: "grid", gap: 8 }}>
                                    {safety.accidents.map((accident, idx) => (
                                        <div key={idx} style={{
                                            padding: "8px 10px",
                                            borderRadius: 8,
                                            background: "#0d1b2f",
                                            border: "1px solid #2b3b56",
                                            fontSize: 12,
                                            color: "#cfd6e1"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                <span style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    background: colorByGrade(accident.grade)
                                                }} />
                                                <span style={{ fontWeight: 600 }}>
                                                    {accident.grade}등급
                                                </span>
                                            </div>
                                            <div style={{ color: "#8a95a8", lineHeight: 1.5 }}>
                                                <div>폭: {accident.width}m</div>
                                                <div>깊이: {accident.depth}m</div>
                                                {accident.date && (
                                                    <div style={{ fontSize: 11, marginTop: 2 }}>
                                                        {accident.date.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
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

                {/*  등급 기준 + API 출처 */}
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
                            lineHeight: 1.6
                        }}
                    >
                        {/* 등급 기준 */}
                        <div><b style={{ color: "#69db7c" }}>A등급</b>: 매우 안전 (폭 &lt; 0.5m, 깊이 &lt; 0.4m)</div>
                        <div><b style={{ color: "#ffe066" }}>B등급</b>: 안전 (폭 ≥ 0.5m 또는 깊이 ≥ 0.4m)</div>
                        <div><b style={{ color: "#ffa94d" }}>C등급</b>: 보통 (폭 ≥ 1.5m 또는 깊이 ≥ 1.0m)</div>
                        <div><b style={{ color: "#ff4d4f" }}>D등급</b>: 위험 (폭 ≥ 3.0m 또는 깊이 ≥ 1.5m)</div>

                        {/*  API 출처 */}
                        <div style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: "1px solid #2b3b56",
                            fontSize: 11,
                            color: "#6c757d"
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: "#8a95a8" }}>
                                📊 데이터 출처
                            </div>
                            <div style={{ lineHeight: 1.5 }}>
                                국토교통부<br />
                                지하안전정보 API
                            </div>
                            <a
                                href="https://www.data.go.kr/data/15041891/openapi.do"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: "#5c7cfa",
                                    textDecoration: "none",
                                    fontSize: 10,
                                    display: "inline-block",
                                    marginTop: 4
                                }}
                            >
                                상세보기 →
                            </a>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    /* ---------------- 구 선택됨 ---------------- */
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