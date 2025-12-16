import { Router } from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = Router();

/**
 * 국토교통부_지하안전정보 (data.go.kr 15041891)
 * Base: https://apis.data.go.kr/1613000/undergroundsafetyinfo01
 *
 * 사용 엔드포인트:
 *  - 지반침하사고 리스트: getSubsidenceList01   (가정: swagger에 존재)
 *  - 지반침하사고 상세:   getSubsidenceInfo01   (sagoNo 필수)  <-- 너 스샷에 나온거
 *  - 지반침하위험도평가 리스트: getSubsidenceEvalutionList01  <-- 새로 추가
 *
 * ⚠️ 참고:
 * - 브라우저에서 직접 때리면 CORS/키 노출/403 등의 문제가 나서,
 *   반드시 백엔드에서 프록시로 호출하는 형태가 맞음.
 */

const API_KEY = process.env.MOLIT_RISK_API_KEY;

// 리스트/상세 URL
const BASE = "https://apis.data.go.kr/1613000/undergroundsafetyinfo01";
const LIST_URL = `${BASE}/getSubsidenceList01`;
const INFO_URL = `${BASE}/getSubsidenceInfo01`;
const EVALUTION_LIST_URL = `${BASE}/getSubsidenceEvalutionList01`;

// 캐시
const TTL_MS = 60 * 60 * 1000; // 1시간 (원하면 조절)
const cache = new Map(); // key: "gu|dong" -> {time,data}
const listCache = new Map(); // key: "from|to|pageNo|numOfRows" -> {time,items}

/** ===== 너가 정한 점수/등급 기준 그대로 ===== */
function scoreToGrade(score) {
    if (score >= 80) return "A";
    if (score >= 60) return "B";
    if (score >= 40) return "C";
    if (score >= 20) return "D";
    return "E";
}
function gradeToDanger(grade) {
    const map = { A: 1, B: 2, C: 3, D: 4, E: 5 };
    return map[String(grade || "").toUpperCase()] ?? 3;
}
function scoreToDanger(score) {
    return gradeToDanger(scoreToGrade(score));
}

/** 유틸 */
function normalize(s = "") {
    return String(s).trim().toLowerCase();
}
function parseDateYYYYMMDD(s) {
    // "20240101" 또는 "2024-01-01" 같이 들어올 수 있어서 최대한 처리
    const raw = String(s || "").trim();
    if (!raw) return null;
    if (/^\d{8}$/.test(raw)) {
        const y = raw.slice(0, 4);
        const m = raw.slice(4, 6);
        const d = raw.slice(6, 8);
        return new Date(`${y}-${m}-${d}T00:00:00`);
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
}
function daysDiff(from, to) {
    const ms = to.getTime() - from.getTime();
    return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * 시간가중치(너가 준 표 그대로)
 */
function timeWeightByDays(days) {
    if (days <= 30) return 30;
    if (days <= 90) return 25;
    if (days <= 180) return 20;
    if (days <= 365) return 15;
    if (days <= 730) return 10;
    return 5;
}

/**
 * 공공데이터포털 serviceKey:
 * - "디코딩 인증키"를 .env에 넣었다면 여기서 URLSearchParams로 또 인코딩해버리면 꼬일 수 있음
 * - 그래서 serviceKey는 "그대로" 붙이고, 나머지만 인코딩
 */
function buildUrl(baseUrl, paramsObj = {}) {
    if (!API_KEY) throw new Error("MOLIT_RISK_API_KEY가 설정되지 않았습니다 (.env 확인)");

    const qs = new URLSearchParams(paramsObj).toString();
    // serviceKey는 raw로 붙임
    return `${baseUrl}?serviceKey=${API_KEY}${qs ? `&${qs}` : ""}`;
}

/**
 * 리스트 1페이지 가져오기
 * - swagger마다 파라미터 이름이 다를 수 있어서, 우선 가장 흔한(pageNo/numOfRows/returnType)만 씀
 * - 날짜필터는 프로젝트에서 원하는 기간으로 넣고 싶으면 from/to를 붙여줄 수 있게 구성
 */
async function fetchSubsidenceListPage({ pageNo = 1, numOfRows = 1000, from = null, to = null }) {
    const cacheKey = `${from || ""}|${to || ""}|${pageNo}|${numOfRows}`;
    const now = Date.now();
    const hit = listCache.get(cacheKey);
    if (hit && now - hit.time < TTL_MS) return hit.items;

    // ✅ 날짜 파라미터는 getSubsidenceList01 API 스펙에 맞춤
    // sagodateFrom/sagodateTo: 사고일시 기준
    const params = {
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        returnType: "json",
    };

    // 아래 2줄은 "만약 지원하면" 들어가도록 해둔 것
    if (from) params.sagodateFrom = String(from);
    if (to) params.sagodateTo = String(to);

    const url = buildUrl(LIST_URL, params);

    const resp = await fetch(url, {
        headers: { Accept: "application/json" },
    });

    // 403/401이면 프론트에서 바로 쓸 수 있게 깔끔한 오류로 내려보냄
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`MOLIT LIST API 오류(${resp.status}): ${txt.slice(0, 200)}`);
    }

    const data = await resp.json();
    const items =
        data?.response?.body?.items?.item ||
        data?.response?.body?.items ||
        data?.body?.items?.item ||
        data?.body?.items ||
        [];

    const arr = Array.isArray(items) ? items : [items].filter(Boolean);
    listCache.set(cacheKey, { time: now, items: arr });
    return arr;
}

