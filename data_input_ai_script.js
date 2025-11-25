// ============================================================
// ① JSON 生成（OpenAI /v1/responses API）
// ============================================================

document.getElementById("generateJsonBtn").addEventListener("click", async () => {
  const title = document.getElementById("titleInput").value.trim();
  const source = document.getElementById("sourceInput").value.trim();
  const date = document.getElementById("dateInput").value.trim();
  const body = document.getElementById("bodyInput").value.trim();
  const publicFlag = document.getElementById("publicFlag").value === "true";
  const apiKey = document.getElementById("openaiKey").value.trim();

  if (!apiKey) return alert("OpenAI APIキーを入力してください");
  if (!title || !source || !date || !body)
    return alert("タイトル・新聞名・日付・本文をすべて入力してください");

  const prompt = `
次の新聞記事から、新スキーマの JSON を生成してください。

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
  "summary": ["要約1", "要約2"],
  "futureTree": "Root → ..."
}

【入力データ】
タイトル: ${title}
新聞: ${source}
日付: ${date}
公開: ${publicFlag}

本文:
${body}
`;

  document.getElementById("jsonOutput").innerText = "生成中…";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: prompt,
      max_output_tokens: 4096
    })
  });

  const data = await response.json();
  console.log("OpenAI Response:", data);

  if (!data.output_text) {
    document.getElementById("jsonOutput").innerText = "生成失敗：API の返答がありません";
    return;
  }

  // JSON 部分だけ抽出
  // JSON 部分だけ抽出
  let aiText = "";
  
  try {
    // /v1/responses の正しい構造
    aiText = data.output[0].content[0].text;
  } catch (e) {
    document.getElementById("jsonOutput").innerText =
      "生成失敗：API レスポンスの形式が想定と違います。\n" +
      JSON.stringify(data, null, 2);
    return;
  }
  
  const cleaned = aiText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  
  document.getElementById("jsonOutput").innerText = cleaned;


// ============================================================
// ② GitHub Upload
// ============================================================

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const ghToken = document.getElementById("ghToken").value.trim();
  const ghUser  = document.getElementById("ghUser").value.trim();
  const ghRepo  = document.getElementById("ghRepo").value.trim();
  const branch  = document.getElementById("ghBranch").value.trim();

  const jsonText = document.getElementById("jsonOutput").innerText.trim();

  if (!ghToken) return alert("GitHub Token を入力してください");
  if (!jsonText.startsWith("{")) return alert("JSON が生成されていません");

  let jsonObj;
  try {
    jsonObj = JSON.parse(jsonText);
  } catch (e) {
    return alert("JSON の形式が不正です");
  }

  const fileName = `${jsonObj.articleId}.json`;
  const path = `data/${fileName}`;

  document.getElementById("uploadResult").innerText = "アップロード中…";

  const uploadResponse = await fetch(
    `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `token ${ghToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add ${fileName}`,
        content: btoa(unescape(encodeURIComponent(jsonText))), // UTF-8安全
        branch: branch
      })
    }
  );

  const resultBox = document.getElementById("uploadResult");

  if (uploadResponse.status === 201 || uploadResponse.status === 200) {
    resultBox.innerText = `アップロード成功！\nファイル名: ${fileName}`;
  } else {
    const err = await uploadResponse.json();
    resultBox.innerText = "アップロード失敗：\n" + JSON.stringify(err, null, 2);
  }
});
