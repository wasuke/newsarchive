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
