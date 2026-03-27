import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, setDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC0csQC4HshJIcnCngWrKvzUyhw1H-BE_w",
  authDomain: "baseball-ticket.firebaseapp.com",
  projectId: "baseball-ticket",
  storageBucket: "baseball-ticket.firebasestorage.app",
  messagingSenderId: "1085175936934",
  appId: "1:1085175936934:web:b379f3d2c600ce7cce0167",
  measurementId: "G-CP85B6R1KQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'baseball-ticket-app';


// 블록별 이미지 URL 매핑 객체 생성
const blockImageUrls = {
  "109": "https://i.imgur.com/beGPQbC.png",
  "108": "https://i.imgur.com/mZxNpgl.png",
  "107": "https://i.imgur.com/ooRX8Wv.png",
  "211": "https://i.imgur.com/FcW98ep.png",
  "210": "https://i.imgur.com/Rt11yhi.png",
  "209": "https://i.imgur.com/QzTyfvm.png",
  "208": "https://i.imgur.com/fzwC4Jz.png",
  "207": "https://i.imgur.com/nBEePqt.png",
  "206": "https://i.imgur.com/usZN7lN.png",
  "205": "https://i.imgur.com/0ckzRZ5.png",
  "111": "https://i.imgur.com/VC2hcCT.png"
};

