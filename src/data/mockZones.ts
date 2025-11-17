export type Zone = {
    id: string;
    name: string;   // 구 이름
    lat: number;
    lng: number;
    danger: number; // 1~5 위험도
};

export const ZONES: Zone[] = [
    { id: "1", name: "종로구", lat: 37.5731, lng: 126.9795, danger: 3 },
    { id: "2", name: "중구", lat: 37.5636, lng: 126.9976, danger: 4 },
    { id: "3", name: "용산구", lat: 37.5326, lng: 126.9905, danger: 2 },
    { id: "4", name: "성동구", lat: 37.5633, lng: 127.0364, danger: 3 },
    { id: "5", name: "강남구", lat: 37.5172, lng: 127.0473, danger: 5 },
    { id: "6", name: "마포구", lat: 37.5635, lng: 126.9086, danger: 2 },
];
