import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// 환경변수 FIREBASE_KEY_JSON 로부터 서비스 계정 JSON 파싱
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Firebase 초기화 (중복 방지)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