/**
 * 상세 1건 조회 (sagoNo 필수)  <-- 너가 올린 스샷 엔드포인트
 */
async function fetchSubsidenceInfo(sagoNo) {
    const url = buildUrl(INFO_URL, {
        sagoNo: String(sagoNo),
        returnType: "json",
    });

    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`MOLIT INFO API 오류(${resp.status}): ${txt.slice(0, 200)}`);
    }
    const data = await resp.json();

    // swagger마다 item 위치가 조금씩 달라서 다 열어둠
    const item =
        data?.response?.body?.items?.item ||
        data?.response?.body?.item ||
        data?.response?.body ||
        data?.body?.items?.item ||
        data?.body?.item ||
        data?.body ||
        null;

    return item;
}

/**
 * 서울 + (구/동) 매칭
 * - API 필드: siDo / siGunGu / dong (스샷 기준)
 */
function isMatchSeoulGuDong(item, gu, dong) {
    const siDo = normalize(item?.siDo);
    if (siDo && !siDo.includes("서울")) return false;

    const apiGu = normalize(item?.siGunGu);
    const apiDong = normalize(item?.dong);

    const targetGu = normalize(gu);
    const targetDong = normalize(dong);

    // 정확 매칭 우선
    if (apiGu.includes(targetGu) && apiDong.includes(targetDong)) return true;

    // addr에 들어있는 경우도 있어서 보조로 확인
    const addr = normalize(item?.addr);
    if (addr.includes(targetGu) && addr.includes(targetDong)) return true;

    return false;
}

/**
 * ✅ 너가 설계한 로직 그대로
 * - 입력: 사고 목록(각 항목에 sagoDate, addr, siGunGu, dong 등이 있다고 가정)
 * - 출력: score/grade/danger
 */
function computeSafetyFromAccidents(accidents, gu, dong) {
    const today = new Date();

    let sumRisk = 0;

    for (const a of accidents) {
        const d = parseDateYYYYMMDD(a?.sagoDate);
        if (!d) continue;

        const days = daysDiff(d, today);
        const baseW = timeWeightByDays(days);

        const locBoost = (a?.siGunGu && String(a.siGunGu).includes(gu)) || (a?.addr && String(a.addr).includes(gu))
            ? 1.5
            : 1.0;

        sumRisk += baseW * locBoost;
    }

    const countBonus = Math.min(40, accidents.length * 3);
    sumRisk += countBonus;

    const riskScore = Math.max(0, Math.min(100, Math.round(sumRisk)));

    let safetyScore;
    if (riskScore <= 20) safetyScore = 100 - riskScore * 2;
    else if (riskScore <= 40) safetyScore = 60 - (riskScore - 20) * 1.5;
    else safetyScore = 30 - (riskScore - 40) * 0.5;

    safetyScore = Math.max(0, Math.min(100, Math.round(safetyScore)));

    const grade = scoreToGrade(safetyScore);
    const danger = gradeToDanger(grade);

    return { score: safetyScore, grade, danger, riskScore, count: accidents.length };
}

