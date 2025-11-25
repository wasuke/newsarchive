//------------------------------------------------------------
// data_input_ai_script.js（引用／インタビュー分類対応 完全版）
//  - OpenAI Responses API（JSONモード）で解析
//  - 文分類(fact/prediction/opinion/quote)
//  - 要約 + 予測抽出 + FutureTree 初期化
//  - GitHub アップロード機能
//------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("generateJsonBtn").addEventListener("click", generateJsonWithAI);
  document.getElementById("uploadBtn").addEventListener("click", uploadToGitHub);
});

//------------------------------------------------------------
// ① AI による JSON 生成
//------------------------------------------------------------

async function generateJsonWithAI() {
  const title = document.getElementById("titleInput").value.trim();
  const source = document.getElementById("sourceInput").value.trim();
  const date = document.getElementById("dateInput").value.trim();
  const body = document.getElementById("bodyInput").value.trim();
  const publicFlag = document.getElementById("publicFlag").value === "true";
  const apiKey = document.getElementById("openaiKey").value.trim();

  const outputBox = document.getElementById("jsonOutput");
  outputBox.textContent = "AI に問い合わせ中...（数秒〜10秒）";

  if (!apiKey) {
    outputBox.textContent = "OpenAI API キーが未入力です。";
    return;
  }

  const articleId = Date.now().toString();
  const prompt = createPrompt_v1(title, source, date, body, publicFlag, articleId);

  try {
    // --------------------------------------------------------
    // OpenAI Responses API（JSON出力モード）
    // --------------------------------------------------------
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        max_output_tokens: 2000,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!data.output_text) {
      outputBox.textContent =
        "生成失敗：AI 出力が空です。\n" + JSON.stringify(data, null, 2);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(data.output_text);
    } catch (e) {
      outputBox.textContent =
        "生成失敗：AI 出力が JSON として解釈できません。\n" + data.output_text;
      return;
    }

    window.generatedJson = parsed;
    outputBox.textContent = JSON.stringify(parsed, null, 2);

  } catch (err) {
    outputBox.textContent = "エラー: " + err;
  }
}

//------------------------------------------------------------
// ② プロンプト v1（引用分類対応）
//------------------------------------------------------------

function createPrompt_v1(title, source, date, body, publicFlag, articleId) {

return `
あなたはニュース記事アーカイブ専用の分析エンジンです。
以下のニュース記事を読み、次のルールに従って JSON を生成してください。

出力は必ず JSON のみとし、説明文を含めないこと。

---

【JSON スキーマ】

{
  "articleId": "",
  "title": "",
  "source": "",
  "date": "",
  "public": false,

  "text": "記事全文",

  "sentences": [
    {
      "id": "s1",
      "text": "",
      "type": "fact | prediction | opinion | quote",
      "confidence": 0.00,
      "predictionId": "p1 または null"
    }
  ],

  "summary": {
    "keyPoints": [],
    "predictions": []
  },

  "futureTree": {
    "nodes": [],
    "treeText": ""
  }
}

---

【分類ルール】

● fact  
　・事実や出来事の記述  
　・数字、データ、出来事、客観的説明  
　・「A氏は〜と述べた」という"発言の報告"も fact  

● quote（引用・発言・インタビュー）  
　・発言そのもの（引用符・肉声部分）  
　・「〜と語った」「〜と話した」などの直接または準直接話法  
　・主語が個人で、その人物の見解や感情が入っている場合

● prediction  
　・未来を述べる文  
　・見通し、懸念、予測、可能性  
　・「〜だろう」「〜可能性」「〜見通し」「〜と予想」など  
　・prediction 文にだけ predictionId を付与（p1, p2, ...）

● opinion  
　・記者・識者などの主観的評価・態度・解釈  
　・未来ではなく現在に対する態度の場合はこちら

---

【summary】

● keyPoints  
　・記事の重要ポイントを 3〜5 文の簡潔な要約で作成  
　・50年後の読者が読んでも文脈が理解できる要約

● predictions  
　・記事中の prediction 文のみ抽出  
　・意味を短く要約して canonical sentence を作成  
　・カテゴリ（政治/経済/国際/災害/社会/事件…）を推定  
	・strength: 予測の強さ（0〜1 の float）

---

【futureTree】

● nodes  
　・predictionId ごとに 1 ノード作成  
　・status は "pending"  
　・answers は空配列

● treeText  
　例： "Root → p1 → p2"

---

入力記事：

articleId: ${articleId}
タイトル: ${title}
新聞名: ${source}
日付: ${date}
公開可否: ${publicFlag}

本文：
${body}

上記仕様に完全準拠した JSON のみを生成してください。
`;
}


//------------------------------------------------------------
// ③ GitHub アップロード
//------------------------------------------------------------

async function uploadToGitHub() {
  const jsonData = window.generatedJson;
  const resultBox = document.getElementById("uploadResult");

  if (!jsonData) {
    resultBox.textContent = "先に JSON を生成してください。";
    return;
  }

  const ghToken = document.getElementById("ghToken").value.trim();
  const ghUser = document.getElementById("ghUser").value.trim();
  const ghRepo = document.getElementById("ghRepo").value.trim();
  const ghBranch = document.getElementById("ghBranch").value.trim();

  if (!ghToken) {
    resultBox.textContent = "GitHub Token が未入力です。";
    return;
  }

  try {
    const path = `data/${jsonData.articleId}.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));

    const url = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${path}`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${ghToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add article ${jsonData.articleId}.json`,
        content: content,
        branch: ghBranch
      })
    });

    const data = await res.json();

    if (data.commit) {
      resultBox.textContent =
        `アップロード成功！\n${path}\nGitHub Actions が list.json を更新します。`;
    } else {
      resultBox.textContent =
        "アップロード失敗：\n" + JSON.stringify(data, null, 2);
    }

  } catch (err) {
    resultBox.textContent = "エラー: " + err;
  }
}
