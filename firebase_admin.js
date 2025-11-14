import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// 서비스 계정 키를 환경 변수에서 로드
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Firebase 초기화 (중복 방지)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
