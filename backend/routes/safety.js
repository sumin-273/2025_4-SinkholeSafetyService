import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();

let _cache = null;
let _cacheTime = 0;
const TTL_MS = 60 * 1000; // 1분 캐시

function loadRows() {
    const now = Date.now();
    if (_cache && now - _cacheTime < TTL_MS) return _cache;

    const p = path.join(__dirname, "..", "data", "safety_scores.csv");
    const raw = fs.readFileSync(p, "utf-8");
    const lines = raw.trim().split(/\r?\n/).slice(1);

    const rows = lines.map(line => {
        const [gu, dong, score, grade] = line.split(",");
        return { gu: gu.trim(), dong: dong.trim(), score: Number(score), grade: grade.trim() };
    });

    _cache = rows;
    _cacheTime = now;
    return rows;
}

router.get("/", (req, res, next) => {
    try {
        const { gu, dong } = req.query;
        if (!gu || !dong) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "gu,dong 쿼리 필요" } });
        }

        const rows = loadRows();
        const row = rows.find(r => r.gu === gu && r.dong === dong);

        if (!row) {
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "등급 데이터 없음(목업)" } });
        }

        res.json({
            location: { gu, dong },
            score: row.score,
            grade: row.grade,
            basis: { window: "3y", factors: [], updated_at: new Date().toISOString() }
        });
    } catch (e) { next(e); }
});

export default router;
