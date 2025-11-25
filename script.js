//---------------------------------------------
// 文分類＋JSON生成（OpenAI API）
//---------------------------------------------
document.getElementById("generateJsonBtn").addEventListener("click", async () => {
  const title = document.getElementById("titleInput").value.trim();
  const source = document.getElementById("sourceInput").value.trim();
  const date = document.getElementById("dateInput").value.trim();
  const body = document.getElementById("bodyInput").value.trim();
  const isPublic = document.getElementById("publicFlag").value;
  const openaiKey = document.getElementById("openaiKey").value;

  if (!title || !source || !date || !body) {
    alert("記事データが不足しています。");
    return;
  }
  if (!openaiKey) {
    alert("OpenAI APIキーが必要です。");
    return;
  }

  const sentences = body
    .split(/(?<=[。！？\?])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const classifications = [];

  for (const sentence of sentences) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "文を fact, prediction, opinion のいずれかで分類してください。"
          },
          {
            role: "user",
            content: sentence
          }
        ]
      })
    }).then(r => r.json());

    let cls = "fact";
    try {
      cls = res.choices[0].message.content.trim().toLowerCase();
    } catch (_) {}

    classifications.push({
      sentence: sentence,
      claimType: cls
    });
  }

  const articleId = `${Date.now()}`;
  const metadata = {
    articleId: articleId,
    title: title,
    source: source,
    date: date,
    body: body,
    public: isPublic === "true",
    classifications: classifications
  };

  window.generatedJson = JSON.stringify(metadata, null, 2);
  document.getElementById("jsonOutput").textContent = window.generatedJson;
});

//---------------------------------------------
// GitHub ファイルアップロード
//---------------------------------------------
document.getElementById("uploadBtn").addEventListener("click", async () => {

  if (!window.generatedJson) {
    alert("先に JSON を生成してください。");
    return;
  }

  const token = document.getElementById("ghToken").value;
  const user = document.getElementById("ghUser").value;
  const repo = document.getElementById("ghRepo").value;
  const branch = document.getElementById("ghBranch").value;

  if (!token) {
    alert("GitHub Token が必要です。");
    return;
  }

  const filename = `data/${JSON.parse(window.generatedJson).articleId}.json`;
  const contentBase64 = btoa(unescape(encodeURIComponent(window.generatedJson)));

  const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${filename}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Add new article JSON",
      content: contentBase64,
      branch: branch
    })
  });

  const result = await res.json();
  document.getElementById("uploadResult").textContent =
    JSON.stringify(result, null, 2);
});

//------------------------------------------------------------
// ページごとの処理を自動振り分け
//------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.endsWith("index.html") || path.endsWith("/")) {
    loadIndexPage();
  } else if (path.endsWith("article_viewer.html")) {
    loadArticleViewerPage();
  }
});

//------------------------------------------------------------
// INDEX PAGE：記事一覧を読み込む
//------------------------------------------------------------
async function loadIndexPage() {
  const listDiv = document.getElementById("newsList");

  try {
    const res = await fetch("data/list.json");
    const list = await res.json();

    // 公開フラグが true の記事だけ表示
    const publicArticles = list.filter(a => a.public !== false);

    if (publicArticles.length === 0) {
      listDiv.innerHTML = "<p>公開記事がありません。</p>";
      return;
    }

    const html = publicArticles.map(item => `
      <div class="news-item">
        <a href="article_viewer.html?id=${item.id}">
          <strong>${item.title}</strong><br>
          <span>${item.date}｜${item.source}</span>
        </a>
      </div>
    `).join("");

    listDiv.innerHTML = html;

  } catch (err) {
    listDiv.innerHTML = "<p>一覧を読み込めませんでした。</p>";
    console.error(err);
  }
}

//------------------------------------------------------------
// ARTICLE VIEWER：JSON を読み込み表示
//------------------------------------------------------------
async function loadArticleViewerPage() {
  const container = document.getElementById("articleContainer");
  const id = new URLSearchParams(location.search).get("id");

  if (!id) {
    container.innerHTML = "<p>記事IDが指定されていません。</p>";
    return;
  }

  try {
    const res = await fetch(`data/${id}.json`);
    const article = await res.json();

    const sentencesHTML = article.classifications
      .map(c => `
        <div class="sentence-block type-${c.claimType}">
          <span class="sentence">${c.sentence}</span>
          <span class="label">${c.claimType}</span>
        </div>
      `)
      .join("");

    container.innerHTML = `
      <h2>${article.title}</h2>
      <p>${article.date}｜${article.source}</p>
      <hr>
      <h3>本文（文＋分類）</h3>
      ${sentencesHTML}
      <hr>
      <h3>本文テキスト（研究用）</h3>
      <pre>${article.body}</pre>
    `;

  } catch (err) {
    container.innerHTML = "<p>記事JSONを読み込めませんでした。</p>";
    console.error(err);
  }
}