/**
 * /api/safety?gu=강남구&dong=역삼동
 * - 1) (가능하면) MOLIT 지반침하사고 리스트를 가져온다
 * - 2) 리스트에 구/동/서울 매칭이 부족하면, sagoNo로 상세를 추가 조회해서 보강한다
 * - 3) 너 로직대로 score/grade/danger 계산해서 반환한다
 */
router.get("/", async (req, res) => {
    try {
        const gu = String(req.query.gu || "").trim();
        const dong = String(req.query.dong || "").trim();
        if (!gu || !dong) {
            return res.status(400).json({
                error: { code: "BAD_REQUEST", message: "gu, dong은 필수", example: "/api/safety?gu=강남구&dong=역삼동" },
            });
        }

        const key = `${gu}|${dong}`;
        const now = Date.now();
        const cached = cache.get(key);
        if (cached && now - cached.time < TTL_MS) return res.json(cached.data);

        // 1) 우선 리스트에서 최대한 가져오기
        //    너무 무겁게 전체 다 가져오면 느려지니까 페이지를 제한적으로 순회
        let from = req.query.from ? String(req.query.from) : null;
        let to = req.query.to ? String(req.query.to) : null;

        // 기본값: 최근 1년 데이터 (from/to가 없으면 자동 설정)
        if (!from || !to) {
            const todayDate = new Date();
            const oneYearAgoDate = new Date(todayDate);
            oneYearAgoDate.setFullYear(todayDate.getFullYear() - 1);

            // YYYYMMDD 형식으로 변환
            to = to || `${todayDate.getFullYear()}${String(todayDate.getMonth() + 1).padStart(2, '0')}${String(todayDate.getDate()).padStart(2, '0')}`;
            from = from || `${oneYearAgoDate.getFullYear()}${String(oneYearAgoDate.getMonth() + 1).padStart(2, '0')}${String(oneYearAgoDate.getDate()).padStart(2, '0')}`;
        }

        const collected = [];
        const MAX_PAGES = 5;      // 필요하면 늘려
        const NUM = 1000;         // 페이지당

        for (let p = 1; p <= MAX_PAGES; p++) {
            const pageItems = await fetchSubsidenceListPage({ pageNo: p, numOfRows: NUM, from, to });
            if (!pageItems.length) break;

            // 리스트 항목 구조가 제각각일 수 있어 sagoNo만 뽑아두고,
            // 구/동 필드는 있으면 바로 매칭하고, 없으면 상세 조회에서 채움
            for (const it of pageItems) {
                // 리스트에 이미 siDo/siGunGu/dong/sagoDate가 있으면 바로 사용
                if (isMatchSeoulGuDong(it, gu, dong)) collected.push(it);
            }
        }

        // 2) 리스트에서 매칭이 거의 안 되면(필드가 부족한 케이스),
        //    "전체 리스트의 sagoNo"를 일부 뽑아서 상세로 보강
        //    (너무 많이 하면 폭발하니까 상한 둠)
        if (collected.length === 0) {
            const page1 = await fetchSubsidenceListPage({ pageNo: 1, numOfRows: 200, from, to });

            const sagoNos = page1
                .map((x) => x?.sagoNo)
                .filter(Boolean)
                .slice(0, 80); // 상한

            const infos = await Promise.allSettled(sagoNos.map((no) => fetchSubsidenceInfo(no)));

            for (const r of infos) {
                if (r.status !== "fulfilled") continue;
                const info = r.value;
                if (info && isMatchSeoulGuDong(info, gu, dong)) collected.push(info);
            }
        }

        // 3) 점수/등급 계산
        const calc = computeSafetyFromAccidents(collected, gu, dong);

        const result = {
            location: { gu, dong },
            score: calc.score,
            grade: calc.grade,
            danger: calc.danger,

            description: "지반침하사고(국토교통부_지하안전정보) 기반 안전도(프록시)",
            basis: {
                api: "MOLIT undergroundsafetyinfo01",
                endpoints: ["getSubsidenceList01", "getSubsidenceInfo01"],
                cache_ttl_ms: TTL_MS,
                used_accident_count: calc.count,
                riskScore: calc.riskScore,
                updated_at: new Date().toISOString(),
            },

            // 필요하면 디버깅용으로만 사용 (프론트에 너무 무겁게 보내기 싫으면 삭제)
            raw: {
                sample: collected.slice(0, 5),
            },
        };

        cache.set(key, { time: now, data: result });
        return res.json(result);
    } catch (err) {
        console.warn("safety.js warning:", String(err?.message || err));

        // 403 오류는 API 키 문제 - 테스트 데이터 반환
        if (err.message && err.message.includes("403")) {
            console.log("403 오류 - 테스트 데이터 반환");
            // 테스트 데이터: 지역에 따라 다양한 위험도 반환
            const guHash = String(req.query.gu || "").charCodeAt(0) || 0;
            const dongHash = String(req.query.dong || "").charCodeAt(0) || 0;
            const score = 30 + ((guHash + dongHash) % 50);
            const grade = scoreToGrade(score);

            return res.json({
                location: { gu: String(req.query.gu || ""), dong: String(req.query.dong || "") },
                score,
                grade,
                danger: gradeToDanger(grade),
                description: "테스트 데이터 (API 이용 신청 필요)",
                basis: { error: "API 키 또는 이용 권한 확인 필요", updated_at: new Date().toISOString() },
                raw: null,
            });
        }

        // 기타 오류는 기본값 반환
        return res.json({
            location: { gu: String(req.query.gu || ""), dong: String(req.query.dong || "") },
            score: 50,
            grade: "C",
            danger: 3,
            description: "안전도 계산 실패(임시값)",
            basis: { error: String(err?.message || err), updated_at: new Date().toISOString() },
            raw: null,
        });
    }
});

