import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import geocode from "./routes/geocode.js";
import districts from "./routes/districts.js";
import safety from "./routes/safety.js";
import notices from "./routes/notices.js";




dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


// 미들웨어
app.use(cors());
app.use(express.json());

//api 라우트 등록
app.use("/api/geocode", geocode);
app.use("/api/districts", districts);
app.use("/api/safety", safety);
app.use("/api/notices", notices);

//헬스 체크
app.get("/api/health", (req, res) => {
    res.json({ ok: true });
});

//서버 실행 확인
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
});
