import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();

// GET /api/notices?keywords=싱크홀,지반침하&limit=10
router.get("/", (req, res, next) => {
    try {
        const p = path.join(__dirname, "..", "data", "notices.sample.json");
        const list = JSON.parse(fs.readFileSync(p, "utf-8"));

        // 쿼리 파라미터 (검색어, 최대 개수)
        const ks = String(req.query.keywords || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const limit = Number(req.query.limit || 10);

        // 검색어가 있으면 필터링
        const filtered = ks.length
            ? list.filter((n) => ks.some((k) => n.title.includes(k)))
            : list;

        // 결과 자르기
        res.json(filtered.slice(0, limit));
    } catch (e) {
        next(e);
    }
});

export default router;
