import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

// 여러 구/동의 안전도를 한 번에 조회
router.post("/", async (req, res) => {
    try {
        const { locations } = req.body; // [{ gu, dong }, ...]

        if (!Array.isArray(locations)) {
            return res.status(400).json({
                error: "locations 배열이 필요합니다",
                example: { locations: [{ gu: "강남구", dong: "역삼동" }] }
            });
        }

        const baseUrl = process.env.PUBLIC_BACKEND_URL || "http://localhost:3001";
        const results = [];

        // 병렬로 여러 요청 처리
        const promises = locations.map(async ({ gu, dong }) => {
            try {
                const url = `${baseUrl}/api/safety?gu=${encodeURIComponent(gu)}&dong=${encodeURIComponent(dong)}`;
                const response = await fetch(url, { timeout: 5000 });
                if (!response.ok) throw new Error(`${gu}/${dong} 조회 실패`);
                const data = await response.json();
                return { gu, dong, ...data };
            } catch (error) {
                console.warn(`${gu}/${dong} 오류:`, error.message);
                return {
                    gu,
                    dong,
                    score: 50,
                    grade: "C",
                    danger: 3,
                    error: error.message
                };
            }
        });

        const allResults = await Promise.all(promises);
        res.json(allResults);
    } catch (error) {
        console.error("Bulk safety API 오류:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