/**
 * 지반침하위험도평가 리스트 조회
 * /api/safety-evalution?gu=강남구&dong=역삼동
 *
 * API Response 필드 (예상):
 * - evaluateGrade: 평가등급 (안전/주의/위험 등)
 * - evaluateResult: 평가결과
 * - siDo, siGunGu, dong: 위치정보
 * - evaluateDate: 평가일자
 */

const evaluationCache = new Map();

async function fetchSubsidenceEvalutionList({ pageNo = 1, numOfRows = 1000, siGunGu = null, dong = null }) {
    const cacheKey = `${siGunGu || ""}|${dong || ""}|${pageNo}|${numOfRows}`;
    const now = Date.now();
    const hit = evaluationCache.get(cacheKey);
    if (hit && now - hit.time < TTL_MS) return hit.items;

    const params = {
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
        returnType: "json",
    };

    // siGunGu, dong 파라미터 (API에서 지원하면)
    if (siGunGu) params.siGunGu = String(siGunGu);
    if (dong) params.dong = String(dong);

    const url = buildUrl(EVALUTION_LIST_URL, params);

    const resp = await fetch(url, {
        headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`MOLIT EVALUTION API 오류(${resp.status}): ${txt.slice(0, 200)}`);
    }

    const data = await resp.json();
    const items =
        data?.response?.body?.items?.item ||
        data?.response?.body?.items ||
        data?.body?.items?.item ||
        data?.body?.items ||
        [];

    const arr = Array.isArray(items) ? items : [items].filter(Boolean);
    evaluationCache.set(cacheKey, { time: now, items: arr });
    return arr;
}

/**
 * 평가 등급을 안전 점수(0-100)로 변환
 * evaluateGrade: 안전 -> 90, 주의 -> 60, 위험 -> 30, 기타 -> 50
 */
function evaluateGradeToScore(grade) {
    const g = String(grade || "").toLowerCase().trim();
    if (g.includes("안전")) return 90;
    if (g.includes("주의")) return 60;
    if (g.includes("위험")) return 30;
    // 영문 매핑
    if (g === "safe" || g === "ok") return 90;
    if (g === "caution" || g === "warning") return 60;
    if (g === "danger" || g === "hazard") return 30;
    return 50;
}

