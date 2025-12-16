import { Router } from "express";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const router = Router();

const SERVICE_KEY = process.env.MOLIT_RISK_API_KEY;
const BASE_URL = "https://apis.data.go.kr/1613000/undergroundsafetyinfo01";

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true
});

let cachedData = null;
let cacheTimestamp = null;
let isUpdating = false;
const CACHE_DURATION = 10 * 60 * 1000;

/* ---------------- 유틸 ---------------- */

function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
}

function calcGrade(width, depth) {
    const w = Number(width || 0);
    const d = Number(depth || 0);

    if (d >= 1.5 || w >= 3.0) return { grade: "D", danger: 4 };
    if (d >= 1.0 || w >= 1.5) return { grade: "C", danger: 3 };
    if (d >= 0.4 || w >= 0.5) return { grade: "B", danger: 2 };
    return { grade: "A", danger: 1 };
}

function worse(a, b) {
    return a.danger >= b.danger ? a : b;
}

/* ---------------- 데이터 수집 함수 ---------------- */

async function fetchSeoulSafetyData() {
    if (isUpdating) {
        console.log("⏳ 이미 업데이트 중입니다. 스킵...");
        return;
    }

    isUpdating = true;
    console.log("\n🔄 서울 지반침하 안전도 조회 시작\n");

    try {
        // 1단계: 서울 사고번호 수집
        console.log("📋 1단계: 서울 사고번호 수집 중...\n");

        const allSeoulSagoNos = [];

        for (let monthOffset = 0; monthOffset < 5; monthOffset++) {
            console.log(`   [${monthOffset + 1}/5] ${monthOffset}개월 전 데이터`);

            const end = new Date();
            end.setMonth(end.getMonth() - monthOffset);

            const start = new Date(end);
            start.setMonth(end.getMonth() - 1);

            const fromDate = formatDate(start);
            const toDate = formatDate(end);

            console.log(`   기간: ${fromDate} ~ ${toDate}`);

            const listUrl =
                `${BASE_URL}/getSubsidenceList01` +
                `?serviceKey=${encodeURIComponent(SERVICE_KEY)}` +
                `&pageNo=1&numOfRows=500&type=xml` +
                `&sagoDateFrom=${fromDate}&sagoDateTo=${toDate}`;

            try {
                const listRes = await fetch(listUrl);

                if (!listRes.ok) {
                    console.log(`   ❌ HTTP ${listRes.status}\n`);
                    continue;
                }

                const xmlText = await listRes.text();
                const listData = xmlParser.parse(xmlText);
                let items = listData?.resonse?.body?.items?.item;

                if (!items) {
                    console.log(`   ℹ️  데이터 없음\n`);
                    continue;
                }

                const itemArray = Array.isArray(items) ? items : [items];
                const seoulList = itemArray.filter(i => i.sido === "서울특별시");

                console.log(`   전체: ${itemArray.length}건 → 서울: ${seoulList.length}건`);

                if (seoulList.length > 0) {
                    const sagoNos = seoulList.map(acc => acc.sagoNo);
                    allSeoulSagoNos.push(...sagoNos);
                    console.log(`   📋 수집: ${sagoNos.join(", ")}`);
                }

                console.log("");

                if (monthOffset < 4) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (rangeErr) {
                console.log(`   ❌ 기간 조회 실패: ${rangeErr.message}\n`);
            }
        }

        console.log(`✅ 1단계 완료: 총 ${allSeoulSagoNos.length}건 수집`);
        console.log(`📋 사고번호: ${allSeoulSagoNos.join(", ")}\n`);

        // 2단계: 상세 정보 조회
        console.log("📝 2단계: 상세 정보 조회 중...\n");

        const allResults = {};
        let totalSuccess = 0;
        let totalFail = 0;

        for (let i = 0; i < allSeoulSagoNos.length; i++) {
            const sagoNo = allSeoulSagoNos[i];

            console.log(`   [${i + 1}/${allSeoulSagoNos.length}] 사고번호 ${sagoNo} 조회 중...`);

            const infoUrl =
                `${BASE_URL}/getSubsidenceInfo01` +
                `?serviceKey=${encodeURIComponent(SERVICE_KEY)}` +
                `&pageNo=1&numOfRows=1&type=xml` +
                `&sagoNo=${sagoNo}`;

            try {
                const r = await fetch(infoUrl);

                if (!r.ok) {
                    console.log(`      ❌ HTTP ${r.status}`);

                    if (r.status === 429) {
                        console.log(`      ⏳ Rate Limit, 15초 대기 후 재시도...`);
                        await new Promise(resolve => setTimeout(resolve, 15000));

                        const retry = await fetch(infoUrl);
                        if (!retry.ok) {
                            console.log(`      ❌ 재시도 실패: HTTP ${retry.status}`);
                            totalFail++;
                            continue;
                        }

                        const retryXml = await retry.text();
                        const retryData = xmlParser.parse(retryXml);
                        let retryDetail = retryData?.resonse?.body?.items?.item;

                        if (!retryDetail) {
                            console.log(`      ⚠️  응답 데이터 없음`);
                            totalFail++;
                            continue;
                        }

                        const rd = Array.isArray(retryDetail) ? retryDetail[0] : retryDetail;

                        if (!rd || !rd.sigungu || !rd.dong) {
                            console.log(`      ⚠️  구/동 정보 없음`);
                            totalFail++;
                            continue;
                        }

                        const sigungu = rd.sigungu;
                        const dong = rd.dong;
                        const sinkWidth = rd.sinkWidth;
                        const sinkDepth = rd.sinkDepth;

                        console.log(`      ✅ 구: ${sigungu}, 동: ${dong}, 폭: ${sinkWidth}m, 깊이: ${sinkDepth}m`);

                        const grade = calcGrade(sinkWidth, sinkDepth);
                        const key = `${sigungu}-${dong}`;

                        console.log(`      📊 등급: ${grade.grade} (위험도 ${grade.danger})`);

                        // ✅ 개별 사고 정보 저장
                        if (!allResults[key]) {
                            allResults[key] = {
                                gu: sigungu,
                                dong: dong,
                                grade: grade.grade,
                                danger: grade.danger,
                                accidentCount: 1,
                                accidents: [{
                                    sagoNo: rd.sagoNo,
                                    width: sinkWidth,
                                    depth: sinkDepth,
                                    grade: grade.grade,
                                    danger: grade.danger,
                                    date: rd.sagoDate
                                }]
                            };
                        } else {
                            const worstGrade = worse(allResults[key], grade);
                            allResults[key] = {
                                ...allResults[key],
                                grade: worstGrade.grade,
                                danger: worstGrade.danger,
                                accidentCount: allResults[key].accidentCount + 1,
                            };
                            // ✅ 사고 목록에 추가
                            allResults[key].accidents.push({
                                sagoNo: rd.sagoNo,
                                width: sinkWidth,
                                depth: sinkDepth,
                                grade: grade.grade,
                                danger: grade.danger,
                                date: rd.sagoDate
                            });
                        }

                        totalSuccess++;

                        if (i < allSeoulSagoNos.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 5000));
                        }

                        continue;
                    }

                    totalFail++;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                const detailXml = await r.text();
                const detailData = xmlParser.parse(detailXml);
                let detail = detailData?.resonse?.body?.items?.item;

                if (!detail) {
                    console.log(`      ⚠️  응답 데이터 없음`);
                    totalFail++;
                    continue;
                }

                const d = Array.isArray(detail) ? detail[0] : detail;

                if (!d || !d.sigungu || !d.dong) {
                    console.log(`      ⚠️  구/동 정보 없음`);
                    totalFail++;
                    continue;
                }

                const sigungu = d.sigungu;
                const dong = d.dong;
                const sinkWidth = d.sinkWidth;
                const sinkDepth = d.sinkDepth;

                console.log(`      ✅ 구: ${sigungu}, 동: ${dong}, 폭: ${sinkWidth}m, 깊이: ${sinkDepth}m`);

                const grade = calcGrade(sinkWidth, sinkDepth);
                const key = `${sigungu}-${dong}`;

                console.log(`      📊 등급: ${grade.grade} (위험도 ${grade.danger})`);

                // ✅ 개별 사고 정보 저장
                if (!allResults[key]) {
                    allResults[key] = {
                        gu: sigungu,
                        dong: dong,
                        grade: grade.grade,
                        danger: grade.danger,
                        accidentCount: 1,
                        accidents: [{
                            sagoNo: d.sagoNo,
                            width: sinkWidth,
                            depth: sinkDepth,
                            grade: grade.grade,
                            danger: grade.danger,
                            date: d.sagoDate
                        }]
                    };
                } else {
                    const worstGrade = worse(allResults[key], grade);
                    allResults[key] = {
                        ...allResults[key],
                        grade: worstGrade.grade,
                        danger: worstGrade.danger,
                        accidentCount: allResults[key].accidentCount + 1,
                    };
                    // ✅ 사고 목록에 추가
                    allResults[key].accidents.push({
                        sagoNo: d.sagoNo,
                        width: sinkWidth,
                        depth: sinkDepth,
                        grade: grade.grade,
                        danger: grade.danger,
                        date: d.sagoDate
                    });
                }

                totalSuccess++;

                if (i < allSeoulSagoNos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

            } catch (detailErr) {
                console.log(`      ❌ 예외: ${detailErr.message}`);
                totalFail++;
            }

            console.log("");
        }

        // ✅ 각 동의 사고 목록을 위험도 순으로 정렬
        Object.values(allResults).forEach((result) => {
            if (result.accidents) {
                result.accidents.sort((a, b) => b.danger - a.danger);
            }
        });

        const results = Object.values(allResults).sort((a, b) => {
            if (b.danger !== a.danger) return b.danger - a.danger;
            return b.accidentCount - a.accidentCount;
        });

        console.log(`\n✅ === 최종 결과 ===`);
        console.log(`   총 서울 사고: ${allSeoulSagoNos.length}건`);
        console.log(`   성공: ${totalSuccess}건, 실패: ${totalFail}건`);
        console.log(`   구/동 개수: ${results.length}곳`);

        if (results.length > 0) {
            console.log(`\n   🔴 가장 위험한 지역 TOP 5:`);
            results.slice(0, 5).forEach((r, i) => {
                console.log(`      ${i + 1}. ${r.gu} ${r.dong} - ${r.grade}등급 (사고 ${r.accidentCount}건)`);
            });
        }

        cachedData = {
            data: results,
            meta: {
                period: "최근 5개월",
                totalSeoulAccidents: allSeoulSagoNos.length,
                successCount: totalSuccess,
                failCount: totalFail,
                distinctLocations: results.length,
                fetchedAt: new Date().toISOString(),
                nextUpdate: new Date(Date.now() + CACHE_DURATION).toISOString()
            }
        };
        cacheTimestamp = Date.now();

        console.log(`\n💾 데이터 캐시 저장 완료 (10분 후 자동 갱신)\n`);

    } catch (err) {
        console.error("❌ 데이터 수집 에러:", err);
    } finally {
        isUpdating = false;
    }
}

/* ---------------- 메인 API 엔드포인트 ---------------- */

router.get("/", async (req, res) => {
    try {
        if (cachedData) {
            const age = Math.floor((Date.now() - cacheTimestamp) / 1000);
            console.log(`💾 캐시된 데이터 반환 (${age}초 전 갱신됨)`);

            return res.json({
                ...cachedData,
                meta: {
                    ...cachedData.meta,
                    cacheAge: `${age}초 전`,
                    isUpdating: isUpdating
                }
            });
        }

        console.log("⏳ 초기 데이터 수집 대기 중...");
        res.json({
            data: [],
            meta: {
                message: "데이터 수집 중입니다. 잠시 후 다시 시도해주세요.",
                isUpdating: true
            }
        });

    } catch (err) {
        console.error("❌ API 에러:", err);
        res.status(500).json({
            error: "서울 지반침하 안전도 조회 실패",
            detail: err.message,
        });
    }
});

router.post("/refresh", async (req, res) => {
    if (isUpdating) {
        return res.status(429).json({
            message: "이미 업데이트가 진행 중입니다."
        });
    }

    fetchSeoulSafetyData().catch(console.error);

    res.json({
        message: "데이터 갱신을 시작했습니다.",
        estimatedTime: "약 1-2분 소요"
    });
});

router.get("/status", (req, res) => {
    if (!cachedData) {
        return res.json({
            status: "no_cache",
            message: "캐시된 데이터가 없습니다.",
            isUpdating
        });
    }

    const age = Math.floor((Date.now() - cacheTimestamp) / 1000);
    const nextUpdate = Math.max(0, Math.ceil((CACHE_DURATION - (Date.now() - cacheTimestamp)) / 1000));

    res.json({
        status: "ok",
        cacheAge: `${age}초`,
        nextUpdateIn: `${nextUpdate}초`,
        dataCount: cachedData.data.length,
        isUpdating,
        lastFetched: cachedData.meta.fetchedAt
    });
});

console.log("\n🚀 서버 시작: 초기 데이터 수집 시작...\n");
fetchSeoulSafetyData().catch(console.error);

const updateInterval = setInterval(() => {
    console.log("\n⏰ 정기 갱신 시작 (10분 주기)\n");
    fetchSeoulSafetyData().catch(console.error);
}, CACHE_DURATION);

process.on('SIGTERM', () => {
    console.log('서버 종료 중...');
    clearInterval(updateInterval);
    process.exit(0);
});

export default router;