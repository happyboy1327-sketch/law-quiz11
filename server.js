import express from "express";
import fs from "fs/promises";
import path from "path";
import url from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const CACHE_FILE_PATH = path.join(__dirname, "cached_law_quizzes.json");

// 정적 파일 (index.html, CSS 등)
app.use(express.static(path.join(__dirname, "public")));

// ✅ /api/quizzes 라우트 — HTML과 fetch 경로 일치
app.get("/api/quizzes", async (req, res) => {
  try {
    const data = await fs.readFile(CACHE_FILE_PATH, "utf-8");
    const quizzes = JSON.parse(data);
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return res.status(500).json({ error: "퀴즈 데이터가 비어 있습니다." });
    }
    res.json(quizzes);
  } catch (err) {
    console.error("🚨 퀴즈 데이터 로드 오류:", err.message);
    res.status(500).json({ error: "퀴즈 파일을 읽는 데 실패했습니다." });
  }
});

// 기본 페이지
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

export default app;
