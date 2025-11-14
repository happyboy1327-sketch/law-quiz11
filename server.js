import express from "express";
import fs from "fs/promises";
import path from "path";
import url from "url";
import dotenv from "dotenv";
import { generateAndCacheQuizzes } from "./quiz_generator.js";

dotenv.config();
const app = express();
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const CACHE_FILE_PATH = path.join(__dirname, "cached_law_quizzes.json");

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));

// API: 퀴즈 반환
app.get("/api/quizzes", async (req, res) => {
  try {
    // 캐시가 없으면 생성
    try {
      await fs.access(CACHE_FILE_PATH);
    } catch {
      console.log("캐시 없음 → 새 퀴즈 생성");
      await generateAndCacheQuizzes(CACHE_FILE_PATH);
    }

    const data = await fs.readFile(CACHE_FILE_PATH, "utf-8");
    const quizzes = JSON.parse(data);
    res.json(quizzes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "퀴즈 로드 실패" });
  }
});

// 기본 페이지
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


export default app;
