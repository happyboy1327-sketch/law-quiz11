// quiz_generator.js
console.log("=== [DEBUG] quiz_generator.js 실행됨 ===");

import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const GEMINI_API_KEY = process.env.LAW_QUIZ_GEMINI_KEY;
const YOUR_OC_USER_ID = process.env.LAW_QUIZ_OC_ID;
const MODEL = "gemini-2.5-flash";
const QUIZ_COUNT_PER_SET = 5;
const VALID_LAW_IDS = ["001248", "001444", "001638", "001706", "009318", "001692", "001206"];
const LAW_API_BASE_URL = "https://www.law.go.kr/DRF/lawService.do";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Firebase Admin 초기화
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY_JSON || '{}'))
    });
}
const db = admin.firestore(); // Firestore 인스턴스

// ----------------------- AI 퀴즈 생성 -----------------------
async function generateQuizJson(article) {
    const systemInstruction = `
법률 상식 퀴즈 생성 전문가입니다.
JSON 스키마에 맞춰서 출력하십시오.
스키마: {
  "id": "integer",
  "category": "string",
  "question": "string",
  "options": [{"text": "string", "is_correct": "boolean"}],
  "answer": "string",
  "explanation": "string",
  "timer_sec": "integer"
}
`;

    const prompt = `
법령: ${article.lawName}
조문번호: ${article.num}
조문 내용: ${article.content}
요구: timer_sec=15, explanation 포함
`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { systemInstruction, responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    } catch (err) {
        console.error("Gemini AI 퀴즈 생성 실패:", err.message || err);
        return null;
    }
}

// ----------------------- 퀴즈 정규화 -----------------------
function normalizeQuiz(rawQuiz, id) {
    if (!rawQuiz || !rawQuiz.question || !Array.isArray(rawQuiz.options)) return null;

    return {
        id: id,
        category: rawQuiz.category || "법률 상식",
        question: rawQuiz.question,
        options: rawQuiz.options.map(opt => ({
            text: opt.text,
            is_correct: !!opt.is_correct
        })),
        answer: rawQuiz.answer,
        explanation: rawQuiz.explanation,
        timer_sec: rawQuiz.timer_sec || 15
    };
}

// ----------------------- 법령 API -----------------------
async function fetchLawArticles(lawId) {
    try {
        const params = { OC: YOUR_OC_USER_ID, type: 'JSON', target: 'eflaw', ID: lawId };
        const response = await axios.get(LAW_API_BASE_URL, { params });
        const lawInfo = response.data['법령'];
        if (!lawInfo?.조문?.조문단위) return [];

        const joData = Array.isArray(lawInfo.조문.조문단위) ? lawInfo.조문.조문단위 : [lawInfo.조문.조문단위];
        return joData.map(jo => ({
            num: jo['조문번호'],
            content: jo['조문내용'],
            lawName: lawInfo['기본정보']['법령명_한글']
        }));
    } catch (err) {
        console.error(`법령 API 오류 (ID: ${lawId}):`, err.message);
        return [];
    }
}

// ----------------------- 메인 함수 -----------------------
export async function generateAndCacheQuizzes(db, cacheFilePath) {
    const allGeneratedQuizzes = [];
    let generatedCount = 0;

    for (const lawId of VALID_LAW_IDS) {
        const articles = await fetchLawArticles(lawId);
        if (!articles.length) continue;

        const randomArticle = articles[Math.floor(Math.random() * articles.length)];
        const rawQuiz = await generateQuizJson(randomArticle);
        const quiz = normalizeQuiz(rawQuiz, Date.now() + generatedCount);

        if (!quiz) continue;

        // Firestore 저장 (JSON 직렬화)
        try {
            await db.collection('law_quizzes').doc(String(quiz.id)).set(JSON.parse(JSON.stringify(quiz)));
            console.log("✅ Firestore 저장 성공:", quiz.id);
        } catch (err) {
            console.error("🚨 Firestore 저장 실패:", err.message);
        }

        allGeneratedQuizzes.push(quiz);
        generatedCount++;

        if (allGeneratedQuizzes.length >= QUIZ_COUNT_PER_SET) break; // 5문제만 생성
    }

    // 로컬 캐시 저장
    if (allGeneratedQuizzes.length) {
        await fs.writeFile(cacheFilePath, JSON.stringify(allGeneratedQuizzes, null, 2), 'utf-8');
        console.log(`총 ${allGeneratedQuizzes.length}개 퀴즈 캐시 완료`);
    } else {
        console.error("퀴즈 생성 실패: 0개");
    }
}

// ----------------------- 단독 실행용 -----------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const cacheFilePath = path.resolve("./cached_law_quizzes.json");
    generateAndCacheQuizzes(db, cacheFilePath);
}