// 전체 좌석 좌표 데이터 (각 이미지의 라인 영역 기준 정밀 스텝 및 예외 배열 구조 적용)
const mapCoordinates = (() => {
    const data = { seats: {} };

    // 좌석 번호 순차 배열 생성 유틸리티 (시각적으로 왼쪽부터 오른쪽으로 읽는 순서대로 입력)
    const seq = (s, e) => Array.from({ length: Math.abs(e - s) + 1 }, (_, i) => s <= e ? s + i : s - i);

    // 블록 좌표 동적 할당 함수
    const generateBlock = (block, w, h, startT, startL, rowData) => {
        data.seats[block] = {};
        rowData.forEach(row => {
            const { seats, tIdx, cIdx } = row;
            for (let i = 0; i < seats.length; i++) {
                data.seats[block][seats[i]] = {
                    top: (startT + tIdx * h).toFixed(2) + '%',
                    left: (startL + (cIdx + i) * w).toFixed(2) + '%',
                    width: w.toFixed(2) + '%',
                    height: h.toFixed(2) + '%'
                };
            }
        });
    };

    // 109구역 (14열 8행 스네이크)
    generateBlock("109", 6.824, 11.483, 3.876, 1.488, [
        { seats: seq(1, 14), tIdx: 0, cIdx: 0 },
        { seats: seq(28, 15), tIdx: 1, cIdx: 0 },
        { seats: seq(29, 42), tIdx: 2, cIdx: 0 },
        { seats: seq(56, 43), tIdx: 3, cIdx: 0 },
        { seats: seq(57, 70), tIdx: 4, cIdx: 0 },
        { seats: seq(84, 71), tIdx: 5, cIdx: 0 },
        { seats: seq(85, 98), tIdx: 6, cIdx: 0 },
        { seats: seq(101, 99), tIdx: 7, cIdx: 0 }
    ]);

    // 107구역 (14열 11행, 우상단 공백)
    generateBlock("107", 6.82, 8.708, 1.942, 1.935, [
        { seats: seq(1, 3), tIdx: 0, cIdx: 12 },
        { seats: seq(17, 4), tIdx: 1, cIdx: 0 },
        { seats: seq(18, 31), tIdx: 2, cIdx: 0 },
        { seats: seq(45, 32), tIdx: 3, cIdx: 0 },
        { seats: seq(46, 59), tIdx: 4, cIdx: 0 },
        { seats: seq(73, 60), tIdx: 5, cIdx: 0 },
        { seats: seq(74, 87), tIdx: 6, cIdx: 0 },
        { seats: seq(101, 88), tIdx: 7, cIdx: 0 },
        { seats: seq(102, 115), tIdx: 8, cIdx: 0 },
        { seats: seq(129, 116), tIdx: 9, cIdx: 0 },
        { seats: seq(130, 143), tIdx: 10, cIdx: 0 }
    ]);

    // 108구역 (14열 9행, 좌상단 공백)
    generateBlock("108", 6.806, 10.444, 2.827, 1.77, [
        { seats: seq(1, 9), tIdx: 0, cIdx: 5 },
        { seats: seq(23, 10), tIdx: 1, cIdx: 0 },
        { seats: seq(24, 37), tIdx: 2, cIdx: 0 },
        { seats: seq(51, 38), tIdx: 3, cIdx: 0 },
        { seats: seq(52, 65), tIdx: 4, cIdx: 0 },
        { seats: seq(79, 66), tIdx: 5, cIdx: 0 },
        { seats: seq(80, 93), tIdx: 6, cIdx: 0 },
        { seats: seq(107, 94), tIdx: 7, cIdx: 0 },
        { seats: seq(108, 121), tIdx: 8, cIdx: 0 }
    ]);

    // 205구역 (13열 돌출형 18행 - 세로 비율 상향)
    generateBlock("205", 7.37, 5.411, 1.117, 1.497, [
        { seats: seq(1, 2), tIdx: 0, cIdx: 0 },
        { seats: seq(4, 3), tIdx: 1, cIdx: 0 }, { seats: seq(9, 11), tIdx: 1, cIdx: 8 },
        { seats: seq(5, 6), tIdx: 2, cIdx: 0 }, { seats: seq(13, 12), tIdx: 2, cIdx: 9 },
        { seats: seq(8, 7), tIdx: 3, cIdx: 0 }, { seats: seq(14, 15), tIdx: 3, cIdx: 9 },
        { seats: seq(27, 16), tIdx: 4, cIdx: 0 },
        { seats: seq(28, 39), tIdx: 5, cIdx: 0 },
        { seats: seq(51, 40), tIdx: 6, cIdx: 0 },
        { seats: seq(52, 63), tIdx: 7, cIdx: 0 },
        { seats: seq(76, 65), tIdx: 8, cIdx: 0 }, { seats: [64], tIdx: 8, cIdx: 12 },
        { seats: seq(77, 88), tIdx: 9, cIdx: 0 }, { seats: [89], tIdx: 9, cIdx: 12 },
        { seats: seq(102, 91), tIdx: 10, cIdx: 0 }, { seats: [90], tIdx: 10, cIdx: 12 },
        { seats: seq(103, 114), tIdx: 11, cIdx: 0 }, { seats: [115], tIdx: 11, cIdx: 12 },
        { seats: seq(128, 117), tIdx: 12, cIdx: 0 }, { seats: [116], tIdx: 12, cIdx: 12 },
        { seats: seq(129, 140), tIdx: 13, cIdx: 0 }, { seats: [141], tIdx: 13, cIdx: 12 },
        { seats: seq(154, 143), tIdx: 14, cIdx: 0 }, { seats: [142], tIdx: 14, cIdx: 12 },
        { seats: seq(155, 166), tIdx: 15, cIdx: 0 }, { seats: [167], tIdx: 15, cIdx: 12 },
        { seats: seq(181, 170), tIdx: 16, cIdx: 0 }, { seats: seq(169, 168), tIdx: 16, cIdx: 11 },
        { seats: seq(182, 193), tIdx: 17, cIdx: 0 }, { seats: seq(194, 195), tIdx: 17, cIdx: 11 }
    ]);

    // 206구역 (13열 돌출형 19행 - 세로 비율 상향)
    generateBlock("206", 7.39, 5.105, 1.318, 1.511, [
        { seats: seq(1, 11), tIdx: 0, cIdx: 0 },
        { seats: seq(22, 12), tIdx: 1, cIdx: 0 },
        { seats: seq(23, 33), tIdx: 2, cIdx: 0 },
        { seats: seq(44, 34), tIdx: 3, cIdx: 0 },
        { seats: seq(45, 55), tIdx: 4, cIdx: 0 },
        { seats: seq(66, 56), tIdx: 5, cIdx: 0 },
        { seats: seq(67, 77), tIdx: 6, cIdx: 0 }, { seats: [78], tIdx: 6, cIdx: 11 },
        { seats: seq(90, 80), tIdx: 7, cIdx: 0 }, { seats: [79], tIdx: 7, cIdx: 11 },
        { seats: seq(91, 101), tIdx: 8, cIdx: 0 }, { seats: [102], tIdx: 8, cIdx: 11 },
        { seats: seq(114, 104), tIdx: 9, cIdx: 0 }, { seats: [103], tIdx: 9, cIdx: 11 },
        { seats: seq(115, 125), tIdx: 10, cIdx: 0 }, { seats: [126], tIdx: 10, cIdx: 11 },
        { seats: seq(138, 128), tIdx: 11, cIdx: 0 }, { seats: [127], tIdx: 11, cIdx: 11 },
        { seats: seq(139, 149), tIdx: 12, cIdx: 0 }, { seats: [150], tIdx: 12, cIdx: 11 },
        { seats: seq(163, 152), tIdx: 13, cIdx: 0 }, { seats: [151], tIdx: 13, cIdx: 12 },
        { seats: seq(164, 175), tIdx: 14, cIdx: 0 }, { seats: [176], tIdx: 14, cIdx: 12 },
        { seats: seq(189, 178), tIdx: 15, cIdx: 0 }, { seats: [177], tIdx: 15, cIdx: 12 },
        { seats: seq(190, 201), tIdx: 16, cIdx: 0 }, { seats: [202], tIdx: 16, cIdx: 12 },
        { seats: seq(215, 204), tIdx: 17, cIdx: 0 }, { seats: [203], tIdx: 17, cIdx: 12 },
        { seats: seq(216, 227), tIdx: 18, cIdx: 0 }, { seats: [228], tIdx: 18, cIdx: 12 }
    ]);

    // 207구역 (13열 돌출형 20행 - 세로 비율 상향)
    generateBlock("207", 7.266, 4.856, 1.118, 2.462, [
        { seats: seq(1, 11), tIdx: 0, cIdx: 0 },
        { seats: seq(21, 31), tIdx: 1, cIdx: 0 },
        { seats: seq(23, 33), tIdx: 2, cIdx: 0 },
        { seats: seq(45, 35), tIdx: 3, cIdx: 0 }, { seats: [34], tIdx: 3, cIdx: 11 },
        { seats: seq(46, 56), tIdx: 4, cIdx: 0 }, { seats: [57], tIdx: 4, cIdx: 11 },
        { seats: seq(69, 59), tIdx: 5, cIdx: 0 }, { seats: [58], tIdx: 5, cIdx: 11 },
        { seats: seq(70, 80), tIdx: 6, cIdx: 0 }, { seats: [81], tIdx: 6, cIdx: 11 },
        { seats: seq(93, 83), tIdx: 7, cIdx: 0 }, { seats: [82], tIdx: 7, cIdx: 11 },
        { seats: seq(94, 104), tIdx: 8, cIdx: 0 }, { seats: [105], tIdx: 8, cIdx: 11 },
        { seats: seq(117, 107), tIdx: 9, cIdx: 0 }, { seats: [106], tIdx: 9, cIdx: 11 },
        { seats: seq(118, 128), tIdx: 10, cIdx: 0 }, { seats: [129], tIdx: 10, cIdx: 11 },
        { seats: seq(141, 131), tIdx: 11, cIdx: 0 }, { seats: [130], tIdx: 11, cIdx: 11 },
        { seats: seq(142, 153), tIdx: 12, cIdx: 0 }, { seats: [154], tIdx: 12, cIdx: 12 },
        { seats: seq(167, 156), tIdx: 13, cIdx: 0 }, { seats: [155], tIdx: 13, cIdx: 12 },
        { seats: seq(168, 179), tIdx: 14, cIdx: 0 }, { seats: [180], tIdx: 14, cIdx: 12 },
        { seats: seq(193, 182), tIdx: 15, cIdx: 0 }, { seats: [181], tIdx: 15, cIdx: 12 },
        { seats: seq(194, 205), tIdx: 16, cIdx: 0 }, { seats: [206], tIdx: 16, cIdx: 12 },
        { seats: seq(219, 208), tIdx: 17, cIdx: 0 }, { seats: [207], tIdx: 17, cIdx: 12 },
        { seats: seq(220, 231), tIdx: 18, cIdx: 0 }, { seats: [232], tIdx: 18, cIdx: 12 },
        { seats: seq(245, 234), tIdx: 19, cIdx: 0 }, { seats: [233], tIdx: 19, cIdx: 12 }
    ]);

    // 208구역 (17열 U자형 21행 - 세로 비율 상향)
    generateBlock("208", 5.565, 4.619, 1.333, 2.273, [
        { seats: seq(1, 3), tIdx: 0, cIdx: 0 }, { seats: seq(22, 25), tIdx: 0, cIdx: 12 },
        { seats: seq(6, 4), tIdx: 1, cIdx: 0 }, { seats: seq(29, 26), tIdx: 1, cIdx: 12 },
        { seats: seq(7, 9), tIdx: 2, cIdx: 0 }, { seats: seq(30, 33), tIdx: 2, cIdx: 12 },
        { seats: seq(12, 10), tIdx: 3, cIdx: 0 }, { seats: seq(37, 34), tIdx: 3, cIdx: 12 },
        { seats: seq(13, 15), tIdx: 4, cIdx: 0 }, { seats: seq(38, 41), tIdx: 4, cIdx: 12 },
        { seats: seq(18, 16), tIdx: 5, cIdx: 0 }, { seats: seq(45, 42), tIdx: 5, cIdx: 12 },
        { seats: seq(19, 21), tIdx: 6, cIdx: 0 }, { seats: seq(46, 49), tIdx: 6, cIdx: 12 },
        { seats: seq(64, 50), tIdx: 7, cIdx: 0 },
        { seats: seq(65, 79), tIdx: 8, cIdx: 0 },
        { seats: seq(94, 80), tIdx: 9, cIdx: 0 },
        { seats: seq(95, 109), tIdx: 10, cIdx: 0 },
        { seats: seq(125, 110), tIdx: 11, cIdx: 0 },
        { seats: seq(126, 141), tIdx: 12, cIdx: 0 },
        { seats: seq(157, 142), tIdx: 13, cIdx: 0 },
        { seats: seq(158, 173), tIdx: 14, cIdx: 0 },
        { seats: seq(189, 174), tIdx: 15, cIdx: 0 },
        { seats: seq(190, 205), tIdx: 16, cIdx: 0 },
        { seats: seq(221, 206), tIdx: 17, cIdx: 0 },
        { seats: seq(222, 237), tIdx: 18, cIdx: 0 },
        { seats: seq(253, 238), tIdx: 19, cIdx: 0 },
        { seats: seq(254, 269), tIdx: 20, cIdx: 0 }, { seats: [270], tIdx: 20, cIdx: 16 }
    ]);

    // 209구역 (15열 20행 - 세로 비율 상향)
    generateBlock("209", 6.374, 4.882, 0.789, 2.047, [
        { seats: seq(1, 15), tIdx: 0, cIdx: 0 },
        { seats: seq(30, 16), tIdx: 1, cIdx: 0 },
        { seats: seq(31, 45), tIdx: 2, cIdx: 0 },
        { seats: seq(60, 46), tIdx: 3, cIdx: 0 },
        { seats: seq(61, 75), tIdx: 4, cIdx: 0 },
        { seats: seq(90, 76), tIdx: 5, cIdx: 0 },
        { seats: seq(91, 105), tIdx: 6, cIdx: 0 },
        { seats: seq(120, 106), tIdx: 7, cIdx: 0 },
        { seats: seq(121, 135), tIdx: 8, cIdx: 0 },
        { seats: seq(150, 136), tIdx: 9, cIdx: 0 },
        { seats: seq(151, 165), tIdx: 10, cIdx: 0 },
        { seats: seq(180, 166), tIdx: 11, cIdx: 0 },
        { seats: seq(181, 195), tIdx: 12, cIdx: 0 },
        { seats: seq(210, 196), tIdx: 13, cIdx: 0 },
        { seats: seq(211, 225), tIdx: 14, cIdx: 0 },
        { seats: seq(240, 226), tIdx: 15, cIdx: 0 },
        { seats: seq(241, 255), tIdx: 16, cIdx: 0 },
        { seats: seq(270, 256), tIdx: 17, cIdx: 0 },
        { seats: seq(271, 285), tIdx: 18, cIdx: 0 },
        { seats: seq(294, 286), tIdx: 19, cIdx: 6 }
    ]);

    // 210구역 (15열 19행 - 세로 비율 상향)
    generateBlock("210", 6.393, 5.132, 1.165, 2.053, [
        { seats: seq(1, 15), tIdx: 0, cIdx: 0 },
        { seats: seq(30, 16), tIdx: 1, cIdx: 0 },
        { seats: seq(31, 45), tIdx: 2, cIdx: 0 },
        { seats: seq(60, 46), tIdx: 3, cIdx: 0 },
        { seats: seq(61, 75), tIdx: 4, cIdx: 0 },
        { seats: seq(90, 76), tIdx: 5, cIdx: 0 },
        { seats: seq(91, 105), tIdx: 6, cIdx: 0 },
        { seats: seq(120, 106), tIdx: 7, cIdx: 0 },
        { seats: seq(121, 135), tIdx: 8, cIdx: 0 },
        { seats: seq(150, 136), tIdx: 9, cIdx: 0 },
        { seats: seq(151, 165), tIdx: 10, cIdx: 0 },
        { seats: seq(180, 166), tIdx: 11, cIdx: 0 },
        { seats: seq(181, 195), tIdx: 12, cIdx: 0 },
        { seats: seq(210, 196), tIdx: 13, cIdx: 0 },
        { seats: seq(211, 225), tIdx: 14, cIdx: 0 },
        { seats: seq(240, 226), tIdx: 15, cIdx: 0 },
        { seats: seq(241, 255), tIdx: 16, cIdx: 0 },
        { seats: seq(269, 256), tIdx: 17, cIdx: 1 },
        { seats: seq(270, 275), tIdx: 18, cIdx: 9 }
    ]);

    // 211구역 (15열 17행 - 세로 비율 상향)
    generateBlock("211", 6.374, 5.751, 0.745, 2.047, [
        { seats: seq(1, 3), tIdx: 0, cIdx: 0 }, { seats: seq(22, 25), tIdx: 0, cIdx: 11 },
        { seats: seq(6, 4), tIdx: 1, cIdx: 0 }, { seats: seq(29, 26), tIdx: 1, cIdx: 11 },
        { seats: seq(7, 9), tIdx: 2, cIdx: 0 }, { seats: seq(30, 33), tIdx: 2, cIdx: 11 },
        { seats: seq(12, 10), tIdx: 3, cIdx: 0 }, { seats: seq(37, 34), tIdx: 3, cIdx: 11 },
        { seats: seq(13, 15), tIdx: 4, cIdx: 0 }, { seats: seq(38, 41), tIdx: 4, cIdx: 11 },
        { seats: seq(18, 16), tIdx: 5, cIdx: 0 }, { seats: seq(45, 42), tIdx: 5, cIdx: 11 },
        { seats: seq(19, 21), tIdx: 6, cIdx: 0 }, { seats: seq(46, 49), tIdx: 6, cIdx: 11 },
        { seats: seq(63, 50), tIdx: 7, cIdx: 1 },
        { seats: seq(64, 77), tIdx: 8, cIdx: 1 },
        { seats: seq(92, 78), tIdx: 9, cIdx: 0 },
        { seats: seq(93, 107), tIdx: 10, cIdx: 0 },
        { seats: seq(122, 108), tIdx: 11, cIdx: 0 },
        { seats: seq(123, 137), tIdx: 12, cIdx: 0 },
        { seats: seq(152, 138), tIdx: 13, cIdx: 0 },
        { seats: seq(153, 167), tIdx: 14, cIdx: 0 },
        { seats: seq(177, 168), tIdx: 15, cIdx: 5 },
        { seats: seq(178, 180), tIdx: 16, cIdx: 12 }
    ]);

    // 111구역 수동 할당 데이터 병합
    data.seats["111"] = {
        1: { top: '8.00%', left: '20.80%', width: '4.70%', height: '15.00%' },
        2: { top: '8.00%', left: '25.50%', width: '4.70%', height: '15.00%' },
        3: { top: '8.00%', left: '30.20%', width: '4.70%', height: '15.00%' },
        4: { top: '8.00%', left: '39.60%', width: '4.70%', height: '15.00%' },
        5: { top: '8.00%', left: '44.30%', width: '4.70%', height: '15.00%' },
        6: { top: '8.00%', left: '49.00%', width: '4.70%', height: '15.00%' },
        7: { top: '8.00%', left: '58.40%', width: '4.70%', height: '15.00%' },
        8: { top: '8.00%', left: '63.10%', width: '4.70%', height: '15.00%' },
        9: { top: '8.00%', left: '67.80%', width: '4.70%', height: '15.00%' },
        10: { top: '8.00%', left: '72.50%', width: '4.70%', height: '15.00%' },
        11: { top: '8.00%', left: '81.90%', width: '4.70%', height: '15.00%' },
        12: { top: '8.00%', left: '86.60%', width: '4.70%', height: '15.00%' },
        13: { top: '8.00%', left: '91.30%', width: '4.70%', height: '15.00%' },
        14: { top: '30.00%', left: '91.30%', width: '4.70%', height: '15.00%' },
        15: { top: '30.00%', left: '86.60%', width: '4.70%', height: '15.00%' },
        16: { top: '30.00%', left: '81.90%', width: '4.70%', height: '15.00%' },
        17: { top: '30.00%', left: '72.50%', width: '4.70%', height: '15.00%' },
        18: { top: '30.00%', left: '67.80%', width: '4.70%', height: '15.00%' },
        19: { top: '30.00%', left: '63.10%', width: '4.70%', height: '15.00%' },
        20: { top: '30.00%', left: '58.40%', width: '4.70%', height: '15.00%' },
        21: { top: '30.00%', left: '49.00%', width: '4.70%', height: '15.00%' },
        22: { top: '30.00%', left: '44.30%', width: '4.70%', height: '15.00%' },
        23: { top: '30.00%', left: '39.60%', width: '4.70%', height: '15.00%' },
        24: { top: '30.00%', left: '30.20%', width: '4.70%', height: '15.00%' },
        25: { top: '30.00%', left: '25.50%', width: '4.70%', height: '15.00%' },
        26: { top: '30.00%', left: '20.80%', width: '4.70%', height: '15.00%' },
        27: { top: '30.00%', left: '16.10%', width: '4.70%', height: '15.00%' },
        28: { top: '30.00%', left: '11.40%', width: '4.70%', height: '15.00%' },
        29: { top: '52.00%', left: '6.70%', width: '4.70%', height: '15.00%' },
        30: { top: '52.00%', left: '11.40%', width: '4.70%', height: '15.00%' },
        31: { top: '52.00%', left: '20.80%', width: '4.70%', height: '15.00%' },
        32: { top: '52.00%', left: '25.50%', width: '4.70%', height: '15.00%' },
        33: { top: '52.00%', left: '30.20%', width: '4.70%', height: '15.00%' },
        34: { top: '52.00%', left: '39.60%', width: '4.70%', height: '15.00%' },
        35: { top: '52.00%', left: '44.30%', width: '4.70%', height: '15.00%' },
        36: { top: '52.00%', left: '49.00%', width: '4.70%', height: '15.00%' },
        37: { top: '52.00%', left: '58.40%', width: '4.70%', height: '15.00%' },
        38: { top: '52.00%', left: '63.10%', width: '4.70%', height: '15.00%' },
        39: { top: '52.00%', left: '67.80%', width: '4.70%', height: '15.00%' },
        40: { top: '52.00%', left: '72.50%', width: '4.70%', height: '15.00%' },
        41: { top: '52.00%', left: '81.90%', width: '4.70%', height: '15.00%' },
        42: { top: '52.00%', left: '86.60%', width: '4.70%', height: '15.00%' },
        43: { top: '52.00%', left: '91.30%', width: '4.70%', height: '15.00%' },
        44: { top: '74.00%', left: '91.30%', width: '4.70%', height: '15.00%' },
        45: { top: '74.00%', left: '86.60%', width: '4.70%', height: '15.00%' },
        46: { top: '74.00%', left: '81.90%', width: '4.70%', height: '15.00%' },
        47: { top: '74.00%', left: '72.50%', width: '4.70%', height: '15.00%' },
        48: { top: '74.00%', left: '67.80%', width: '4.70%', height: '15.00%' },
        49: { top: '74.00%', left: '63.10%', width: '4.70%', height: '15.00%' },
        50: { top: '74.00%', left: '58.40%', width: '4.70%', height: '15.00%' },
        51: { top: '74.00%', left: '49.00%', width: '4.70%', height: '15.00%' },
        52: { top: '74.00%', left: '44.30%', width: '4.70%', height: '15.00%' },
        53: { top: '74.00%', left: '39.60%', width: '4.70%', height: '15.00%' },
        54: { top: '74.00%', left: '30.20%', width: '4.70%', height: '15.00%' },
        55: { top: '74.00%', left: '25.50%', width: '4.70%', height: '15.00%' },
        56: { top: '74.00%', left: '20.80%', width: '4.70%', height: '15.00%' },
        57: { top: '74.00%', left: '16.10%', width: '4.70%', height: '15.00%' },
        58: { top: '74.00%', left: '6.70%', width: '4.70%', height: '15.00%' },
        59: { top: '74.00%', left: '2.00%', width: '4.70%', height: '15.00%' }
    };

    return data;
})();

