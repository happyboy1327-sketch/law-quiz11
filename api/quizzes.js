import fs from 'fs/promises';
import path from 'path';
import express from 'express';

const app = express();
const QUIZ_CACHE_FILE = path.join(process.cwd(), 'cached_law_quizzes.json');

app.use(express.json());
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  next();
});

app.get('/api/quizzes', async (req,res)=>{
  try {
    const data = await fs.readFile(QUIZ_CACHE_FILE,'utf-8');
    res.json(JSON.parse(data));
  } catch(err){
    console.error("🚨 캐시 읽기 실패:", err.message);
    res.status(500).send("퀴즈 데이터를 불러올 수 없습니다.");
  }
});

export default app;
