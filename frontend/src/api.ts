// 환경변수 설정 (맨 위로)
const API_BASE = process.env.REACT_APP_API_BASE || '';

// notices API 연동 함수
export async function fetchNotices() {
    const response = await fetch(`${API_BASE}/api/notices`);
    if (!response.ok) throw new Error('Failed to fetch notices');
    return response.json();
}

// safety API 연동 함수
export async function fetchSafetyScores(gu: string, dong: string) {
    const q = new URLSearchParams({ gu, dong }).toString();
    const response = await fetch(`${API_BASE}/api/safety?${q}`);
    if (!response.ok) throw new Error('Failed to fetch safety scores');
    return response.json();
}

// 지반침하위험도평가 API 연동 함수
export async function fetchSafetyEvaluation(gu: string, dong: string) {
    const q = new URLSearchParams({ gu, dong }).toString();
    const response = await fetch(`${API_BASE}/api/safety/evalution?${q}`);
    if (!response.ok) throw new Error('Failed to fetch safety evaluation');
    return response.json();
}

// districts API 연동 함수
export async function fetchDistricts() {
    const response = await fetch(`${API_BASE}/api/districts`);
    if (!response.ok) throw new Error('Failed to fetch districts');
    const geo = await response.json();

    // ... 나머지 코드 동일 ...
    const features = geo.features ?? [];

    const gradeToDanger: Record<string, number> = {
        A: 1,
        B: 2,
        C: 3,
        D: 4,
    };

    const zones = features.map((f: any, idx: number) => {
        const props = f.properties ?? {};
        const gu = props.gu ?? '';
        const dong = props.dong ?? '';
        const grade = (props.grade ?? '').toString().toUpperCase();

        const coords = (((f.geometry || {}).coordinates || [])[0] || []);
        let sumLat = 0;
        let sumLng = 0;
        let count = 0;
        for (const p of coords) {
            if (!Array.isArray(p) || p.length < 2) continue;
            const [lng, lat] = p;
            sumLat += Number(lat) || 0;
            sumLng += Number(lng) || 0;
            count += 1;
        }
        const lat = count ? sumLat / count : 0;
        const lng = count ? sumLng / count : 0;

        return {
            id: `${gu}-${dong}-${idx}`,
            name: `${gu} ${dong}`.trim(),
            lat,
            lng,
            danger: gradeToDanger[grade] ?? 1,
        };
    });

    return zones;
}

// geocode API 연동 함수
export async function fetchGeocode(address: string) {
    const q = new URLSearchParams({ q: address }).toString();
    const response = await fetch(`${API_BASE}/api/geocode?${q}`);
    if (!response.ok) throw new Error('Failed to fetch geocode');
    return response.json();
}

// apiGet 함수
export async function apiGet(path: string) {
    const res = await fetch(`${API_BASE}${path}`);

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
    }

    return res.json();
}