const jamsilSeatData = {
  "109": {
    "left": [1, 28, 29, 56, 57, 84, 85, 101],
    "right": [14, 15, 42, 43, 70, 71, 98, 99]
  },
  "108": {
    "left": [1, 23, 24, 51, 52, 79, 80, 107, 108],
    "right": [9, 10, 37, 38, 65, 66, 93, 94, 121]
  },
  "107": {
    "left": [1, 17, 18, 45, 46, 73, 74, 101, 102, 129, 130],
    "right": [3, 4, 31, 32, 59, 60, 87, 88, 115, 116, 143]
  },  
  "205": {
    "left": [1, 4, 5, 8, 9, 13, 14, 27, 28, 51, 52, 76, 77, 102, 103, 128, 129, 154, 155, 181, 182],
    "right": [2, 3, 6, 7, 11, 12, 15, 16, 39, 40, 63, 64, 89, 90, 115, 116, 141, 142, 167, 168, 195]
  },
  "206": {
    "left": [1, 22, 23, 44, 45, 66, 67, 90, 91, 114, 115, 138, 139, 163, 164, 189, 190, 215, 216],
    "right": [11, 12, 33, 34, 55, 56, 78, 79,102, 103, 126, 127, 150, 151, 176, 177, 202, 203, 228]
  },
  "207": {
    "left": [1, 21, 23, 45, 46, 69, 70, 93, 94, 117, 118, 141, 142, 167, 168, 193, 194, 219, 220, 245],
    "right": [11, 31, 33, 34, 57, 58, 81, 82, 105, 106, 129, 130, 154, 155, 180, 181, 206, 207, 232, 233]
  },
  "208": {
    "left": [1, 6, 7, 12, 13, 18, 19, 22, 29, 30, 37, 38, 45, 46, 64, 65, 94, 95, 125, 126, 157, 158, 189, 190, 221, 222, 253, 254],
    "right": [3, 4, 9, 10, 15, 16, 21, 25, 26, 33, 34, 41, 42, 49, 50, 79, 80, 109, 110, 141, 142, 173, 174, 205, 206, 237, 238, 270]
  },
  "209": {
    "left": [1, 30, 31, 60, 61, 90, 91, 120, 121, 150, 151, 180, 181, 210, 211, 240, 241, 270, 271, 294],
    "right": [15, 16, 45, 46, 75, 76, 105, 106, 135, 136, 165, 166, 195, 196, 225, 226, 255, 256, 285, 286]
  },
  "210": {
    "left": [1, 30, 31, 60, 61, 90, 91, 120, 121, 150, 151, 180, 181, 210, 211, 240, 241, 269, 270],
    "right": [15, 16, 45, 46, 75, 76, 105, 106, 135, 136, 165, 166, 195, 196, 225, 226, 255, 256, 275]
  },
  "211": {
    "left": [1, 6, 7, 12, 13, 18, 19, 22, 29, 30, 37, 38, 45, 46, 63, 64, 92, 93, 122, 123, 152, 153, 177, 178],
    "right": [3, 4, 9, 10, 15, 16, 21, 25, 26, 33, 34, 41, 42, 49, 50, 77, 78, 107, 108, 137, 138, 167, 168, 180]
  }
};

