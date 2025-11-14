import fs from "fs/promises";
import axios from "axios";

// 예: VALID_LAW_IDS, LAW_API_BASE_URL 등 환경변수로 설정 가능
const VALID_LAW_IDS = ["001248", "001444", "001638", "001706", "009318", "001692", "001206"]; // 실제 ID 목록
const LAW_API_BASE_URL = "https://www.law.go.kr/법령조회API"; // 예시

// ----------------------- 법령 API -----------------------
async function fetchLawArticles(lawId) {
  try {
    const params = { OC: process.env.YOUR_OC_USER_ID, type: 'JSON', target: 'eflaw', ID: lawId };
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

// ----------------------- Gemini AI 퀴즈 생성 -----------------------
async function generateQuizJson(article, ai) {
  const systemInstruction = `
법률 상식 퀴즈 생성 전문가입니다.
JSON 스키마: {
  "id": "integer",
  "category": "string",
  "question": "string",
  "options": [{"text": "string", "is_correct": "boolean"}],
  "answer": "string",
  "explanation": "string",
  "timer_sec": "integer"
}`;
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
    const rawQuiz = JSON.parse(response.text);
    rawQuiz.source_law_name = article.lawName;
    return rawQuiz;
  } catch (err) {
    console.error("Gemini AI 퀴즈 생성 실패:", err.message || err);
    return null;
  }
}

// ----------------------- 정규화 -----------------------
function normalizeQuiz(rawQuiz, id) {
  if (!rawQuiz || !rawQuiz.question || !Array.isArray(rawQuiz.options)) return null;
  return {
    id,
    category: rawQuiz.category || "법률 상식",
    question: rawQuiz.question,
    options: rawQuiz.options.map(opt => ({ text: opt.text, is_correct: !!opt.is_correct })),
    answer: rawQuiz.answer,
    explanation: rawQuiz.explanation,
    timer_sec: rawQuiz.timer_sec || 15,
    source_law_name: rawQuiz.lawName || "법률 상식"
  };
}

// ----------------------- 메인 함수 -----------------------
export async function generateAndCacheQuizzes(cacheFilePath) {
  const allGeneratedQuizzes = [];
  let generatedCount = 0;

  // Gemini API 초기화 (환경변수 기반)
  import OpenAI from "openai";
  const ai = new OpenAI({ apiKey: process.env.LAW_QUIZ_GEMINI_KEY });

  for (const lawId of VALID_LAW_IDS) {
    const articles = await fetchLawArticles(lawId);
    if (!articles.length) continue;

    const randomArticle = articles[Math.floor(Math.random() * articles.length)];
    const rawQuiz = await generateQuizJson(randomArticle, ai);
    const quiz = normalizeQuiz(rawQuiz, Date.now() + generatedCount);

    if (!quiz) continue;
    allGeneratedQuizzes.push(quiz);
    generatedCount++;
  }

  await fs.writeFile(cacheFilePath, JSON.stringify(allGeneratedQuizzes, null, 2), "utf-8");
  return allGeneratedQuizzes;
}
