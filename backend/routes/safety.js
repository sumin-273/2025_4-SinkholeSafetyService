import { Router } from "express";
import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();
const router = Router();

const API_KEY = process.env.MOLIT_RISK_API_KEY;
const API_BASE_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00752";

let _cache = {};
let _cacheTime = {};
const TTL_MS = 24 * 60 * 60 * 1000; // 24시간 캐시

/**
 * 국토교통부 지반침하 위험도 평가 API 호출
 * @param {string} gu - 구명 (예: "강남구")
 * @param {string} dong - 동명 (예: "역삼동")
 */
async function fetchFromAPI(gu, dong) {
    const cacheKey = `${gu}-${dong}`;
    const now = Date.now();

    // 캐시 확인
    if (_cache[cacheKey] && now - _cacheTime[cacheKey] < TTL_MS) {
        console.log(`캐시에서 반환: ${cacheKey}`);
        return _cache[cacheKey];
    }

    try {
        // API 호출
        const params = new URLSearchParams({
            serviceKey: API_KEY,
            pageNo: 1,
            numOfRows: 100,
            returnType: "json"
        });

        const url = `${API_BASE_URL}?${params}`;
        console.log(`API 호출: ${url}`);

        const response = await fetch(url, {
            timeout: 10000 // 10초 타임아웃
        });

        if (!response.ok) {
            throw new Error(`API 응답 오류: ${response.status}`);
        }

        const data = await response.json();
        console.log("API 응답:", JSON.stringify(data).substring(0, 200));

        // API 응답 처리
        if (data.body && Array.isArray(data.body)) {
            const items = data.body;

            // 구/동으로 필터링
            const filtered = items.filter(item =>
                item.EVL_NM &&
                item.EVL_NM.includes(gu) &&
                item.EVL_NM.includes(dong)
            );

            if (filtered.length > 0) {
                const item = filtered[0];
                const result = {
                    location: { gu, dong },
                    score: Math.floor(Math.random() * 100), // 임시: 실제 데이터에서 추출 필요
                    grade: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)], // 임시
                    description: item.EVL_NM || "지반침하 위험도 정보",
                    basis: {
                        window: "3y",
                        factors: ["최근 사고 밀도", "지반 침하 패턴"],
                        updated_at: new Date().toISOString(),
                        data_source: "국토교통부 재난안전데이터"
                    }
                };

                // 캐시 저장
                _cache[cacheKey] = result;
                _cacheTime[cacheKey] = now;
                return result;
            } else {
                // 해당 구/동 데이터 없으면 기본값 반환
                return {
                    location: { gu, dong },
                    score: 50,
                    grade: "C",
                    description: "위험도 데이터 없음",
                    basis: {
                        window: "3y",
                        factors: [],
                        updated_at: new Date().toISOString(),
                        data_source: "기본값"
                    }
                };
            }
        } else {
            throw new Error("API 응답 형식이 예상과 다릅니다");
        }
    } catch (error) {
        console.error(`API 호출 오류: ${error.message}`);
        throw error;
    }
}

router.get("/", async (req, res, next) => {
    try {
        const { gu, dong } = req.query;

        // 입력값 검증
        if (!gu || !dong) {
            return res.status(400).json({
                error: {
                    code: "BAD_REQUEST",
                    message: "구(gu)와 동(dong) 파라미터는 필수입니다",
                    example: "/api/safety?gu=강남구&dong=역삼동"
                }
            });
        }

        // API에서 데이터 가져오기
        const result = await fetchFromAPI(gu, dong);
        res.json(result);

    } catch (error) {
        console.error("Safety API 오류:", error);
        res.status(500).json({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "위험도 정보를 가져올 수 없습니다",
                detail: error.message
            }
        });
    }
});

export default router;
