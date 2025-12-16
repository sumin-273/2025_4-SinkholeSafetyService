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

    if (d >= 1.5 || w >= 3.0) return { grade: "E", danger: 5 };
    if (d >= 1.0 || w >= 1.5) return { grade: "D", danger: 4 };
    if (d >= 0.7 || w >= 1.0) return { grade: "C", danger: 3 };
    if (d >= 0.4 || w >= 0.5) return { grade: "B", danger: 2 };

    return { grade: "A", danger: 1 };
}

function worse(a, b) {
    return a.danger >= b.danger ? a : b;
}

/* ---------------- 메인 API ---------------- */

router.get("/", async (req, res) => {
    try {
        console.log("\n🔄 서울 지반침하 안전도 조회 시작\n");

        // ========================================
        // 1단계: 서울 사고번호 수집
        // ========================================
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

        // ========================================
        // 2단계: 상세 정보 조회
        // ========================================
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

                        // 재시도
                        const retry = await fetch(infoUrl);
                        if (!retry.ok) {
                            console.log(`      ❌ 재시도 실패: HTTP ${retry.status}`);
                            totalFail++;
                            continue;
                        }

                        const retryXml = await retry.text();

                        // 첫 성공 시 디버깅
                        if (totalSuccess === 0) {
                            console.log(`      🔍 XML 응답 샘플:\n${retryXml.substring(0, 500)}\n`);
                        }

                        const retryData = xmlParser.parse(retryXml);

                        if (totalSuccess === 0) {
                            console.log(`      🔍 파싱 구조:`, JSON.stringify(retryData, null, 2).substring(0, 600), "\n");
                        }

                        let retryDetail = retryData?.resonse?.body?.items?.item;

                        if (!retryDetail) {
                            console.log(`      ⚠️  응답 데이터 없음`);
                            totalFail++;
                            continue;
                        }

                        const rd = Array.isArray(retryDetail) ? retryDetail[0] : retryDetail;

                        // siGunGu, dong 확인
                        if (!rd || !rd.sigungu || !rd.dong) {
                            console.log(`      ⚠️  구/동 정보 없음`);
                            console.log(`      🔍 실제 키:`, Object.keys(rd || {}));
                            totalFail++;
                            continue;
                        }

                        // ✅ siGunGu, dong, sinkWidth, sinkDepth 추출
                        const sigungu = rd.sigungu;
                        const dong = rd.dong;
                        const sinkWidth = rd.sinkWidth;
                        const sinkDepth = rd.sinkDepth;

                        console.log(`      ✅ 구: ${sigungu}, 동: ${dong}, 폭: ${sinkWidth}m, 깊이: ${sinkDepth}m`);

                        const grade = calcGrade(sinkWidth, sinkDepth);
                        const key = `${sigungu}-${dong}`;

                        console.log(`      📊 등급: ${grade.grade} (위험도 ${grade.danger})`);

                        if (!allResults[key]) {
                            allResults[key] = {
                                gu: sigungu,
                                dong: dong,
                                grade: grade.grade,
                                danger: grade.danger,
                                accidentCount: 1,
                            };
                        } else {
                            const worstGrade = worse(allResults[key], grade);
                            allResults[key] = {
                                ...allResults[key],
                                grade: worstGrade.grade,
                                danger: worstGrade.danger,
                                accidentCount: allResults[key].accidentCount + 1,
                            };
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

                // 첫 성공 시 디버깅
                if (totalSuccess === 0) {
                    console.log(`      🔍 XML 응답 샘플:\n${detailXml.substring(0, 500)}\n`);
                }

                const detailData = xmlParser.parse(detailXml);

                if (totalSuccess === 0) {
                    console.log(`      🔍 파싱 구조:`, JSON.stringify(detailData, null, 2).substring(0, 600), "\n");
                }

                let detail = detailData?.resonse?.body?.items?.item;

                if (!detail) {
                    console.log(`      ⚠️  응답 데이터 없음`);
                    totalFail++;
                    continue;
                }

                const d = Array.isArray(detail) ? detail[0] : detail;

                // siGunGu, dong 확인
                if (!d || !d.sigungu || !d.dong) {
                    console.log(`      ⚠️  구/동 정보 없음`);
                    console.log(`      🔍 실제 키:`, Object.keys(d || {}));
                    totalFail++;
                    continue;
                }

                // ✅ siGunGu, dong, sinkWidth, sinkDepth 추출
                const sigungu = d.sigungu;
                const dong = d.dong;
                const sinkWidth = d.sinkWidth;
                const sinkDepth = d.sinkDepth;

                console.log(`      ✅ 구: ${sigungu}, 동: ${dong}, 폭: ${sinkWidth}m, 깊이: ${sinkDepth}m`);

                const grade = calcGrade(sinkWidth, sinkDepth);
                const key = `${sigungu}-${dong}`;

                console.log(`      📊 등급: ${grade.grade} (위험도 ${grade.danger})`);

                if (!allResults[key]) {
                    allResults[key] = {
                        gu: sigungu,
                        dong: dong,
                        grade: grade.grade,
                        danger: grade.danger,
                        accidentCount: 1,
                    };
                } else {
                    const worstGrade = worse(allResults[key], grade);
                    allResults[key] = {
                        ...allResults[key],
                        grade: worstGrade.grade,
                        danger: worstGrade.danger,
                        accidentCount: allResults[key].accidentCount + 1,
                    };
                }

                totalSuccess++;

                // Rate Limit 방지 (각 요청 후 3초 대기)
                if (i < allSeoulSagoNos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

            } catch (detailErr) {
                console.log(`      ❌ 예외: ${detailErr.message}`);
                totalFail++;
            }

            console.log("");
        }

        // ========================================
        // 결과 정리 및 반환
        // ========================================
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

        res.json({
            data: results,
            meta: {
                period: "최근 5개월",
                totalSeoulAccidents: allSeoulSagoNos.length,
                successCount: totalSuccess,
                failCount: totalFail,
                distinctLocations: results.length
            }
        });

    } catch (err) {
        console.error("❌ 에러:", err);
        res.status(500).json({
            error: "서울 지반침하 안전도 조회 실패",
            detail: err.message,
        });
    }
});

export default router;