const getAisleType = (seatString) => {
  const match = seatString.match(/(\d+)블록.*?(\d+)번/);
  if (!match) return "일반";
  
  const block = match[1];
  const seatNum = parseInt(match[2], 10);
  const blockInfo = jamsilSeatData[block];
  
  if (!blockInfo) return "일반";
  
  if (blockInfo.left && blockInfo.left.includes(seatNum)) return "좌통";
  if (blockInfo.right && blockInfo.right.includes(seatNum)) return "우통";
  return "일반";
};

const getAgentColor = (agent) => {
  if (agent === '공홈') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (agent === '티링') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-purple-50 text-purple-600 border-purple-200';
};

const getSeatColor = (seatGrade) => {
  if (seatGrade.includes('블루')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (seatGrade.includes('레드')) return 'bg-red-50 text-red-700 border-red-200';
  if (seatGrade.includes('오렌지')) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (seatGrade.includes('네이비')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (seatGrade.includes('테이블') || seatGrade.includes('프리미엄')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (seatGrade.includes('익사이팅')) return 'bg-pink-50 text-pink-700 border-pink-200';
  if (seatGrade.includes('그린')) return 'bg-green-50 text-green-700 border-green-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatSeatRange = (seats) => {
  if (!seats || seats.length === 0) return '';
  if (seats.length === 1) return seats[0].seatInfo;

  const groups = {};
  let allParsed = true;

  seats.forEach(seat => {
    const match = seat.seatInfo.match(/^(.*?)\s*(\d+)번$/);
    if (match) {
      const prefix = match[1].trim();
      const num = parseInt(match[2], 10);
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(num);
    } else {
      allParsed = false;
    }
  });

  if (!allParsed) {
    return seats.map(s => s.seatInfo).join(', ');
  }

  return Object.entries(groups).map(([prefix, nums]) => {
    if (nums.length === 1) return `${prefix} ${nums[0]}번`;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return `${prefix} ${min}~${max}번`;
  }).join(', ');
};

const formatMemo = (val) => {
  return val.replace(/(01[016789])[-]?(\d{3,4})[-]?(\d{4})/g, '$1-$2-$3');
};

const extractPhone = (val) => {
  const match = val.match(/01[016789]-\d{3,4}-\d{4}/);
  return match ? match[0] : null;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // 로그인/회원가입 관련 상태
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const [agentInput, setAgentInput] = useState('공홈');
  const [inputText, setInputText] = useState('');
  const [reservations, setReservations] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [expandedIds, setExpandedIds] = useState({});
  const [hideEnded, setHideEnded] = useState(false);
  const [mapModalData, setMapModalData] = useState(null);
  const [showFullMap, setShowFullMap] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // 유저 고유의 DB 경로로 설정
    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'reservations');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      data.sort((a, b) => {
        if (a.dateTime !== b.dateTime) return a.dateTime.localeCompare(b.dateTime);
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        const seatA = a.seatGrade + (a.seats[0]?.seatInfo || '');
        const seatB = b.seatGrade + (b.seats[0]?.seatInfo || '');
        return seatA.localeCompare(seatB);
      });
      setReservations(data);
    }, (error) => {
      console.error('Firestore error', error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
      } else {
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      }
      setEmailInput('');
      setPasswordInput('');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') setAuthError('이미 사용 중인 아이디(이메일)입니다.');
      else if (error.code === 'auth/invalid-email') setAuthError('올바른 아이디(이메일) 형식이 아닙니다.');
      else if (error.code === 'auth/weak-password') setAuthError('비밀번호는 6자리 이상이어야 합니다.');
      else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') setAuthError('아이디 또는 비밀번호가 일치하지 않습니다.');
      else setAuthError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      setAuthError(`구글 로그인 실패: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setReservations([]);
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const isMobile = window.innerWidth < 640;
    try {
      document.execCommand('copy');
      if (!isMobile) {
        setToastMsg('클립보드에 복사되었습니다.');
        setTimeout(() => setToastMsg(''), 500);
      }
    } catch (err) {
      if (!isMobile) {
        setToastMsg('복사에 실패했습니다.');
        setTimeout(() => setToastMsg(''), 500);
      }
    }
    document.body.removeChild(textArea);
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const isExpanding = !prev[id];
      if (isExpanding) {
        setTimeout(() => {
          const element = document.getElementById(`res-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
      return { ...prev, [id]: isExpanding };
    });
  };

  const openMapModal = (seats) => {
    if (!seats || seats.length === 0) return;
    
    const blockMatch = seats[0].seatInfo.match(/(\d+)블록/);
    const block = blockMatch ? blockMatch[1] : null;
    
    const seatNums = seats.map(s => {
      const match = s.seatInfo.match(/(\d+)번/);
      return match ? parseInt(match[1], 10) : null;
    }).filter(n => n !== null);

    if (block) {
      setMapModalData({ block, seats: seatNums });
      setShowFullMap(false);
    }
  };

  const parseSMS = async () => {
    setErrorMsg('');
    if (!inputText.trim()) {
      setErrorMsg('문자 내용을 입력하십시오.');
      return;
    }

    try {
      const nameMatch = inputText.match(/(.+?) 고객님, 예매가 완료되었습니다\./);
      const matchMatch = inputText.match(/- 상품명 : \[[^\]]+\]\s*(.+)/);
      const resNoMatch = inputText.match(/- 예매번호 :\s*([a-zA-Z0-9]+)/);
      const dateTimeMatch = inputText.match(/- 관람일시 :\s*(.+)/);
      const cancelTimeMatch = inputText.match(/- 취소마감일시 :\s*(.+)/);
      const seatSectionMatch = inputText.match(/- 예매좌석 :\s*\n([^\n]+)\n([\s\S]*?)(?=\n■|\n\n|\n\*|$)/);

      if (!nameMatch || !matchMatch || !resNoMatch || !dateTimeMatch || !seatSectionMatch) {
        setErrorMsg('문자 형식을 분석할 수 없습니다. 샘플 형식과 일치하는지 확인하십시오.');
        return;
      }

      const seatGrade = seatSectionMatch[1].trim();
      const rawSeats = seatSectionMatch[2];
      const parsedSeats = rawSeats
        .split(/,\s*\n|,\s*|\n/)
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(seatInfo => ({ seatInfo, memo: '' }));

      const newDateTime = dateTimeMatch[1].trim();
      const newCancelTime = cancelTimeMatch ? cancelTimeMatch[1].trim() : '';

      const duplicateRes = reservations.find(res => {
        if (res.dateTime === newDateTime) {
          return res.seats.some(existingSeat =>
            parsedSeats.some(newSeat => newSeat.seatInfo === existingSeat.seatInfo)
          );
        }
        return false;
      });

      if (duplicateRes) {
        if (user) {
          const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reservations', duplicateRes.id);
          await updateDoc(docRef, { originalSMS: inputText }).catch(console.error);
        }
        setInfoMsg('기존 예매내역이 존재하여 원본 문자 내용을 업데이트했습니다.');
        setInputText('');
        return;
      }

      const parsedAgent = agentInput;

      const newId = Date.now().toString();
      const newReservation = {
        id: newId,
        agent: parsedAgent,
        name: nameMatch[1].trim(),
        match: matchMatch[1].trim(),
        reservationNo: resNoMatch[1].trim(),
        dateTime: newDateTime,
        cancelDateTime: newCancelTime,
        seatGrade: seatGrade,
        seats: parsedSeats,
        status: 'active',
        selectedMemoIndex: 0,
        originalSMS: inputText,
        createdAt: Date.now()
      };

      if (user) {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reservations', newId);
        await setDoc(docRef, newReservation);
      }

      setInfoMsg('새로운 예매 내역이 추가되었습니다.');
      setInputText('');
    } catch (e) {
      setErrorMsg('분석 중 오류가 발생했습니다.');
    }
  };

  const handleMemoChange = async (resId, seatIndex, value) => {
    const targetRes = reservations.find(r => r.id === resId);
    if (!targetRes) return;

    const formattedValue = formatMemo(value);
    const updatedSeats = [...targetRes.seats];
    updatedSeats[seatIndex] = { ...updatedSeats[seatIndex], memo: formattedValue };

    setReservations(prev => prev.map(res => 
      res.id === resId ? { ...res, seats: updatedSeats } : res
    ));

    if (user) {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reservations', resId);
      await updateDoc(docRef, { seats: updatedSeats }).catch(console.error);
    }
  };

  const toggleDateStatus = async (date) => {
    const targetReservations = reservations.filter(res => res.dateTime.split(' ')[0] === date);
    if (targetReservations.length === 0) return;

    const anyActive = targetReservations.some(res => res.status === 'active');
    const newStatus = anyActive ? 'ended' : 'active';

    setReservations(prev => prev.map(res => {
      if (res.dateTime.split(' ')[0] === date) {
        return { ...res, status: newStatus };
      }
      return res;
    }));

    if (user) {
      const updatePromises = targetReservations.map(res => {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reservations', res.id);
        return updateDoc(docRef, { status: newStatus });
      });
      await Promise.all(updatePromises).catch(console.error);
    }
  };

  const handleRadioChange = async (resId, index) => {
    setReservations(prev => prev.map(res =>
      res.id === resId ? { ...res, selectedMemoIndex: index } : res
    ));
    if (user) {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reservations', resId);
      await updateDoc(docRef, { selectedMemoIndex: index }).catch(console.error);
    }
  };

  const handleAgentChange = async (resId, newAgent) => {
    setReservations(prev => prev.map(res => 
      res.id === resId ? { ...res, agent: newAgent } : res
    ));

    if (user) {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reservations', resId);
      await updateDoc(docRef, { agent: newAgent }).catch(console.error);
    }
  };

  const deleteReservation = async (id) => {
    if (user) {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reservations', id);
      await deleteDoc(docRef).catch(console.error);
    }
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(reservations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservations_backup_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setInfoMsg('백업이 완료되었습니다.');
    setTimeout(() => setInfoMsg(''), 3000);
  };

  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const restoredData = JSON.parse(e.target.result);
        if (!Array.isArray(restoredData)) throw new Error("Invalid format");

        for (const res of restoredData) {
          if (user) {
            const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'reservations', res.id);
            await setDoc(docRef, res);
          }
        }
        setInfoMsg('복원이 완료되었습니다.');
        setTimeout(() => setInfoMsg(''), 3000);
      } catch (error) {
        setErrorMsg('백업 파일 형식이 올바르지 않습니다.');
        setTimeout(() => setErrorMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleAuthSubmit} className="bg-white p-8 rounded-lg shadow-md border border-gray-200 w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            {isRegistering ? '새 계정 만들기' : '로그인'}
          </h2>
          <div className="space-y-4">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="아이디 (이메일 형식)"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="비밀번호"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {authError && <p className="text-red-500 text-sm mt-3 font-semibold text-center">{authError}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors mt-6">
            {isRegistering ? '계정 생성' : '로그인'}
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">또는</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 border border-gray-300 rounded shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            구글 계정으로 로그인
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              {isRegistering ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 계정 생성'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <span className="font-semibold text-gray-700">{user.email} 님</span>
          <button onClick={handleLogout} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 font-bold transition-colors">
            로그아웃
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">예매 문자 등록</h1>
            <div className="flex gap-2">
              <button onClick={handleBackup} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 font-semibold transition-colors">백업</button>
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 font-semibold transition-colors">복원</button>
              <input type="file" accept=".json" ref={fileInputRef} onChange={handleRestore} className="hidden" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3 p-3 border border-gray-300 rounded bg-white">
            <span className="text-sm font-medium text-gray-700 mr-2">예매처:</span>
            <button
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                agentInput === '공홈' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setAgentInput('공홈')}
            >
              공홈
            </button>
            <button
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                agentInput === '티링' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setAgentInput('티링')}
            >
              티링
            </button>
          </div>
          <textarea
            className="w-full h-40 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
            placeholder="예매 완료 문자 내용을 붙여넣으십시오."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>
          {errorMsg && <p className="text-red-500 text-sm mb-3">{errorMsg}</p>}
          {infoMsg && <p className="text-blue-600 text-sm mb-3 font-semibold">{infoMsg}</p>}
          <button
            onClick={parseSMS}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded transition-colors"
          >
            분석 및 내역 추가
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">예매 내역 ({reservations.filter(res => res.status !== 'ended').length}건)</h2>
            <button
              onClick={() => setHideEnded(!hideEnded)}
              className={`px-3 py-1 text-sm rounded border font-semibold transition-colors ${hideEnded ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {hideEnded ? '종료된 경기 보기' : '종료된 경기 숨기기'}
            </button>
          </div>
          
          {reservations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">등록된 예매 내역이 없습니다.</p>
          ) : (() => {
            const filteredReservations = reservations.filter(res => !(hideEnded && res.status === 'ended'));
            if (filteredReservations.length === 0) {
              return <p className="text-gray-500 text-center py-8">표시할 예매 내역이 없습니다.</p>;
            }
            return filteredReservations.map((res, index) => {
              const currentDate = res.dateTime.split(' ')[0];
              const prevDate = index > 0 ? filteredReservations[index - 1].dateTime.split(' ')[0] : null;
              const showDivider = index === 0 || currentDate !== prevDate;

              const dateReservations = reservations.filter(r => r.dateTime.split(' ')[0] === currentDate);
              const isAllEnded = dateReservations.length > 0 && dateReservations.every(r => r.status === 'ended');

              return (
                <React.Fragment key={res.id}>
                  {showDivider && (
                    <div className="flex items-center my-6">
                      <div className="flex-grow border-t-2 border-gray-300 border-dashed"></div>
                      <div className="mx-4 flex items-center gap-2">
                        <span className="text-gray-600 font-bold">{currentDate}</span>
                        <button
                          onClick={() => toggleDateStatus(currentDate)}
                          className={`text-xs px-2.5 py-1 rounded font-bold border transition-colors ${isAllEnded ? 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                        >
                          {isAllEnded ? '종료됨' : '종료'}
                        </button>
                      </div>
                      <div className="flex-grow border-t-2 border-gray-300 border-dashed"></div>
                    </div>
                  )}
                  <div id={`res-${res.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div 
                      className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleExpand(res.id)}
                    >
                      <div className="flex justify-between items-center w-full gap-2">
                        <div className="flex flex-col flex-1 gap-0.5 min-w-0">
                          <div className="text-sm sm:text-base text-gray-700 font-medium truncate">예매번호: {res.reservationNo}</div>
                          <div className="text-sm sm:text-base text-gray-700 font-medium truncate">예매자: {res.name}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {res.originalSMS && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(res.originalSMS);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-bold px-2.5 py-1.5 rounded border border-blue-200 bg-white shadow-sm hover:bg-blue-50 shrink-0 whitespace-nowrap transition-colors"
                            >
                              문자 복사
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteReservation(res.id);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs sm:text-sm font-bold px-2.5 py-1.5 rounded border border-red-200 bg-white shadow-sm hover:bg-red-50 shrink-0 whitespace-nowrap transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      
                      <div className={`flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-1.5 lg:gap-2 mt-2 mb-3 w-full ${res.status === 'ended' ? 'opacity-60' : ''}`}>
                        {/* 팀명, 예매처 */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-bold text-gray-900">{res.match}</div>
                          <select
                            value={res.agent && (res.agent === '공홈' || res.agent === '티링') ? res.agent : '공홈'}
                            onChange={(e) => handleAgentChange(res.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-xs px-1.5 py-0.5 rounded font-bold border cursor-pointer focus:outline-none text-center ${getAgentColor(res.agent)}`}
                          >
                            <option value="공홈">공홈</option>
                            <option value="티링">티링</option>
                          </select>
                        </div>

                        {/* 좌석명, 좌석타입, 상세좌석 */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-bold border ${getSeatColor(res.seatGrade)}`}>
                            {res.seatGrade}
                          </span>
                          {(() => {
                            const aisleTypes = Array.from(new Set(res.seats.map(s => getAisleType(s.seatInfo))));
                            let displayAisles = aisleTypes.filter(type => type !== '일반');
                            if (displayAisles.length === 0) displayAisles = ['일반'];
                            return displayAisles.map(aisle => (
                              <span key={aisle} className={`text-xs px-1.5 py-0.5 rounded font-bold border ${
                                aisle === '좌통' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                aisle === '우통' ? 'bg-red-50 text-red-600 border-red-200' :
                                'bg-gray-100 text-gray-500 border-gray-200'
                              }`}>
                                {aisle}
                              </span>
                            ));
                          })()}
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              openMapModal(res.seats);
                            }}
                            className="text-xs px-1.5 py-0.5 rounded font-bold border bg-gray-50 text-gray-700 border-gray-200 cursor-pointer hover:bg-gray-200"
                          >
                            {formatSeatRange(res.seats)}
                          </span>
                        </div>

                        {/* 메모 */}
                        {(() => {
                          const displaySeat = res.seats[res.selectedMemoIndex || 0];
                          if (displaySeat && displaySeat.memo.trim() !== '') {
                            const phone = extractPhone(displaySeat.memo);
                            return (
                              <div className="flex">
                                <span 
                                  onClick={(e) => {
                                    if (phone) {
                                      e.stopPropagation();
                                      copyToClipboard(phone);
                                    }
                                  }}
                                  className={`text-xs px-1.5 py-0.5 rounded font-bold border break-all sm:max-w-md ${phone ? 'bg-yellow-100 text-yellow-800 border-yellow-300 cursor-pointer hover:bg-yellow-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`}
                                >
                                  {displaySeat.memo}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="text-sm font-medium text-gray-700 mt-1">
                        경기일자: <span className="text-blue-600 ml-1">{res.dateTime}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        취소기한: <span className="text-red-500 ml-1">{res.cancelDateTime || '미상'}</span>
                      </div>
                    </div>
                    
                    {expandedIds[res.id] && (
                    <div className="p-3">
                      <div className="space-y-1.5 mt-1">
                        {res.seats.map((seat, index) => {
                          const aisle = getAisleType(seat.seatInfo);
                          const phone = extractPhone(seat.memo);
                          return (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-1.5 bg-gray-50 rounded border border-gray-100">
                            <div className="sm:w-1/3 flex items-center gap-2 shrink-0 pl-1">
                              <span className="font-medium text-gray-800 text-sm">{seat.seatInfo}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-bold border ${
                                aisle === '좌통' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                aisle === '우통' ? 'bg-red-50 text-red-600 border-red-200' :
                                'bg-gray-100 text-gray-500 border-gray-200'
                              }`}>
                                {aisle}
                              </span>
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="radio"
                                name={`memo-radio-${res.id}`}
                                checked={(res.selectedMemoIndex || 0) === index}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleRadioChange(res.id, index);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                              />
                              {phone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(phone);
                                  }}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded font-bold hover:bg-gray-300 shrink-0"
                                >
                                  복사
                                </button>
                              )}
                              <input
                                type="text"
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="메모를 입력하십시오 (예: 동반자 이름)"
                                value={seat.memo}
                                onChange={(e) => handleMemoChange(res.id, index, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          })()}
        </div>

      </div>
      
      {mapModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b flex-none">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold">좌석 위치 확인</h3>
                <button 
                  onClick={() => setShowFullMap(!showFullMap)} 
                  className="px-2 py-1 text-xs font-bold bg-gray-200 hover:bg-gray-300 rounded"
                >
                  {showFullMap ? '블록 보기' : '전체블럭'}
                </button>
              </div>
              <button onClick={() => { setMapModalData(null); setShowFullMap(false); }} className="text-gray-500 hover:text-gray-800 font-bold text-xl">&times;</button>
            </div>
            
            <div className="flex-1 min-h-0 p-4">
              <div className="w-full h-full relative bg-gray-50 border rounded overflow-hidden">
                {!showFullMap && (
                  <div className="absolute top-2 left-2 z-10 bg-white bg-opacity-90 px-2 py-1 text-xs font-bold border rounded shadow-sm pointer-events-none">
                    {mapModalData.block} 블록
                  </div>
                )}
                <div className="w-full h-full overflow-auto p-4 md:p-8 text-center">
                  <div className="relative inline-block text-left">
                    {showFullMap ? (
                      <img src="https://i.imgur.com/lwqKYms.png" alt="전체블럭" className="block max-w-none" />
                    ) : (
                      <>
                        <img src={blockImageUrls[mapModalData.block]} alt={`${mapModalData.block} 블록 상세`} className="block max-w-none" onError={(e) => { e.target.style.display = 'none'; }} />
                        {mapModalData.seats.map(seatNum => {
                          const coords = mapCoordinates.seats[mapModalData.block]?.[seatNum];
                          if (!coords) return null;
                          return (
                            <div 
                              key={seatNum}
                              className="absolute bg-blue-500 bg-opacity-50 border-2 border-blue-600 rounded pointer-events-none"
                              style={{
                                top: coords.top,
                                left: coords.left,
                                width: coords.width,
                                height: coords.height
                              }}
                            />
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded shadow-lg z-50 font-bold transition-opacity duration-300">
          {toastMsg}
        </div>
      )}
    </div>
  );
}