import { Router } from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = Router();

// MOLIT underground safety info (지하안전정보) API
const API_KEY = process.env.MOLIT_RISK_API_KEY;
// 지반침하위험도평가 리스트 조회 (MOLITJIS-07)
// 명세: getSubsidenceEvalutionList01
const API_BASE_URL = "https://apis.data.go.kr/1613000/undergroundsafetyinfo01/getSubsidenceEvalutionList01";

let _cache = {};
let _cacheTime = {};
const TTL_MS = 24 * 60 * 60 * 1000; // 24시간 캐시

function normalize(str = "") {
    return String(str).trim().toLowerCase();
}

function pickGrade(item) {
    const raw = (item.EVL_GRD || item.RSK_GRD || item.GRD || item.GRADE || item.EVL_GRAD || item.RISK_GRAD || "").toString().trim();
    if (!raw) return "";
    const g = raw[0].toUpperCase();
    if (["A", "B", "C", "D", "E"].includes(g)) return g;
    return "";
}

function pickScore(item) {
    const candidate = [
        item.EVL_SCR,
        item.SCORE,
        item.RSK_VAL,
        item.TOT_SCORE,
        item.EVL_SCORE,
        item.POINT
    ].find((v) => v !== undefined && v !== null && v !== "");
    const num = Number(candidate);
    return Number.isFinite(num) ? num : null;
}

function gradeToDanger(grade) {
    const map = { A: 1, B: 2, C: 3, D: 4, E: 5 };
    return map[grade] ?? 3;
}

function scoreToDanger(score) {
    if (!Number.isFinite(score)) return 3;
    // API 기준: 점수 높을수록 안전함 (국토교통부 표준)
    if (score >= 80) return 1; // A등급 - 매우 안전
    if (score >= 60) return 2; // B등급 - 안전
    if (score >= 40) return 3; // C등급 - 보통
    if (score >= 20) return 4; // D등급 - 위험
    return 5; // E등급 - 매우 위험
}

/**
 * 지반침하 사고 데이터를 이용한 프록시 위험도 계산
 * Notices 라우트를 통해 서울 사고 목록을 가져와 구/동 키워드로 필터링 후
 * 최근성(+가중치), 건수 기반 점수 산출
 */
