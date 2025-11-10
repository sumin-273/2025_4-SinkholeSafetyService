import { Router } from "express";
import fs from "fs"; //node.js 기본 내장 모듈 (파일 시스템)
import path from "path"; // node.js 기본 내장 모듈 (경로)
import { fileURLToPath } from "url"; // 운영체제에서 실제로 인식하는 파일 경로로 변환 역할

//파일 경로 얻기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//라우터 객체 생성
const router = Router();

router.get("/", (_req, res, next) => {
    try {
        const p = path.join(__dirname, "..", "data", "districts.sample.geojson");
        res.json(JSON.parse(fs.readFileSync(p, "utf-8")));
    } catch (e) { next(e); }
});

export default router;
