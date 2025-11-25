//------------------------------------------------------------
// data_input_ai_script.js（gpt-4.1 / 12000tokens 対応 完全版）
//  - OpenAI Responses API で記事を解析
//  - 文分類 (fact/prediction/opinion/quote)
//  - summary（要約＋予測抽出）
//  - futureTree（予測ノード初期化）
//  - GitHub に data/{articleId}.json をアップロード
//------------------------------------------------------------

// DOM 準備
document.addEventListener("DOMContentLoaded", () => {
  const genBtn = document.getElementById("generateJsonBtn");
  const upBtn  = document.getElementById("uploadBtn");

  if (genBtn) genBtn.addEventListener("click", generateJsonWithAI);
  if (upBtn)  upBtn.addEventListener("click", uploadToGitHub);
});

// グローバル保存用
window.generatedJson = null;

//------------------------------------------------------------
// ① AI による JSON 生成
//------------------------------------------------------------
async function generateJsonWithAI() {
  const title      = document.getElementById("titleInput").value.trim();
  const source     = document.getElementById("sourceInput").value.trim();
  const date       = document.getElementById("dateInput").value.trim();
  const body       = document.getElementById("bodyInput").value.trim();
  const publicFlag = document.getElementById("publicFlag").value === "true";
  const apiKey     = document.getElementById("openaiKey").value.trim();

  const outputBox = document.getElementById("jsonOutput");
  outputBox.textContent = "AI に問い合わせ中…（数秒〜十数秒かかることがあります）";

  if (!apiKey) {
    outputBox.textContent = "OpenAI API キーが未入力です。";
    return;
  }
  if (!title || !source || !date || !body) {
    outputBox.textContent = "タイトル・新聞名・日付・本文をすべて入力してください。";
    return;
  }

  // 一意ID（UNIXミリ秒）
  const articleId = Date.now().toString();

  const prompt = createPrompt_v1(title, source, date, body, publicFlag, articleId);

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
        // Responses API では response_format / text.format は使わず、
        // プロンプトで「JSONのみ」を強く要求する。
      })
    });

    const data = await res.json();

    // status をチェック（max_output_tokens で途中切れの場合）
    if (data.status === "incomplete" &&
        data.incomplete_details &&
        data.incomplete_details.reason === "max_output_tokens") {
      const partialText = extractOutputText(data);
      outputBox.textContent =
        "生成失敗：出力が長すぎて途中で切れました（max_output_tokens に到達）。\n" +
        "記事本文が長すぎるか、生成内容が多すぎる可能性があります。\n\n" +
        "【途中までの出力】\n" + (partialText || "(なし)") +
        "\n\n【生データ】\n" + JSON.stringify(data, null, 2);
      return;
    }

    const aiText = extractOutputText(data);
    if (!aiText) {
      outputBox.textContent =
        "生成失敗：AI 出力テキストが取得できませんでした。\n" +
        JSON.stringify(data, null, 2);
      return;
    }

    // コードブロック除去
    const cleaned = aiText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      outputBox.textContent =
        "生成失敗：AI 出力を JSON として解釈できませんでした。\n\n" +
        "【パース対象のテキスト】\n" + cleaned + "\n\n" +
        "【エラー】\n" + e;
      return;
    }

    // 念のため、articleId / meta が一致するか補正
    parsed.articleId = articleId;
    parsed.title     = title;
    parsed.source    = source;
    parsed.date      = date;
    parsed.public    = publicFlag;
    parsed.text      = body;

    window.generatedJson = parsed;
    outputBox.textContent = JSON.stringify(parsed, null, 2);

  } catch (err) {
    outputBox.textContent = "生成失敗：通信エラー\n" + err;
  }
}

//------------------------------------------------------------
// Responses API の output から output_text を取り出す
//------------------------------------------------------------
function extractOutputText(data) {
  try {
    if (!data.output || !Array.isArray(data.output)) return null;

    let textChunks = [];

    for (const out of data.output) {
      if (out.type === "message" && Array.isArray(out.content)) {
        for (const block of out.content) {
          if (block.type === "output_text" && typeof block.text === "string") {
            textChunks.push(block.text);
          }
        }
      }
    }

    if (textChunks.length === 0) return null;

    return textChunks.join("\n");
  } catch (e) {
    console.error("extractOutputText error:", e);
    return null;
  }
}

