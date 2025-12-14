import { Router } from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = Router();

const API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_ADDR_URL = "https://dapi.kakao.com/v2/local/search/address.json";
const KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

// GET /api/geocode?q=서울 종로구 종로1가
router.get("/", async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        if (!q) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "q 파라미터가 필요합니다" } });
        }
        if (!API_KEY) {
            return res.status(500).json({ error: { code: "MISSING_API_KEY", message: "KAKAO_REST_API_KEY가 설정되지 않았습니다" } });
        }

        // 1) 주소 검색 우선 시도
        const addrResp = await fetch(`${KAKAO_ADDR_URL}?query=${encodeURIComponent(q)}`, {
            headers: { Authorization: `KakaoAK ${API_KEY}` },
            timeout: 10000,
        });
        if (!addrResp.ok) throw new Error(`Kakao address API error: ${addrResp.status}`);
        const addrData = await addrResp.json();

        let doc = (addrData.documents || [])[0];

        // 2) 주소가 없으면 키워드 검색 시도 (예: "종로구 종로1가")
        if (!doc) {
            const kwResp = await fetch(`${KAKAO_KEYWORD_URL}?query=${encodeURIComponent(q)}`, {
                headers: { Authorization: `KakaoAK ${API_KEY}` },
                timeout: 10000,
            });
            if (!kwResp.ok) throw new Error(`Kakao keyword API error: ${kwResp.status}`);
            const kwData = await kwResp.json();
            doc = (kwData.documents || [])[0];
        }

        if (!doc) {
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "검색 결과가 없습니다" } });
        }

        const lat = Number(doc.y);
        const lng = Number(doc.x);
        const place_name = doc.address_name || doc.place_name || q;

        res.json({ lat, lng, place_name });
    } catch (e) {
        console.error("Geocode API 오류:", e);
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: e.message } });
    }
});

export default router;
