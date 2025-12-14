// src/data/guDongData.ts
import { dongCentroids } from './dongCentroids';

export type DongInfo = {
    id: string;        // 동 이름
    lat: number;
    lng: number;
    danger: number;    // 1~5
    guId: string;      // 소속 구
};

export type GuInfo = {
    guId: string;
    guName: string;
    lat: number;
    lng: number;
    danger: number;
};

export type GuWithDongs = GuInfo & {
    dongs: DongInfo[];
};

// Coordinates sourced from data/seoul_sigungu_centroid.geojson (Shapefile centroid, WGS84)
const guList: GuInfo[] = [
    { guId: "gangnam", guName: "강남구", lat: 37.49666018564006, lng: 127.06297130314583, danger: 3 },
    { guId: "gangdong", guName: "강동구", lat: 37.55045142795757, lng: 127.14701489069832, danger: 3 },
    { guId: "gangbuk", guName: "강북구", lat: 37.64346740952136, lng: 127.01119361748748, danger: 3 },
    { guId: "gangseo", guName: "강서구", lat: 37.56123484945569, lng: 126.82281120322875, danger: 3 },
    { guId: "gwanak", guName: "관악구", lat: 37.467388524121354, lng: 126.94533279036443, danger: 3 },
    { guId: "gwangjin", guName: "광진구", lat: 37.54671889390471, lng: 127.08574596418444, danger: 3 },
    { guId: "guro", guName: "구로구", lat: 37.49440449092511, lng: 126.85631986328576, danger: 3 },
    { guId: "geumcheon", guName: "금천구", lat: 37.46057341768801, lng: 126.9008230831624, danger: 3 },
    { guId: "nowon", guName: "노원구", lat: 37.65251186969742, lng: 127.07504890283826, danger: 3 },
    { guId: "dobong", guName: "도봉구", lat: 37.66910586661784, lng: 127.03237612775892, danger: 3 },
    { guId: "dongdaemun", guName: "동대문구", lat: 37.58201015036751, lng: 127.0548740487569, danger: 3 },
    { guId: "dongjak", guName: "동작구", lat: 37.49888590709481, lng: 126.9516674212129, danger: 3 },
    { guId: "mapo", guName: "마포구", lat: 37.55931623075708, lng: 126.90825851223242, danger: 3 },
    { guId: "seodaemun", guName: "서대문구", lat: 37.5777906897451, lng: 126.93906453214005, danger: 3 },
    { guId: "seocho", guName: "서초구", lat: 37.473296242349505, lng: 127.03123597355855, danger: 3 },
    { guId: "seongdong", guName: "성동구", lat: 37.551027675064944, lng: 127.04105195576678, danger: 3 },
    { guId: "seongbuk", guName: "성북구", lat: 37.605702052465595, lng: 127.01751451988835, danger: 3 },
    { guId: "songpa", guName: "송파구", lat: 37.50561639345951, lng: 127.11529154645939, danger: 3 },
    { guId: "yangcheon", guName: "양천구", lat: 37.52474045648374, lng: 126.85537099483429, danger: 3 },
    { guId: "yeongdeungpo", guName: "영등포구", lat: 37.522313501863, lng: 126.91018178913771, danger: 3 },
    { guId: "yongsan", guName: "용산구", lat: 37.53136484691709, lng: 126.97991147851504, danger: 3 },
    { guId: "eunpyeong", guName: "은평구", lat: 37.61921343018562, lng: 126.92702761179929, danger: 3 },
    { guId: "jongno", guName: "종로구", lat: 37.594918484600214, lng: 126.9773205491279, danger: 3 },
    { guId: "jung", guName: "중구", lat: 37.56012995979633, lng: 126.99591559748835, danger: 3 },
    { guId: "jungnang", guName: "중랑구", lat: 37.59781887940976, lng: 127.0928852495261, danger: 3 },
];

export const guDongData: GuWithDongs[] = guList.map((g) => ({
    ...g,
    dongs: dongCentroids.filter((d) => d.guId === g.guId),
}));