async function fetchAccidentProxy(gu, dong) {
    const baseUrl = process.env.PUBLIC_BACKEND_URL || "http://localhost:3001";
    // 동 매칭이 희박할 수 있어 구 중심 + 서울 키워드로 확대
    const keywords = `${gu},서울,지반침하,싱크홀,사고`;
    const url = `${baseUrl}/api/notices?keywords=${encodeURIComponent(keywords)}&limit=100`;
    const resp = await fetch(url, { timeout: 10000 });
    if (!resp.ok) throw new Error(`Notices 응답 오류: ${resp.status}`);
    const notices = await resp.json();
    if (!Array.isArray(notices) || notices.length === 0) return null;

    // 구/동 필터링: 제목/설명/위치에 구, 동 포함 여부로 가중치
    const nGu = normalize(gu);
    const nDong = normalize(dong);
    const scored = notices.map((n) => {
        const text = `${n.title || ""} ${n.description || ""} ${n.location || ""}`.toLowerCase();
        const hitGu = text.includes(nGu) ? 1 : 0;
        const hitDong = text.includes(nDong) ? 1 : 0;
        return { n, hitGu, hitDong };
    });
    const filteredNotices = scored.filter(s => s.hitGu || s.hitDong).map(s => s.n);
    const targetNotices = filteredNotices.length ? filteredNotices : notices;

    // 점수 계산: 최근일수 역가중 + 건수
    const today = new Date();
    let scoreAcc = 0;
    let recentCount = 0; // 최근 1년 내 사고 수

    for (const n of targetNotices) {
        const d = new Date(n.date);
        const days = Math.max(1, Math.floor((today - d) / (1000 * 60 * 60 * 24)));

        // 최근 1년 사고는 카운트
        if (days <= 365) recentCount++;

        // 가중치: 최근일수록 높은 점수 (더 민감하게 조정)
        let baseW = 0;
        if (days <= 30) baseW = 30;        // 1개월 이내: 30점
        else if (days <= 90) baseW = 25;   // 3개월 이내: 25점
        else if (days <= 180) baseW = 20;  // 6개월 이내: 20점
        else if (days <= 365) baseW = 15;  // 1년 이내: 15점
        else if (days <= 730) baseW = 10;  // 2년 이내: 10점
        else baseW = 5;                     // 2년 이상: 5점

        const locBoost = (n.location && n.location.includes(gu)) ? 1.5 : 1.0;
        scoreAcc += baseW * locBoost;
    }

    // 건수 보너스: 사고가 많을수록 추가 점수 (더 강하게)
    const countBonus = Math.min(40, targetNotices.length * 3);
    scoreAcc += countBonus;

    // 위험도 점수 계산 (사고 많을수록 높음)
    const riskScore = Math.max(0, Math.min(100, Math.round(scoreAcc)));

    // 점수를 더 다양하게 분포시키기 위해 비선형 변환
    // 적은 사고도 점수에 더 큰 영향을 주도록 조정
    let proxyScore;
    if (riskScore <= 20) {
        proxyScore = 100 - riskScore * 2; // 0~20 → 100~60
    } else if (riskScore <= 40) {
        proxyScore = 60 - (riskScore - 20) * 1.5; // 20~40 → 60~30
    } else {
        proxyScore = 30 - (riskScore - 40) * 0.5; // 40~100 → 30~0
    }
    proxyScore = Math.max(0, Math.min(100, Math.round(proxyScore)));

    const danger = scoreToDanger(proxyScore);
    // 등급 계산: API 기준 (점수 높을수록 안전)
    let proxyGrade = 'E';
    if (proxyScore >= 80) proxyGrade = 'A';
    else if (proxyScore >= 60) proxyGrade = 'B';
    else if (proxyScore >= 40) proxyGrade = 'C';
    else if (proxyScore >= 20) proxyGrade = 'D';

    return {
        location: { gu, dong },
        score: proxyScore,
        grade: proxyGrade,
        danger,
        description: "사고 데이터 기반 위험도(프록시)",
        basis: {
            window: "accidents-1y",
            fields_used: { notices: true },
            updated_at: new Date().toISOString(),
            data_source: "proxy:notices",
        },
        raw: { count: notices.length },
    };
}

function matchesLocation(item, gu, dong) {
    const nGu = normalize(gu);
    const nDong = normalize(dong);

    const guFields = [item.SGG_NM, item.SIGUNGU_NM, item.SIGUNGU, item.GU_NM];
    const dongFields = [item.EMD_NM, item.DONG_NM, item.DONG, item.EUPMYEON_DONG, item.HJD_NAM];

    const hasGu = guFields.some((f) => normalize(f).includes(nGu));
    const hasDong = dongFields.some((f) => normalize(f).includes(nDong));

    if (hasGu && hasDong) return true;

    // fallback: EVL_NM에 모두 포함되는지 검사
    const evl = normalize(item.EVL_NM);
    return evl.includes(nGu) && evl.includes(nDong);
}

