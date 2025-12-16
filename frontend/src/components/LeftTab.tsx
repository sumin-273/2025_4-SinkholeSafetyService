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
        accidentCount: number;
    }>>({});

    const [loading, setLoading] = useState(true);

    /* ✅ 서울 전체 안전도 API 단 1회 호출 */
    useEffect(() => {
        console.log("🔍 왼쪽 탭: API 호출 시작");
        setLoading(true);

        fetch("/api/safety/seoul")
            .then((r) => {
                console.log("✅ 왼쪽 탭: 응답 받음", r.status);
                return r.json();
            })
            .then((response) => {
                console.log("📦 왼쪽 탭: 원본 응답", response);

                const data = response.data || [];
                console.log("📊 왼쪽 탭: 데이터 배열", data);
                console.log("📊 왼쪽 탭: 데이터 개수", data.length);

                const map: any = {};
                data.forEach((d: any) => {
                    console.log(`   - ${d.gu} ${d.dong}: ${d.grade}등급 (사고 ${d.accidentCount}건)`);
                    map[d.dong] = d; // key: 역삼동 (법정동)
                });

                console.log("🗺️ 왼쪽 탭: 생성된 맵", map);
                console.log("🗺️ 왼쪽 탭: 맵 키 목록", Object.keys(map));

                setSafetyByDong(map);
                setLoading(false);
            })
            .catch((err) => {
                console.error("❌ 왼쪽 탭: API 에러", err);
                setLoading(false);
            });
    }, []);

    return (
        <div style={{ display: "grid", gap: 12, height: "100vh" }}>
            <h1 className="section-title" style={{ color: "white" }}>
                싱크홀 안전도 서비스
            </h1>

            {loading && (
                <div style={{ color: "#8a95a8", fontSize: 12, padding: "0 12px" }}>
                    🔄 안전도 데이터 로딩 중...
                </div>
            )}

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

                                        // ✅ 행정동 → 법정동 변환
                                        const normalizedDongName = normalizeDongName(dong.id);

                                        // ✅ API 데이터에서 찾기
                                        const info = safetyByDong[normalizedDongName];

                                        // ✅ 디버깅 로그 (첫 번째 동만)
                                        if (gu.dongs[0].id === dong.id && !loading) {
                                            console.log(`🔍 매칭 체크: ${dong.id} (행정동) → ${normalizedDongName} (법정동)`);
                                            console.log(`   safetyByDong[${normalizedDongName}] =`, info);
                                        }

                                        // ✅ 데이터 없으면 A등급
                                        const grade = info ? info.grade : "A";

                                        return (
                                            <button
                                                key={dong.id}
                                                onClick={() => onSelectDong(dong)}
                                                style={{
                                                    padding: "8px 12px",
                                                    borderRadius: 8,
                                                    border: "1px solid #1b2332",
                                                    background: dongActive ? "#112233" : "#0c1220",
                                                    color: "white",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <span>{dong.id}</span>

                                                {/* ✅ 등급 색상 점 + 텍스트 */}
                                                <div style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6
                                                }}>
                                                    <span
                                                        style={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: "50%",
                                                            background: colorByGrade(grade),
                                                            display: "inline-block"
                                                        }}
                                                    />
                                                    <span
                                                        style={{
                                                            color: colorByGrade(grade),
                                                            fontWeight: 600,
                                                            fontSize: 13
                                                        }}
                                                    >
                                                        {grade}
                                                        {info && (
                                                            <span style={{ fontSize: 10, marginLeft: 2, color: "#6c757d" }}>
                                                                ({info.accidentCount})
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
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