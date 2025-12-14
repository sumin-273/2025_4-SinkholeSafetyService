import React, { useEffect, useState } from "react";
import { fetchSafetyScores } from "../api";
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
    const [safety, setSafety] = useState<{ score: number; grade: string } | null>(null);

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
                const data = await fetchSafetyScores(guName, dongName);
                setSafety({ score: Number(data.score) || 0, grade: String(data.grade || "-") });
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
            <div className="card">
                <div className="section-title">지역 정보</div>
                <div>지도의 구 또는 동을 선택해주세요.</div>
            </div>
        );
    }

    // ---------------------------------------------
    // 동 선택 시 → 동 정보 우선 표시
    // ---------------------------------------------
    if (dong) {
        const color = getColor(dong.danger);

        return (
            <div className="card" style={{ display: "grid", gap: 14 }}>
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
                            실제 등급 <b>{safety.grade}</b> · 점수 <b>{safety.score}</b>
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
            </div>
        );
    }

    // ---------------------------------------------
    // 구 선택됨
    // ---------------------------------------------
    if (gu) {
        const color = getColor(gu.danger);

        return (
            <div className="card" style={{ display: "grid", gap: 14 }}>
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
            </div>
        );
    }

    return null;
}