async function fetchFromAPI(gu, dong) {
    if (!API_KEY || API_KEY === 'your_molit_key_here') {
        // API 키가 없으면 null 반환 (폴백 로직이 처리)
        return null;
    }

    const cacheKey = `${gu}-${dong}`;
    const now = Date.now();

    if (_cache[cacheKey] && now - _cacheTime[cacheKey] < TTL_MS) {
        return _cache[cacheKey];
    }

    // serviceKey는 인코딩하지 않고 그대로 사용 (공공데이터포털 표준)
    // 필수 파라미터(pageNo, numOfRows, returnType) 포함
    const params = new URLSearchParams({
        serviceKey: API_KEY,
        pageNo: "1",
        numOfRows: "100",
        returnType: "json"
    });
    let url = `${API_BASE_URL}?${params.toString()}`;

    let response = await fetch(url, {
        timeout: 10000,
        headers: {
            // 일부 공공 API가 User-Agent/Accept를 요구할 수 있음
            "Accept": "application/json",
            "User-Agent": "SinkholeSafetyService/1.0 (+http://localhost:3001)"
        }
    });

    if (!response.ok) {
        console.warn(`MOLIT API 오류: ${response.status}`);
        const errorText = await response.text();
        console.warn(`응답 내용: ${errorText.substring(0, 200)}`);
        // 401/403 인증 오류인 경우 null 반환 (폴백 로직이 처리)
        if (response.status === 401 || response.status === 403) {
            return null;
        }
        throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const items = data?.response?.body?.items?.item
        || data?.response?.body?.items
        || data?.body
        || [];

    if (!Array.isArray(items)) {
        throw new Error("API 응답 형식이 예상과 다릅니다");
    }

    const filtered = items.filter((item) => matchesLocation(item, gu, dong));
    const item = filtered[0];

    // 목록에서 해당 구/동 매칭이 없으면 null 반환 (폴백 로직이 처리)
    if (!item) {
        return null;
    }

    const grade = item ? pickGrade(item) : "";
    const score = item ? pickScore(item) : null;
    const danger = grade ? gradeToDanger(grade) : scoreToDanger(score);

    const result = {
        location: { gu, dong },
        score: score ?? 50,
        grade: grade || "UNKNOWN",
        danger,
        description: item?.EVL_NM || "지반침하 위험도",
        basis: {
            window: "latest",
            fields_used: {
                grade_field: grade ? "EVL_GRD|RSK_GRD|GRD" : null,
                score_field: score !== null ? "EVL_SCR|SCORE|RSK_VAL" : null,
            },
            updated_at: new Date().toISOString(),
            data_source: "MOLIT underground safety info (getSubsidenceEvalutionList01)",
        },
        raw: item || null,
    };

    _cache[cacheKey] = result;
    _cacheTime[cacheKey] = now;
    return result;
}

router.get("/", async (req, res) => {
    try {
        const { gu, dong } = req.query;

        if (!gu || !dong) {
            return res.status(400).json({
                error: {
                    code: "BAD_REQUEST",
                    message: "구(gu)와 동(dong) 파라미터는 필수입니다",
                    example: "/api/safety?gu=강남구&dong=역삼동",
                },
            });
        }

        let result = await fetchFromAPI(gu, dong);

        // 데이터가 없으면 사고 기반 프록시로 보강
        if (!result || (result.grade === "UNKNOWN" && result.score === 50)) {
            try {
                const proxy = await fetchAccidentProxy(String(gu), String(dong));
                if (proxy) {
                    result = proxy;
                }
            } catch (e) {
                console.warn("Accident proxy 실패:", e.message);
            }
        }
        res.json(result);
    } catch (error) {
        console.error("Safety API 오류:", error);
        // 오류 시에도 사고 프록시 우선 시도
        try {
            const gu = String(req.query.gu || "");
            const dong = String(req.query.dong || "");
            const proxy = await fetchAccidentProxy(gu, dong);
            if (proxy) {
                return res.json(proxy);
            }
        } catch (e) {
            console.warn("오류 처리 중 Accident proxy 실패:", e.message);
        }
        // 프록시도 실패하면 Fallback 반환
        res.json({
            location: { gu: String(req.query.gu || ""), dong: String(req.query.dong || "") },
            score: 50,
            grade: "UNKNOWN",
            danger: 3,
            description: "위험도 데이터 없음(서비스 일시 오류)",
            basis: {
                window: "latest",
                fields_used: null,
                updated_at: new Date().toISOString(),
                data_source: "fallback",
            },
            raw: null,
        });
    }
});

export default router;