//------------------------------------------------------------
// ② プロンプト v1（fact/prediction/opinion/quote 対応）
//------------------------------------------------------------
function createPrompt_v1(title, source, date, body, publicFlag, articleId) {
  return `
あなたはニュース記事アーカイブ専用の分析エンジンです。
以下のニュース記事を読み、次のルールに従って JSON を生成してください。

出力は必ず JSON オブジェクトのみとし、日本語の説明文やコードブロック記号（\`\`\`）は一切含めないこと。

---

【最終的に生成する JSON スキーマ】

{
  "articleId": "入力で与えられた articleId をそのまま使う",
  "title": "入力タイトルをそのまま使う",
  "source": "入力新聞名をそのまま使う",
  "date": "入力日付をそのまま使う",
  "public": true or false（入力の publicFlag をそのまま反映）,

  "text": "記事全文（入力本文をそのまま）",

  "sentences": [
    {
      "id": "s1",
      "text": "記事を文単位に分割した1文",
      "type": "fact | prediction | opinion | quote",
      "confidence": 0.0〜1.0,
      "predictionId": "p1 などのID（prediction のときのみ）または null"
    }
  ],

  "summary": {
    "keyPoints": [
      "記事の重要ポイントを要約した文（3〜5文程度）"
    ],
    "predictions": [
      {
        "predictionId": "p1",
        "sentence": "予測内容を短く正規化した文",
        "category": "政治 | 経済 | 国際 | 災害 | 社会 | 事件 | 文化 | スポーツ など",
        "strength": 0.0〜1.0（予測の強さ）
      }
    ]
  },

  "futureTree": {
    "nodes": [
      {
        "predictionId": "p1",
        "sentence": "予測文そのもの",
        "status": "pending",
        "answers": []
      }
    ],
    "treeText": "Root → p1 → p2 のような簡単なテキスト表現"
  }
}

---

【文の type の定義】

● type = "fact"
  ・起きた出来事や客観的な説明、数値、データ。
  ・「A氏は〜と述べた」という“発言の報告”も fact（発言そのものは quote）。

● type = "quote"
  ・誰かの発言そのもの（引用・インタビュー・コメント）。
  ・「〜と語った」「〜と話した」などの直接/準直接話法の部分。
  ・その人物の感情・評価・主観を反映している発言。

● type = "prediction"
  ・未来に関する見通し・予測・懸念・期待。
  ・「〜だろう」「〜見通し」「〜可能性がある」「〜と予想される」など。
  ・prediction 文にだけ "predictionId": "p1", "p2", ... を付与する。

● type = "opinion"
  ・記者や解説者などの評価・論評・態度。
  ・現在の状況への評価で、未来予測ではないもの。

---

【summary の作り方】

● summary.keyPoints
  ・記事全体の流れと論点が分かる要約を 3〜5 文で作成する。
  ・50年後の読者が読んでも文脈が分かるように、固有名詞と出来事をきちんと書く。

● summary.predictions
  ・type = "prediction" の文を元に、予測内容を短く整理して1文にする。
  ・同じ意味の予測が複数あれば 1 つにまとめてよい。
  ・category は「政治/経済/国際/災害/社会/事件/文化/スポーツ/技術」などから自然に選ぶ。
  ・strength は 0〜1 の範囲で、「どれくらい強い調子の予測か」を数値化する。

---

【futureTree の作り方】

● futureTree.nodes
  ・各 predictionId ごとに 1 ノード作成する。
  ・prediction の元文を "sentence" に入れる。
  ・status は必ず "pending"。
  ・answers は将来の続報記事用なので、今は空配列 [] のまま。

● futureTree.treeText
  ・predictionId が p1, p2, p3 のように存在するなら、
    "Root → p1 → p2 → p3" のような簡単な線形表現でよい。

---

【重要な制約】

・articleId, title, source, date, public, text には、必ず「入力で与えられた値」をそのまま使うこと。
・JSON のキー名は上記スキーマと完全に一致させること（余計なキーは追加しない）。
・数字は JSON として有効な形式（小数なら 0.85 のように）で書くこと。
・出力は JSON オブジェクト 1 つだけとし、コードブロック記号（\`\`\`）や余分な文字は一切出力しないこと。

---

【入力記事】

articleId: ${articleId}
タイトル: ${title}
新聞名: ${source}
日付: ${date}
公開可否: ${publicFlag}

本文:
${body}
`;
}

//------------------------------------------------------------
// ③ GitHub へアップロード
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
    resultBox.textContent = "GitHub Token / User / Repo / Branch を確認してください。";
    return;
  }

  try {
    const path    = `data/${jsonData.articleId}.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));

    const url = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${path}`;

    resultBox.textContent = "GitHub へアップロード中…";

    const res = await fetch(url, {
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
    });

    const data = await res.json();

    if (data.commit) {
      resultBox.textContent =
        `アップロード成功！\n${path}\n\nGitHub Actions が list.json を更新します。`;
    } else {
      resultBox.textContent =
        "アップロード失敗：\n" + JSON.stringify(data, null, 2);
    }

  } catch (err) {
    resultBox.textContent = "アップロード中にエラーが発生しました。\n" + err;
  }
}
