import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

const SERVICE_KEY = process.env.MOLIT_RISK_API_KEY;
const BASE_URL = "https://apis.data.go.kr/1613000/undergroundsafetyinfo01";

/* ---------------- 유틸 ---------------- */

// YYYYMMDD
function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
}

// 월 단위 기간 생성
function getMonthlyRanges(months) {
    const ranges = [];
    const end = new Date();

    for (let i = 0; i < months; i++) {
        const to = new Date(end);
        to.setMonth(end.getMonth() - i);

        const from = new Date(to);
        from.setMonth(to.getMonth() - 1);

        ranges.push({
            from: formatDate(from),
            to: formatDate(to),
        });
    }
    return ranges;
}

// width / depth → 등급
function calcGrade(width, depth) {
    width = Number(width || 0);
    depth = Number(depth || 0);

    if (depth >= 1.5 || width >= 3.0) return { grade: "E", danger: 5 };
    if (depth < 1.5 || width < 3.0) return { grade: "D", danger: 4 };
    if (depth < 1.0 || width < 1.5) return { grade: "C", danger: 3 };
    if (depth < 0.7 && width < 1.0) return { grade: "B", danger: 2 };
    if (depth < 0.4 && width < 0.5) return { grade: "A", danger: 1 };

    return { grade: "C", danger: 3 };
}

function worse(a, b) {
    return a.danger >= b.danger ? a : b;
}

/* ---------------- 메인 API ---------------- */

router.get("/", async (req, res) => {
    try {
        const ranges = getMonthlyRanges(5);
        const resultMap = {};

        for (const range of ranges) {
            const listUrl =
                `${BASE_URL}/getSubsidenceList01` +
                `?serviceKey=${encodeURIComponent(SERVICE_KEY)}` +
                `&pageNo=1&numOfRows=500&type=json` +
                `&sagoDateFrom=${range.from}&sagoDateTo=${range.to}`;

            console.log("호출:", listUrl);

            const listRes = await fetch(listUrl);
            if (!listRes.ok) continue;

            const listJson = await listRes.json();
            const items = listJson?.response?.body?.items ?? [];

            const seoulList = items.filter(i => i.sido === "서울특별시");

            for (const acc of seoulList) {
                const infoUrl =
                    `${BASE_URL}/getSubsidenceInfo01` +
                    `?serviceKey=${encodeURIComponent(SERVICE_KEY)}` +
                    `&pageNo=1&numOfRows=1&type=json` +
                    `&sagoNo=${acc.sagoNo}`;

                try {
                    const r = await fetch(infoUrl);
                    const j = await r.json();
                    const d = j?.response?.body?.items?.[0];
                    if (!d || !d.sigungu || !d.dong) continue;

                    const grade = calcGrade(d.sinkWidth, d.sinkDepth);
                    const key = `${d.sigungu}-${d.dong}`;

                    if (!resultMap[key]) {
                        resultMap[key] = {
                            gu: d.sigungu,
                            dong: d.dong,
                            ...grade,
                            accidentCount: 1,
                        };
                    } else {
                        resultMap[key] = {
                            ...resultMap[key],
                            ...worse(resultMap[key], grade),
                            accidentCount: resultMap[key].accidentCount + 1,
                        };
                    }
                } catch {
                    continue;
                }
            }
        }

        res.json(Object.values(resultMap));
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "서울 지반침하 안전도 계산 실패",
            detail: err.message,
        });
    }
});

export default router;
