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
import safetySeoul from "./routes/safety-seoul.js";





dotenv.config();

// 전역 에러 핸들러: 프로세스가 조용히 종료되는 원인을 로그에 남기기 위함
process.on("uncaughtException", (err) => {
    console.error("UNCaughtException:", err && err.stack ? err.stack : err);
});
process.on("unhandledRejection", (reason) => {
    console.error("UNHANDLED_REJECTION:", reason && reason.stack ? reason.stack : reason);
});
process.on("exit", (code) => {
    console.log("Process exiting with code:", code);
});

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
app.use("/api/safety/seoul", safetySeoul);
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

// 디버깅용: 만약 프로세스가 곧바로 종료된다면 이벤트루프를 유지해서
// 원인을 조사할 수 있도록 간단한 타이머를 둡니다. 문제가 해결되면 제거하세요.
const __debug_keepalive = setInterval(() => { }, 1000 * 60 * 60);
