import express from "express";
import { db } from "./firebase_admin.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));

// API: Firestore에서 퀴즈 불러오기
app.get("/api/quizzes", async (req, res) => {
  try {
    const snapshot = await db.collection("quizzes").get();
    const quizzes = snapshot.docs.map(doc => {
      const data = doc.data();
      // Firestore는 객체로 반환되므로 배열로 변환
      return {
        id: doc.id,
        question: data.question,
        answer: data.answer,
        explanation: data.explanation,
        category: data.category || "법률 상식",
        options: data.options.map(opt => ({
          text: opt.text,
          is_correct: !!opt.is_correct
        })),
        article: { lawName: data.article?.lawName || "법률 상식" },
        timer_sec: data.timer_sec || 15
      };
    });
    res.json(quizzes);
  } catch (err) {
    console.error("퀴즈 API 오류:", err);
    res.status(500).json({ error: "퀴즈를 불러오는 중 오류가 발생했습니다." });
  }
});

export defalut app;