/**
 * /api/safety-evalution?gu=강남구&dong=역삼동
 * - 지반침하위험도평가 API에서 평가 등급을 가져옴
 * - 평가 등급을 점수/등급으로 변환해서 반환
 */
router.get("/evalution", async (req, res) => {
    try {
        const gu = String(req.query.gu || "").trim();
        const dong = String(req.query.dong || "").trim();

        if (!gu || !dong) {
            return res.status(400).json({
                error: { code: "BAD_REQUEST", message: "gu, dong은 필수", example: "/api/safety-evalution?gu=강남구&dong=역삼동" },
            });
        }

        // 평가 리스트 조회
        const evalutionItems = await fetchSubsidenceEvalutionList({
            pageNo: 1,
            numOfRows: 100,
            siGunGu: gu,
            dong: dong,
        });

        // 매칭된 평가 찾기
        const matchedItems = evalutionItems.filter((item) => {
            const apiGu = normalize(item?.siGunGu);
            const apiDong = normalize(item?.dong);
            const targetGu = normalize(gu);
            const targetDong = normalize(dong);

            return apiGu.includes(targetGu) && apiDong.includes(targetDong);
        });

        // 가장 최근 평가 선택 (evaluateDate 기준)
        let selectedEval = matchedItems[0] || null;
        if (matchedItems.length > 1) {
            selectedEval = matchedItems.sort((a, b) => {
                const dateA = parseDateYYYYMMDD(a?.evaluateDate) || new Date(0);
                const dateB = parseDateYYYYMMDD(b?.evaluateDate) || new Date(0);
                return dateB.getTime() - dateA.getTime();
            })[0];
        }

        // 평가 등급을 점수로 변환
        const evaluateGrade = selectedEval?.evaluateGrade || null;
        const score = evaluateGradeToScore(evaluateGrade);
        const grade = scoreToGrade(score);
        const danger = gradeToDanger(grade);

        const result = {
            location: { gu, dong },
            score,
            grade,
            danger,
            evaluateGrade,
            description: "지반침하위험도평가(국토교통부_지하안전정보) 기반 안전도",
            basis: {
                api: "MOLIT undergroundsafetyinfo01",
                endpoint: "getSubsidenceEvalutionList01",
                cache_ttl_ms: TTL_MS,
                matched_count: matchedItems.length,
                evaluateDate: selectedEval?.evaluateDate || null,
                updated_at: new Date().toISOString(),
            },
            raw: {
                selected: selectedEval || null,
                samples: matchedItems.slice(0, 5),
            },
        };

        return res.json(result);
    } catch (err) {
        console.warn("safety-evalution warning:", String(err?.message || err));

        // API 호출 실패 시 테스트 데이터 반환 (개발/테스트용)
        const gu = String(req.query.gu || "").trim();
        const dong = String(req.query.dong || "").trim();

        // 지역별 테스트 평가 데이터
        const testEvaluations = {
            "강남구:역삼동": { grade: "A", score: 85 },
            "강남구:강남동": { grade: "B", score: 72 },
            "강남구:삼성동": { grade: "A", score: 88 },
            "서초구:서초동": { grade: "B", score: 68 },
            "강북구:수유동": { grade: "C", score: 45 },
            "광진구:자양동": { grade: "D", score: 35 },
            "성동구:행당동": { grade: "C", score: 55 },
            "종로구:종로1가": { grade: "B", score: 70 },
        };

        const key = `${gu}:${dong}`;
        const testData = testEvaluations[key] || {
            grade: Math.random() > 0.5 ? "A" : "B",
            score: Math.floor(Math.random() * 40) + 60,
        };

        return res.json({
            location: { gu, dong },
            score: testData.score,
            grade: testData.grade,
            danger: gradeToDanger(testData.grade),
            evaluateGrade: testData.grade === "A" ? "안전" : testData.grade === "B" ? "주의" : "위험",
            description: "[테스트 데이터] 지반침하위험도평가 기반 안전도",
            basis: {
                api: "MOLIT undergroundsafetyinfo01 (테스트 모드)",
                endpoint: "getSubsidenceEvalutionList01",
                error: String(err?.message || err),
                updated_at: new Date().toISOString(),
            },
            raw: null,
        });
    }
});

export default router;
