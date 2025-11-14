import { generateAndCacheQuizzes } from './quiz_generator.js';
import admin from 'firebase-admin';
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

// Firebase 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY_JSON || '{}'))
  });
}
const db = admin.firestore();

// 로컬 캐시 파일 경로
const QUIZ_CACHE_FILE = './cached_law_quizzes.json';

// 퀴즈 생성 및 저장
async function main() {
  console.log("[시작] 퀴즈 생성 및 저장");

  try {
    await generateAndCacheQuizzes(db, QUIZ_CACHE_FILE, 5); // 🔹 5문제만 생성
    console.log("[완료] 퀴즈 생성 완료 및 Firestore + 로컬 캐시 저장");
  } catch (err) {
    console.error("퀴즈 생성 중 예외 발생:", err);
  }
}

main();

// Vercel 배포용으로 모듈 export
export { main };
