// ============================================================
//  ニュース記事 → JSON生成（OpenAI Responses API）
//  ＋ GitHub アップロード
// ============================================================

// ------------------------------------------------------------
// Utility：OpenAI の Responses API から output_text を抽出
// ------------------------------------------------------------
function extractTextFromResponse(data) {
  try {
    const outputs = data.output || [];
    for (const out of outputs) {
      if (out.type === "message" && Array.isArray(out.content)) {
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
//  ① JSON生成（AI分類）
// ============================================================
document.getElementById("generateJsonBtn").addEventListener("click", async () => {
  const title = document.getElementById("titleInput").value.trim();
  const source = document.getElementById("sourceInput").value.trim();
  const date = document.getElementById("dateInput").value.trim();
  const body = document.getElementById("bodyInput").value.trim();
  const publicFlag = document.getElementById("publicFlag").value;
  const apiKey = document.getElementById("openaiKey").value.trim();

  if (!title || !source || !date || !body) {
    alert("タイトル・新聞名・日付・本文を入力してください。");
    return;
  }

  if (!apiKey) {
    alert("OpenAI APIキーを入力してください。");
    return;
  }

  document.getElementById("jsonOutput").innerText = "生成中…";


  // ---- OpenAI API 呼び出し ----
  const prompt = `
以下のニュース記事を JSON 構造に変換してください。

=== 入力記事 ===
タイトル: ${title}
新聞名: ${source}
日付: ${date}
本文:
${body}

=== JSON仕様 ===
{
  "articleId": "ランダムな数字文字列",
  "title": "",
  "source": "",
  "date": "",
  "body": "",
  "public": false,
  "classifications": [
    {
      "sentence": "文",
      "claimType": "fact | prediction | opinion"
    }
  ],
  "summary": "記事全体の要約を 1 段落で",
  "futureTree": "予測文がある場合、その後の可能性の分岐をテキストで"
}

文ごとに分類（fact / prediction / opinion）を必ず行い、JSONのみ出力してください。
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
        reasoning: { effort: "medium" },
        input: prompt
      })
    });

    const data = await res.json();
    console.log("OpenAI Response:", data);

    // ---- 正しく output_text を抽出 ----
    const rawText = extractTextFromResponse(data);

    if (!rawText) {
      document.getElementById("jsonOutput").innerText =
        "生成失敗：JSONを含む出力が取得できません。\n" +
        JSON.stringify(data, null, 2);
      return;
    }

    // コードブロック除去
    const cleaned = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    document.getElementById("jsonOutput").innerText = cleaned;

  } catch (err) {
    document.getElementById("jsonOutput").innerText =
      "生成失敗（ネットワークまたはAPIエラー）\n" + err;
  }
});



// ============================================================
// ② GitHub アップロード
// ============================================================
document.getElementById("uploadBtn").addEventListener("click", async () => {
  const jsonStr = document.getElementById("jsonOutput").innerText;

  if (!jsonStr || jsonStr === "(未生成)") {
    alert("先に JSON を生成してください。");
    return;
  }

  let jsonObj;
  try {
    jsonObj = JSON.parse(jsonStr);
  } catch (e) {
    alert("JSON が正しくありません。再生成してください。");
    return;
  }

  // 保存ファイル名
  const articleId = jsonObj.articleId || Date.now().toString();
  const filePath = `data/${articleId}.json`;

  const ghUser = document.getElementById("ghUser").value.trim();
  const ghRepo = document.getElementById("ghRepo").value.trim();
  const ghBranch = document.getElementById("ghBranch").value.trim();
  const ghToken = document.getElementById("ghToken").value.trim();

  if (!ghToken) {
    alert("GitHub Token を入力してください。");
    return;
  }

  document.getElementById("uploadResult").innerText = "アップロード中…";


  try {
    // GitHub API: PUT /repos/{owner}/{repo}/contents/{path}
    const url = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${filePath}`;

    const uploadRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ghToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add ${articleId}.json`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(jsonObj, null, 2)))),
        branch: ghBranch,
      }),
    });

    const result = await uploadRes.json();
    console.log("GitHub Upload:", result);

    document.getElementById("uploadResult").innerText =
      "アップロード完了！\n" + JSON.stringify(result, null, 2);

  } catch (err) {
    document.getElementById("uploadResult").innerText =
      "アップロード失敗：\n" + err;
  }
});
