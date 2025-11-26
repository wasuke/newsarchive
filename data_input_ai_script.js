//------------------------------------------------------------
// data_input_ai_script.js（新スキーマ対応・完全版）
//  - OpenAI Responses API による記事解析
//  - 文分類 fact / prediction / opinion / quote
//  - summary[]（要約文＋予測要点）
//  - futureTree（テキスト形式）
//  - GitHub に data/{articleId}.json をアップロード
//------------------------------------------------------------

// DOM
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("generateJsonBtn").addEventListener("click", generateJsonWithAI);
  document.getElementById("uploadBtn").addEventListener("click", uploadToGitHub);
});

// 生成データ保持
window.generatedJson = null;

//------------------------------------------------------------
// ① AI に JSON を生成させる
//------------------------------------------------------------
async function generateJsonWithAI() {
  const title      = document.getElementById("titleInput").value.trim();
  const source     = document.getElementById("sourceInput").value.trim();
  const date       = document.getElementById("dateInput").value.trim();
  const body       = document.getElementById("bodyInput").value.trim();
  const publicFlag = document.getElementById("publicFlag").value === "true";
  const apiKey     = document.getElementById("openaiKey").value.trim();

  const outputBox  = document.getElementById("jsonOutput");
  outputBox.textContent = "AI に問い合わせ中…";

  if (!apiKey) return outputBox.textContent = "APIキーが未入力です。";
  if (!title || !source || !date || !body)
    return outputBox.textContent = "タイトル・新聞名・日付・本文を入力してください。";

  // 一意ID
  const articleId = Date.now().toString();
  const prompt = createPrompt_v2(articleId, title, source, date, publicFlag, body);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: prompt,
        max_output_tokens: 12000
      })
    });

    const data = await res.json();

    const aiText = extractOutputText(data);
    if (!aiText) {
      outputBox.textContent = "生成失敗：AI 出力が空です\n" + JSON.stringify(data, null, 2);
      return;
    }

    // コードブロック除去
    const cleaned = aiText.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      outputBox.textContent =
        "生成失敗：JSONとして解釈できません\n\n" + cleaned + "\n\n" + e;
      return;
    }

    //----------------------------------------------------
    // 最重要：新スキーマに合わせて補正
    //----------------------------------------------------
    parsed.articleId = articleId;
    parsed.title     = title;
    parsed.source    = source;
    parsed.date      = date;
    parsed.public    = publicFlag;
    parsed.text      = body;

    // summary は必ず string[] に統一
    if (parsed.summary && !Array.isArray(parsed.summary)) {
      parsed.summary = [];
    }

    // futureTree は string に統一
    if (typeof parsed.futureTree !== "string") {
      parsed.futureTree = "No Future Tree.";
    }

    // sentences の構造保証
    if (!Array.isArray(parsed.sentences)) parsed.sentences = [];

    parsed.sentences = parsed.sentences.map(s => ({
      id: s.id || "",
      text: s.text || "",
      type: s.type || "fact",
      confidence: typeof s.confidence === "number" ? s.confidence : 0,
      predictionId: s.type === "prediction" ? (s.predictionId || null) : null
    }));

    window.generatedJson = parsed;
    outputBox.textContent = JSON.stringify(parsed, null, 2);

  } catch (err) {
    outputBox.textContent = "生成失敗：通信エラー\n" + err;
  }
}

//------------------------------------------------------------
// AI 出力の取り出し
//------------------------------------------------------------
function extractOutputText(data) {
  try {
    if (!data.output) return null;

    let chunks = [];

    for (const out of data.output) {
      if (out.type === "message" && Array.isArray(out.content)) {
        for (const c of out.content) {
          if (c.type === "output_text") chunks.push(c.text);
        }
      }
    }

    return chunks.join("\n");
  } catch (e) {
    return null;
  }
}

//------------------------------------------------------------
// ② プロンプト v2（新スキーマ対応）
//------------------------------------------------------------
function createPrompt_v2(articleId, title, source, date, publicFlag, body) {
  return `
あなたはニュース記事アーカイブ専用のJSON生成エンジンです。
次のニュース記事を読み、出力フォーマットに完全一致した JSON を返してください。
出力は JSON のみで、余計な文章・説明・コードブロックは絶対に出さないこと。

【出力 JSON スキーマ】

{
  "articleId": "string",
  "title": "string",
  "source": "string",
  "date": "YYYY-MM-DD",
  "public": boolean,

  "text": "記事全文（入力 그대로）",

  "sentences": [
    { "id": "s1", "text": "...", "type": "fact|prediction|opinion|quote", "confidence": 0.0〜1.0, "predictionId": "p1 または null" }
  ],

  "summary": [
    "記事を要約した短い文",
    "予測に関するポイント（まとめたもの）"
  ],

  "futureTree": "Root → p1 → p2 → ..."
}

【type判定ルール】
fact: 客観情報・出来事・発表・数値
quote: 発言そのもの（直接話法／コメント）
prediction: 未来に関する見通し・懸念・予測（可能性・見通し・〜だろう）
opinion: 記者の評価・論評（未来の話でなければ opinion）

【summary】
・記事全体の要約を2〜5文
・prediction の内容があれば要点を1文で追加

【futureTree】
・prediction が p1, p2… の順に存在したら
  "Root → p1 → p2 ..." の形式で作る
・prediction が1つも無い場合:
  "Root: 事実のみ（予測なし）"

【入力】
articleId: ${articleId}
title: ${title}
source: ${source}
date: ${date}
public: ${publicFlag}

本文:
${body}
`;
}

//------------------------------------------------------------
// ③ GitHub アップロード
//------------------------------------------------------------
async function uploadToGitHub() {
  const jsonData  = window.generatedJson;
  const resultBox = document.getElementById("uploadResult");

  if (!jsonData) {
    resultBox.textContent = "先に JSON を生成してください。";
    return;
  }

  const ghToken  = document.getElementById("ghToken").value.trim();
  const ghUser   = document.getElementById("ghUser").value.trim();
  const ghRepo   = document.getElementById("ghRepo").value.trim();
  const ghBranch = document.getElementById("ghBranch").value.trim();

  if (!ghToken || !ghUser || !ghRepo || !ghBranch) {
    resultBox.textContent = "GitHub 情報が不足しています。";
    return;
  }

  try {
    const path = `data/${jsonData.articleId}.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));

    resultBox.textContent = "GitHub にアップロード中…";

    const res = await fetch(
      `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${ghToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Add article ${jsonData.articleId}.json`,
          content,
          branch: ghBranch
        })
      }
    );

    const data = await res.json();

    if (data.commit) {
      resultBox.textContent =
        `アップロード成功！\n${path}\nlist.json は GitHub Actions により更新されます。`;
    } else {
      resultBox.textContent = "アップロード失敗:\n" + JSON.stringify(data, null, 2);
    }

  } catch (err) {
    resultBox.textContent = "通信エラー:\n" + err;
  }
}
