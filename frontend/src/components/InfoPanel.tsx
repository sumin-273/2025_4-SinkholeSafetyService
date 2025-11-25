import React from "react";
import { GuInfo, DongInfo } from "../data/guDongData";

type Props = {
    gu: GuInfo | null;
    dong: DongInfo | null;
};

function getColor(level: number) {
    if (level >= 5) return "#ff0000";
    if (level === 4) return "#ff4d4f";
    if (level === 3) return "#ffa94d";
    if (level === 2) return "#ffe066";
    return "#69db7c";
}

export default function InfoPanel({ gu, dong }: Props) {
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

                    <ul style={{ paddingLeft: 20, margin: "10px 0 0 0", color: "#98a7b5" }}>
                        <li>최근 1개월 내 지반 침하 보고 1건</li>
                        <li>정밀 점검 요청 접수됨</li>
                    </ul>
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

                    <ul style={{ paddingLeft: 20, margin: "10px 0 0 0", color: "#98a7b5" }}>
                        <li>최근 3개월 내 2건의 지반 침하 보고</li>
                        <li>정밀 점검 예정 (2025-12-10)</li>
                    </ul>
                </div>
            </div>
        );
    }

    return null;
}
