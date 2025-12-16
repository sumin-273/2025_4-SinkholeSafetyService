import React, { useEffect, useState } from "react";
import { fetchSafetyScores, fetchSafetyEvaluation } from "../api";
import { GuInfo, DongInfo } from "../data/guDongData";

type Props = {
    gu: GuInfo | null;
    dong: DongInfo | null;
};

type Notice = {
    id: string;
    title: string;
    date: string;
    location: string;
    description: string;
    source: string;
};

type SafetyData = {
    score: number;
    grade: string;
    source: "evaluation" | "accident";
    evaluateGrade?: string;
};

function getColor(level: number) {
    if (level >= 5) return "#ff0000";
    if (level === 4) return "#ff4d4f";
    if (level === 3) return "#ffa94d";
    if (level === 2) return "#ffe066";
    return "#69db7c";
}

export default function InfoPanel({ gu, dong }: Props) {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(false);
    const [safety, setSafety] = useState<SafetyData | null>(null);
    const [showGradeInfo, setShowGradeInfo] = useState(false);

    // notices API 호출
    useEffect(() => {
        const fetchNotices = async () => {
            setLoading(true);
            try {
                const response = await fetch("/api/notices?limit=10");
                if (response.ok) {
                    const data = await response.json();
                    setNotices(data);
                }
            } catch (error) {
                console.error("공지사항 로딩 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotices();
    }, []);

    // 선택된 동의 실제 안전도 로딩
    useEffect(() => {
        const loadSafety = async () => {
            try {
                const guName = gu?.guName || "";
                const dongName = dong?.id || "";
                if (!guName || !dongName) { setSafety(null); return; }

                // 먼저 평가 데이터 시도
                try {
                    const evalData = await fetchSafetyEvaluation(guName, dongName);
                    setSafety({
                        score: Number(evalData.score) || 0,
                        grade: String(evalData.grade || "-"),
                        source: "evaluation",
                        evaluateGrade: String(evalData.evaluateGrade || ""),
                    });
                    return;
                } catch (e) {
                    console.warn("평가 데이터 조회 실패, 사고 데이터로 시도");
                }

                // 평가 데이터가 없으면 사고 데이터 사용
                const accidentData = await fetchSafetyScores(guName, dongName);
                setSafety({
                    score: Number(accidentData.score) || 0,
                    grade: String(accidentData.grade || "-"),
                    source: "accident",
                });
            } catch (e) {
                setSafety(null);
            }
        };
        loadSafety();
    }, [gu?.guName, dong?.id]);

    // 선택된 구/동에 맞는 공지사항 필터링
    const getFilteredNotices = () => {
        if (dong) {
            // 동 선택 시: 동 이름이 location에 포함된 것만
            return notices.filter(n => n.location.includes(dong.id));
        }
        if (gu) {
            // 구 선택 시: 구 이름이 location에 포함된 것만
            return notices.filter(n => n.location.includes(gu.guName));
        }
        return notices;
    };

    const filteredNotices = getFilteredNotices();
    // ---------------------------------------------
    // 아무것도 선택되지 않은 경우
    // ---------------------------------------------
    if (!gu && !dong) {
        return (
            <div className="card" style={{ position: "relative" }}>
                <div className="section-title">지역 정보</div>
                <div>지도의 구 또는 동을 선택해주세요.</div>
                {/* 항상 표시: 등급 기준 버튼 */}
                <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1002 }}>
                    {showGradeInfo && (
                        <div
                            style={{
                                position: "fixed",
                                right: 24,
                                bottom: 86,
                                background: "#0c1220",
                                border: "1px solid #2b3b56",
                                borderRadius: 12,
                                padding: 16,
                                width: 320,
                                maxHeight: 380,
                                overflowY: "auto",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                                zIndex: 1003,
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>🎯 위험도 등급 기준</h3>
                                <button onClick={() => setShowGradeInfo(false)} style={{ background: "transparent", border: "none", color: "#8a95a8", cursor: "pointer", fontSize: 20 }}>×</button>
                            </div>
                            <div style={{ fontSize: 12, color: "#8a95a8", marginBottom: 10 }}>국토교통부 표준 준용</div>
                            {[
                                { grade: "A", range: "80~100점", danger: 1, color: "#69db7c", desc: "매우 안전" },
                                { grade: "B", range: "60~79점", danger: 2, color: "#ffe066", desc: "안전" },
                                { grade: "C", range: "40~59점", danger: 3, color: "#ffa94d", desc: "보통" },
                                { grade: "D", range: "20~39점", danger: 4, color: "#ff4d4f", desc: "위험" },
                                { grade: "E", range: "0~19점", danger: 5, color: "#c92a2a", desc: "매우 위험" },
                            ].map(item => (
                                <div key={item.grade} style={{ display: "flex", alignItems: "center", padding: 8, marginBottom: 6, background: "#0d1b2f", borderRadius: 8, border: "1px solid #1b2332" }}>
                                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: item.color, marginRight: 10 }} />
                                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{item.grade}등급 <span style={{ color: "#8a95a8", fontWeight: 400 }}>({item.range})</span></div>
                                    <div style={{ marginLeft: "auto", color: "#8a95a8", fontSize: 11 }}>위험도 {item.danger}</div>
                                </div>
                            ))}
                            <div style={{ borderTop: "1px solid #1b2332", paddingTop: 8, color: "#8a95a8", fontSize: 11 }}>
                                • 최근성: 1개월 내 사고 30점<br />
                                • 건수: 사고 1건당 3점<br />
                                • 위치: 정확 매칭 시 1.5배
                            </div>
                        </div>
                    )}
                    <button onClick={() => setShowGradeInfo(v => !v)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2b3b56", background: showGradeInfo ? "#16355f" : "#0d1b2f", color: "#cfd6e1", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📊 등급 기준</button>
                </div>
            </div>
        );
    }

    // ---------------------------------------------
    // 동 선택 시 → 동 정보 우선 표시
    // ---------------------------------------------
    if (dong) {
        const color = getColor(dong.danger);

        return (
            <div className="card" style={{ display: "grid", gap: 14, position: "relative" }}>
                <div className="section-title">선택된 동</div>

                {/* 동 이름 + 색상 */}
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

                <div style={{ fontSize: 16, color: "#cfd6e1" }}>
                    위험도 <b>{dong.danger}단계</b>
                    {safety ? (
                        <div style={{ marginTop: 6, color: "#98a7b5" }}>
                            {safety.source === "evaluation" ? (
                                <>
                                    <div>📋 [평가 데이터]</div>
                                    <div>등급 <b>{safety.grade}</b> · 점수 <b>{safety.score}</b></div>
                                    <div style={{ fontSize: 12, marginTop: 4 }}>평가등급: {safety.evaluateGrade}</div>
                                </>
                            ) : (
                                <>
                                    <div>📊 [사고 데이터]</div>
                                    <div>등급 <b>{safety.grade}</b> · 점수 <b>{safety.score}</b></div>
                                </>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* 공지 박스 */}
                <div
                    style={{
                        background: "#0c1220",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid #1b2332"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20 }}>📌</span>
                        <span style={{ fontWeight: 700 }}>최근 공지</span>
                    </div>

                    {loading ? (
                        <div style={{ padding: "10px 0", color: "#98a7b5" }}>로딩 중...</div>
                    ) : filteredNotices.length > 0 ? (
                        <ul style={{ paddingLeft: 20, margin: "10px 0 0 0", color: "#98a7b5" }}>
                            {filteredNotices.slice(0, 3).map(notice => (
                                <li key={notice.id} style={{ marginBottom: 8 }}>
                                    <div style={{ fontWeight: 600, color: "#cfd6e1" }}>{notice.title}</div>
                                    <div style={{ fontSize: 12, color: "#7d8a99" }}>
                                        {notice.date} · {notice.location}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div style={{ padding: "10px 0", color: "#98a7b5" }}>해당 지역 공지사항이 없습니다</div>
                    )}
                </div>

                {/* 등급 기준 버튼 + 팝업 (우측 하단 고정) */}
                <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1002 }}>
                    {showGradeInfo && (
                        <div
                            style={{
                                position: "fixed",
                                right: 24,
                                bottom: 86,
                                background: "#0c1220",
                                border: "1px solid #2b3b56",
                                borderRadius: 12,
                                padding: 16,
                                width: 320,
                                maxHeight: 380,
                                overflowY: "auto",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                                zIndex: 1003,
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>🎯 위험도 등급 기준</h3>
                                <button onClick={() => setShowGradeInfo(false)} style={{ background: "transparent", border: "none", color: "#8a95a8", cursor: "pointer", fontSize: 20 }}>×</button>
                            </div>
                            <div style={{ fontSize: 12, color: "#8a95a8", marginBottom: 10 }}>국토교통부 표준 준용</div>
                            {[
                                { grade: "A", range: "80~100점", danger: 1, color: "#69db7c", desc: "매우 안전" },
                                { grade: "B", range: "60~79점", danger: 2, color: "#ffe066", desc: "안전" },
                                { grade: "C", range: "40~59점", danger: 3, color: "#ffa94d", desc: "보통" },
                                { grade: "D", range: "20~39점", danger: 4, color: "#ff4d4f", desc: "위험" },
                                { grade: "E", range: "0~19점", danger: 5, color: "#c92a2a", desc: "매우 위험" },
                            ].map(item => (
                                <div key={item.grade} style={{ display: "flex", alignItems: "center", padding: 8, marginBottom: 6, background: "#0d1b2f", borderRadius: 8, border: "1px solid #1b2332" }}>
                                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: item.color, marginRight: 10 }} />
                                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{item.grade}등급 <span style={{ color: "#8a95a8", fontWeight: 400 }}>({item.range})</span></div>
                                    <div style={{ marginLeft: "auto", color: "#8a95a8", fontSize: 11 }}>위험도 {item.danger}</div>
                                </div>
                            ))}
                            <div style={{ borderTop: "1px solid #1b2332", paddingTop: 8, color: "#8a95a8", fontSize: 11 }}>
                                • 최근성: 1개월 내 사고 30점<br />
                                • 건수: 사고 1건당 3점<br />
                                • 위치: 정확 매칭 시 1.5배
                            </div>
                        </div>
                    )}
                    <button onClick={() => setShowGradeInfo(v => !v)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2b3b56", background: showGradeInfo ? "#16355f" : "#0d1b2f", color: "#cfd6e1", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📊 등급 기준</button>
                </div>
            </div>
        );
    }

    // ---------------------------------------------
    // 구 선택됨
    // ---------------------------------------------
    if (gu) {
        const color = getColor(gu.danger);

        return (
            <div className="card" style={{ display: "grid", gap: 14, position: "relative" }}>
                <div className="section-title">선택된 구</div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: color,
                        }}
                    />
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{gu.guName}</div>
                </div>

                <div style={{ fontSize: 16, color: "#cfd6e1" }}>
                    위험도 <b>{gu.danger}단계</b>
                </div>

                <div
                    style={{
                        background: "#0c1220",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid #1b2332"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 20 }}>📢</span>
                        <span style={{ fontWeight: 700 }}>최근 공지</span>
                    </div>

                    {loading ? (
                        <div style={{ padding: "10px 0", color: "#98a7b5" }}>로딩 중...</div>
                    ) : filteredNotices.length > 0 ? (
                        <ul style={{ paddingLeft: 20, margin: "10px 0 0 0", color: "#98a7b5" }}>
                            {filteredNotices.slice(0, 3).map(notice => (
                                <li key={notice.id} style={{ marginBottom: 8 }}>
                                    <div style={{ fontWeight: 600, color: "#cfd6e1" }}>{notice.title}</div>
                                    <div style={{ fontSize: 12, color: "#7d8a99" }}>
                                        {notice.date} · {notice.location}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div style={{ padding: "10px 0", color: "#98a7b5" }}>해당 지역 공지사항이 없습니다</div>
                    )}
                </div>

                {/* 등급 기준 버튼 + 팝업 (우측 하단 고정) */}
                <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1002 }}>
                    {showGradeInfo && (
                        <div
                            style={{
                                position: "fixed",
                                right: 24,
                                bottom: 86,
                                background: "#0c1220",
                                border: "1px solid #2b3b56",
                                borderRadius: 12,
                                padding: 16,
                                width: 320,
                                maxHeight: 380,
                                overflowY: "auto",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                                zIndex: 1003,
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>🎯 위험도 등급 기준</h3>
                                <button onClick={() => setShowGradeInfo(false)} style={{ background: "transparent", border: "none", color: "#8a95a8", cursor: "pointer", fontSize: 20 }}>×</button>
                            </div>
                            <div style={{ fontSize: 12, color: "#8a95a8", marginBottom: 10 }}>국토교통부 표준 준용</div>
                            {[
                                { grade: "A", range: "80~100점", danger: 1, color: "#69db7c", desc: "매우 안전" },
                                { grade: "B", range: "60~79점", danger: 2, color: "#ffe066", desc: "안전" },
                                { grade: "C", range: "40~59점", danger: 3, color: "#ffa94d", desc: "보통" },
                                { grade: "D", range: "20~39점", danger: 4, color: "#ff4d4f", desc: "위험" },
                                { grade: "E", range: "0~19점", danger: 5, color: "#c92a2a", desc: "매우 위험" },
                            ].map(item => (
                                <div key={item.grade} style={{ display: "flex", alignItems: "center", padding: 8, marginBottom: 6, background: "#0d1b2f", borderRadius: 8, border: "1px solid #1b2332" }}>
                                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: item.color, marginRight: 10 }} />
                                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{item.grade}등급 <span style={{ color: "#8a95a8", fontWeight: 400 }}>({item.range})</span></div>
                                    <div style={{ marginLeft: "auto", color: "#8a95a8", fontSize: 11 }}>위험도 {item.danger}</div>
                                </div>
                            ))}
                            <div style={{ borderTop: "1px solid #1b2332", paddingTop: 8, color: "#8a95a8", fontSize: 11 }}>
                                • 최근성: 1개월 내 사고 30점<br />
                                • 건수: 사고 1건당 3점<br />
                                • 위치: 정확 매칭 시 1.5배
                            </div>
                        </div>
                    )}
                    <button onClick={() => setShowGradeInfo(v => !v)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2b3b56", background: showGradeInfo ? "#16355f" : "#0d1b2f", color: "#cfd6e1", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📊 등급 기준</button>
                </div>
            </div>
        );
    }

    return null;
}
