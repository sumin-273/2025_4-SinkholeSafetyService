// Quick helper to fetch Seoul gu centroids directly from Kakao address API
// Prereq: backend/.env has KAKAO_REST_API_KEY. Usage: node scripts/fetch_gu_centers.js
// Note: Node 18+ has global fetch, so no dependency required.

const path = require("path");
// Load dotenv from backend's node_modules to avoid extra install at root
require(path.join(__dirname, "..", "backend", "node_modules", "dotenv")).config({
    path: path.join(__dirname, "..", "backend", ".env"),
});

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_ADDR_URL = "https://dapi.kakao.com/v2/local/search/address.json";

if (!KAKAO_KEY) {
    console.error("KAKAO_REST_API_KEY가 .env에 없습니다.");
    process.exit(1);
}

const gus = [
    "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구",
    "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구",
    "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"
];

async function fetchGuCenter(gu) {
    const q = `서울 ${gu}`;
    const resp = await fetch(`${KAKAO_ADDR_URL}?query=${encodeURIComponent(q)}`, {
        headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const doc = (data.documents || [])[0];
    if (!doc) throw new Error("no result");
    const lat = Number(doc.y);
    const lng = Number(doc.x);
    return { lat, lng };
}

(async () => {
    const results = [];
    for (const gu of gus) {
        try {
            const { lat, lng } = await fetchGuCenter(gu);
            results.push({ guId: gu, guName: gu, lat, lng, danger: 3 });
            console.log(`${gu}: ${lat}, ${lng}`);
        } catch (err) {
            console.error(`Failed for ${gu}:`, err.message);
        }
    }

    console.log("\nPaste into guDongData.ts:");
    console.log(JSON.stringify(results, null, 2));
})();
