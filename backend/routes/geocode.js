import { Router } from "express";

const router = Router();

// 1주차는 하드코딩(목업). 2주차에 Kakao Local API로 교체 예정.
const table = {
    "서울시 강동구 명일동": {
        gu: "강동구",
        dong: "명일동",
        coord: { lat: 37.5505, lng: 127.1507 },
        bounds: [[37.547, 127.145], [37.554, 127.155]]
    },
    "서울시 마포구 서교동": {
        gu: "마포구",
        dong: "서교동",
        coord: { lat: 37.5520, lng: 126.9188 },
        bounds: [[37.546, 126.912], [37.557, 126.925]]
    }
};

// GET /api/geocode?q=서울시+강동구+명일동
router.get("/", (req, res) => {
    const q = String(req.query.q || "").trim(); // 쿼리문자열 읽기
    const data = table[q]; // 하드코딩된 테이블에서 검색

    if (!data) {
        return res.status(404).json({
            error: { code: "NOT_FOUND", message: "해당 주소를 찾을 수 없습니다(목업)" }
        });
    }

    res.json(data);
});

export default router;
