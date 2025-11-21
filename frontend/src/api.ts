// notices API 연동 함수
export async function fetchNotices() {
    const response = await fetch('api/notices');
    if (!response.ok) throw new Error('Failed to fetch notices');
    return response.json();
}

// safety API 연동 함수
// gu, dong 쿼리로 단일 지역 안전점수 조회 (백엔드가 gu,dong 쿼리를 필요로 함)
export async function fetchSafetyScores(gu: string, dong: string) {
    const q = new URLSearchParams({ gu, dong }).toString();
    const response = await fetch(`/api/safety?${q}`);
    if (!response.ok) throw new Error('Failed to fetch safety scores');
    return response.json();
}
// districts API 연동 함수
export async function fetchDistricts() {
    const response = await fetch('/api/districts');
    if (!response.ok) throw new Error('Failed to fetch districts');
    const geo = await response.json();

    // Transform GeoJSON FeatureCollection -> simple Zone[] used by Map
    // Each feature is expected to have geometry.coordinates (Polygon) as [ [ [lng, lat], ... ] ]
    // and properties.gu, properties.dong, properties.grade
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

        // get polygon coords (first ring)
        const coords = (((f.geometry || {}).coordinates || [])[0] || []);
        // coords are [ [lng, lat], ... ] — compute centroid by averaging
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
            // fallback to numeric mapping
            danger: gradeToDanger[grade] ?? 1,
        };
    });

    return zones;
}

// geocode API 연동 함수
export async function fetchGeocode(address: string) {
    const response = await fetch('api/geocode', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
    });
    if (!response.ok) throw new Error('Failed to fetch geocode');
    return response.json();
}
