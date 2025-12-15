import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import geocode from "./routes/geocode.js";
import districts from "./routes/districts.js";
import safety from "./routes/safety.js";
import safetyBulk from "./routes/safety-bulk.js";
import notices from "./routes/notices.js";




dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


// 미들웨어
app.use(cors());
// 큰 본문 요청 처리 (기본값 ~100KB를 상향)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

//api 라우트 등록
app.use("/api/geocode", geocode);
app.use("/api/districts", districts);
app.use("/api/safety", safety);
app.use("/api/safety-bulk", safetyBulk);
app.use("/api/notices", notices);

// hello 
app.get("/", (req, res) => {
    res.send("Sinkhole Safety Service API 서버입니다. /api/... 엔드포인트를 사용하세요.");
});

app.get("/api/health", (req, res) => {
    res.json({ ok: true });
});

//서버 실행 확인
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
