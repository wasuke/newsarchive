// ============================================================
//  UI 要素
// ============================================================

const apiKeyInput = document.getElementById("apiKeyInput");
const ghTokenInput = document.getElementById("ghTokenInput");
const articleInput = document.getElementById("articleInput");
const jsonOutput = document.getElementById("jsonOutput");
const statusMessage = document.getElementById("statusMessage");


// ============================================================
//  ① JSON生成（OpenAI API）
// ============================================================

document.getElementById("generateBtn").addEventListener("click", async () => {

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) return alert("OpenAI APIキーを入力してください");

  const prompt = `
以下は新聞記事です。これを次の統一スキーマJSONに変換してください。

【新スキーマ】
{
  "articleId": "",
  "title": "",
  "source": "",
  "date": "YYYY-MM-DD",
  "public": false,
  "text": "",
  "sentences": [
    { "text": "", "type": "fact|prediction|opinion", "confidence": 0.0 }
  ],
  "summary": [
    "要約1",
    "要約2"
  ],
  "futureTree": "Root → ..."
}

記事本文：
${articleInput.value}
`;

  statusMessage.innerText = "生成中...";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    })
  });

  const data = await response.json();
  if (!data.choices) {
    statusMessage.innerText = "生成失敗";
    return;
  }

  let content = data.choices[0].message.content.trim();

  // JSONだけ抽出（```json ...```形式を許容）
  content = content.replace(/```json/g, "").replace(/```/g, "");

  jsonOutput.value = content;
  statusMessage.innerText = "JSON生成完了（必要なら編集してください）";
});


// ============================================================
// ② GitHub Upload
// ============================================================

document.getElementById("uploadBtn").addEventListener("click", async () => {

  const ghToken = ghTokenInput.value.trim();
  if (!ghToken) return alert("GitHub Token を入力してください");

  const jsonText = jsonOutput.value.trim();
  if (!jsonText) return alert("JSONがありません");

  // JSONパース確認
  let jsonObj;
  try {
    jsonObj = JSON.parse(jsonText);
  } catch (e) {
    alert("JSON形式が不正です");
    return;
  }

  const fileName = `${jsonObj.articleId}.json`;
  const repo = "newsarchive";
  const owner = "wasuke";
  const path = `data/${fileName}`;

  statusMessage.innerText = "GitHubへアップロード中...";

  const uploadResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        "Authorization": "token " + ghToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Add article JSON " + fileName,
        content: btoa(unescape(encodeURIComponent(jsonText))),
        branch: "main"
      })
    }
  );

  if (uploadResponse.status === 201 || uploadResponse.status === 200) {
    statusMessage.innerText = "GitHub アップロード成功（Actionsが list.json を更新します）";
  } else {
    const err = await uploadResponse.json();
    console.error(err);
    statusMessage.innerText = "アップロード失敗";
  }
});
