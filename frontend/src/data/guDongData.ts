// src/data/guDongData.ts

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

export const guDongData: GuWithDongs[] = [
    {
        guId: "gangnam",
        guName: "강남구",
        lat: 37.5172,
        lng: 127.0473,
        danger: 5,
        dongs: [
            { id: "역삼동", lat: 37.4999, lng: 127.0365, danger: 5, guId: "gangnam" },
            { id: "삼성동", lat: 37.5143, lng: 127.0565, danger: 5, guId: "gangnam" },
            { id: "논현동", lat: 37.5112, lng: 127.0210, danger: 4, guId: "gangnam" },
            { id: "대치동", lat: 37.4947, lng: 127.0610, danger: 5, guId: "gangnam" },
            { id: "신사동", lat: 37.5250, lng: 127.0228, danger: 4, guId: "gangnam" }
        ],
    },

    {
        guId: "junggu",
        guName: "중구",
        lat: 37.5640,
        lng: 126.9976,
        danger: 4,
        dongs: [
            { id: "을지로동", lat: 37.5660, lng: 126.9895, danger: 4, guId: "junggu" },
            { id: "광희동", lat: 37.5636, lng: 127.0070, danger: 3, guId: "junggu" },
            { id: "신당동", lat: 37.5659, lng: 127.0170, danger: 3, guId: "junggu" },
            { id: "장충동", lat: 37.5596, lng: 127.0062, danger: 4, guId: "junggu" },
        ],
    },

    {
        guId: "jongno",
        guName: "종로구",
        lat: 37.5730,
        lng: 126.9794,
        danger: 3,
        dongs: [
            { id: "종로1가", lat: 37.5704, lng: 126.9816, danger: 3, guId: "jongno" },
            { id: "청운동", lat: 37.5862, lng: 126.9711, danger: 3, guId: "jongno" },
            { id: "삼청동", lat: 37.5886, lng: 126.9803, danger: 2, guId: "jongno" },
            { id: "수송동", lat: 37.5739, lng: 126.9822, danger: 3, guId: "jongno" }
        ],
    },

    {
        guId: "yongsan",
        guName: "용산구",
        lat: 37.5326,
        lng: 126.9905,
        danger: 2,
        dongs: [
            { id: "이태원동", lat: 37.5345, lng: 126.9946, danger: 2, guId: "yongsan" },
            { id: "한남동", lat: 37.5350, lng: 127.0070, danger: 2, guId: "yongsan" },
            { id: "보광동", lat: 37.5283, lng: 127.0016, danger: 3, guId: "yongsan" },
            { id: "청파동", lat: 37.5520, lng: 126.9723, danger: 2, guId: "yongsan" }
        ],
    },

    {
        guId: "mapo",
        guName: "마포구",
        lat: 37.5663,
        lng: 126.9018,
        danger: 2,
        dongs: [
            { id: "서교동", lat: 37.5513, lng: 126.9187, danger: 2, guId: "mapo" },
            { id: "합정동", lat: 37.5499, lng: 126.9147, danger: 2, guId: "mapo" },
            { id: "망원동", lat: 37.5560, lng: 126.9060, danger: 3, guId: "mapo" },
            { id: "상수동", lat: 37.5450, lng: 126.9228, danger: 2, guId: "mapo" }
        ],
    },

    {
        guId: "songpa",
        guName: "송파구",
        lat: 37.5145,
        lng: 127.1056,
        danger: 4,
        dongs: [
            { id: "잠실동", lat: 37.5133, lng: 127.1025, danger: 4, guId: "songpa" },
            { id: "가락동", lat: 37.4935, lng: 127.1180, danger: 3, guId: "songpa" },
            { id: "문정동", lat: 37.4841, lng: 127.1244, danger: 3, guId: "songpa" },
            { id: "방이동", lat: 37.5168, lng: 127.1127, danger: 4, guId: "songpa" }
        ],
    },

    {
        guId: "gwanak",
        guName: "관악구",
        lat: 37.4781,
        lng: 126.9516,
        danger: 3,
        dongs: [
            { id: "봉천동", lat: 37.4822, lng: 126.9519, danger: 3, guId: "gwanak" },
            { id: "신림동", lat: 37.4850, lng: 126.9291, danger: 2, guId: "gwanak" },
            { id: "남현동", lat: 37.4703, lng: 126.9673, danger: 3, guId: "gwanak" },
            { id: "청룡동", lat: 37.4880, lng: 126.9520, danger: 3, guId: "gwanak" }
        ],
    },

    {
        guId: "dobong",
        guName: "도봉구",
        lat: 37.6688,
        lng: 127.0467,
        danger: 1,
        dongs: [
            { id: "쌍문동", lat: 37.6487, lng: 127.0344, danger: 2, guId: "dobong" },
            { id: "창동", lat: 37.6533, lng: 127.0471, danger: 1, guId: "dobong" },
            { id: "도봉동", lat: 37.6797, lng: 127.0454, danger: 1, guId: "dobong" }
        ],
    },

    {
        guId: "gwangjin",
        guName: "광진구",
        lat: 37.5384,
        lng: 127.0823,
        danger: 3,
        dongs: [
            { id: "구의동", lat: 37.5387, lng: 127.0836, danger: 3, guId: "gwangjin" },
            { id: "자양동", lat: 37.5311, lng: 127.0828, danger: 3, guId: "gwangjin" },
            { id: "화양동", lat: 37.5421, lng: 127.0715, danger: 4, guId: "gwangjin" }
        ],
    },

    {
        guId: "dongjak",
        guName: "동작구",
        lat: 37.5124,
        lng: 126.9393,
        danger: 2,
        dongs: [
            { id: "상도동", lat: 37.5048, lng: 126.9475, danger: 2, guId: "dongjak" },
            { id: "흑석동", lat: 37.5091, lng: 126.9637, danger: 3, guId: "dongjak" },
            { id: "대방동", lat: 37.5102, lng: 126.9269, danger: 2, guId: "dongjak" }
        ],
    }
];
