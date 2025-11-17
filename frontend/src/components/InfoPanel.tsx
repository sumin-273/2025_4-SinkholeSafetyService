import React from "react";
import { Zone } from "../data/mockZones";

function getColor(level: number) {
    if (level >= 4) return "#ff4d4f";
    if (level === 3) return "#ffa94d";
    if (level === 2) return "#ffe066";
    return "#69db7c";
}

export default function InfoPanel({ zone }: { zone: Zone | null }) {
    if (!zone) {
        return (
            <div className="card">
                <div className="section-title">구 정보</div>
                <div>지도를 클릭하거나 검색하여 구를 선택하세요.</div>
            </div>
        );
    }

    const color = getColor(zone.danger);

    return (
        <div className="card" style={{ display: "grid", gap: 10 }}>
            <div className="section-title">선택된 구</div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                    style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: color,
                    }}
                />
                <div style={{ fontSize: 18, fontWeight: 700 }}>{zone.name}</div>
            </div>

            <div style={{ color: "#8aa0b5", marginBottom: 8 }}>
                위험도 {zone.danger}단계
            </div>

            <div className="card" style={{ background: "#0c1220" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>📢 최근 공지</div>
                <ul style={{ paddingLeft: 16, margin: 0, color: "#8aa0b5" }}>
                    <li>최근 3개월 내 2건의 지반 침하 보고</li>
                    <li>정밀 점검 예정 (2025-12-10)</li>
                </ul>
            </div>
        </div>
    );
}
