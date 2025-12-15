import { Router } from "express";
import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();
const router = Router();

const API_KEY = process.env.MOLIT_ACCIDENT_API_KEY;
const API_BASE_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00754"; // 지반침하사고 목록

let _cache = null;
let _cacheTime = 0;
const TTL_MS = 60 * 60 * 1000; // 1시간 캐시

/**
 * 국토교통부 지반침하사고 목록 API 호출
 */
async function fetchFromAPI(keywords = "", limit = 10) {
    const now = Date.now();

    // 캐시 확인
    if (_cache && now - _cacheTime < TTL_MS) {
        return filterAndLimit(_cache, keywords, limit);
    }

    try {
        const params = new URLSearchParams({
            serviceKey: API_KEY,
            pageNo: 1,
            numOfRows: 100,
            returnType: "json"
        });

        const url = `${API_BASE_URL}?${params}`;

        const response = await fetch(url, {
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`API 응답 오류: ${response.status}`);
        }

        const data = await response.json();

        // API 응답 처리 (서울시만 필터링)
        if (data.body && Array.isArray(data.body)) {
            const notices = data.body
                .filter(item => item.CTPV && item.CTPV.includes("서울"))
                .map(item => ({
                    id: item.ACDNT_NO || item.SENU || Math.random().toString(),
                    title: `${item.SGG || "서울시"} 지반침하 사고`,
                    date: item.OCRN_YMD ? `${item.OCRN_YMD.substring(0, 4)}-${item.OCRN_YMD.substring(4, 6)}-${item.OCRN_YMD.substring(6, 8)}` : new Date().toISOString().split('T')[0],
                    location: `서울특별시 ${item.SGG || ""}`.trim(),
                    description: item.DTL_OCRN_CS || "상세정보 없음",
                    source: "국토교통부"
                }));

            // 캐시 저장
            _cache = notices;
            _cacheTime = now;

            return filterAndLimit(notices, keywords, limit);
        } else {
            // 기본값 반환
            return [{
                id: "default",
                title: "공지사항 데이터 없음",
                date: new Date().toISOString().split('T')[0],
                location: "",
                description: "현재 사용 가능한 공지사항이 없습니다",
                source: "기본값"
            }];
        }
    } catch (error) {
        console.error(`Notices API 호출 오류: ${error.message}`);
        throw error;
    }
}

function filterAndLimit(notices, keywords, limit) {
    if (!keywords) return notices.slice(0, limit);

    const ks = keywords.split(",").map(s => s.trim()).filter(Boolean);
    const filtered = notices.filter(n =>
        ks.some(k => n.title.includes(k) || n.description.includes(k))
    );

    return filtered.slice(0, limit);
}

// GET /api/notices?keywords=싱크홀,지반침하&limit=10
router.get("/", async (req, res, next) => {
    try {
        const keywords = String(req.query.keywords || "");
        const limit = Number(req.query.limit || 10);

        const result = await fetchFromAPI(keywords, limit);
        res.json(result);

    } catch (error) {
        console.error("Notices API 오류:", error);
        res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "공지사항을 가져올 수 없습니다",
                detail: error.message
            }
        });
    }
});

export default router;
