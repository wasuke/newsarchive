// ============================================================
// data_input_ai_script.js（最新版）
// ============================================================

// ------------------------------
// OpenAI による JSON 生成（分類込み）
// ------------------------------

document.getElementById("generateJsonBtn").addEventListener("click", async () => {
  const title = document.getElementById("titleInput").value.trim();
  const source = document.getElementById("sourceInput").value.trim();
  const date = document.getElementById("dateInput").value.trim();
  const body = document.getElementById("bodyInput").value.trim();
  const publicFlag = document.getElementById("publicFlag").value === "true";
  const apiKey = document.getElementById("openaiKey").value.trim();

  if (!apiKey) {
    alert("OpenAI APIキーを入力してください。");
    return;
  }

  document.getElementById("jsonOutput").innerText = "AIに問い合わせ中…";

  const prompt = `
以下のニュース記事を JSON にまとめ、本文を文ごとに fact/prediction/opinion に分類してください。

返答形式は以下の JSON のみ：

{
  "articleId": "一意のID（UNIXミリ秒）",
  "title": "",
  "source": "",
  "date": "",
  "body": "",
  "public": false,
  "classifications": [
    { "sentence": "", "claimType": "fact|prediction|opinion" }
  ]
}

記事タイトル：${title}
新聞名：${source}
日付：${date}
本文：
${body}
  `;

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: prompt
      })
    });

    const data = await res.json();

    // 失敗時
    if (data.error) {
      document.getElementById("jsonOutput").innerText =
        "生成失敗：OpenAI エラー\n" + JSON.stringify(data, null, 2);
      return;
    }

    // 正しい output_text の抽出
    let aiText = extractTextFromResponse(data);

    if (!aiText) {
      document.getElementById("jsonOutput").innerText =
        "生成失敗：JSONを含む出力が取得できません。\n" +
        JSON.stringify(data, null, 2);
      return;
    }

    // コードブロック除去
    const cleaned = aiText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    document.getElementById("jsonOutput").innerText = cleaned;

  } catch (error) {
    document.getElementById("jsonOutput").innerText =
      "生成失敗：通信エラー\n" + error;
  }
});


// ------------------------------------------
// OpenAI Responses API の output_text 抽出
// ------------------------------------------
function extractTextFromResponse(data) {
  try {
    const outputs = data.output || [];
    for (const out of outputs) {
      if (out.type === "message" && out.content) {
        for (const block of out.content) {
          if (block.type === "output_text") {
            return block.text;
          }
        }
      }
    }
  } catch (e) {
    console.error("Response parse error:", e);
  }
  return null;
}



// ============================================================
// GitHub アップロード機能
// ============================================================

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const jsonText = document.getElementById("jsonOutput").innerText.trim();

  if (!jsonText || jsonText === "(未生成)") {
    alert("JSON が生成されていません");
    return;
  }

  let jsonObj = null;
  try {
    jsonObj = JSON.parse(jsonText);
  } catch (e) {
    alert("JSON の形式が不正です");
    return;
  }

  const ghToken = document.getElementById("ghToken").value.trim();
  const ghUser = document.getElementById("ghUser").value.trim();
  const ghRepo = document.getElementById("ghRepo").value.trim();
  const ghBranch = document.getElementById("ghBranch").value.trim();

  if (!ghToken || !ghUser || !ghRepo) {
    alert("GitHub 情報が不足しています");
    return;
  }

  const fileName = `${jsonObj.articleId}.json`;
  const filePath = `data/${fileName}`;

  const uploadUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${filePath}`;

  const uploadBody = {
    message: `Add article ${jsonObj.articleId}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(jsonObj, null, 2)))),
    branch: ghBranch
  };

  document.getElementById("uploadResult").innerText = "GitHub へアップロード中…";

  try {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ghToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(uploadBody)
    });

    const data = await res.json();

    if (data.content && data.commit) {
      document.getElementById("uploadResult").innerText =
        `アップロード成功！ → ${filePath}`;
    } else {
      document.getElementById("uploadResult").innerText =
        "アップロード失敗：\n" + JSON.stringify(data, null, 2);
    }

  } catch (err) {
    document.getElementById("uploadResult").innerText =
      "アップロード中にエラー\n" + err;
  }
});
