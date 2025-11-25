// ============================================================
//   設定：常時管理者モード
// ============================================================

const ADMIN_MODE = true;

// ============================================================
//   DOM 読み込み時
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("articlesList")) {
    loadArticleList();
  }

  if (document.getElementById("articleText")) {
    loadArticleForViewer();
  }
});

// ============================================================
//   記事一覧の読み込み
// ============================================================

async function loadArticleList() {
  try {
    const response = await fetch("./data/list.json");

    if (!response.ok) {
      console.error("list.json 読み込みエラー:", response.status);
      return;
    }

    const list = await response.json();
    renderArticleList(list);

  } catch (e) {
    console.error("list.json エラー:", e);
  }
}

// ============================================================
//   記事一覧の描画
// ============================================================

function renderArticleList(list) {
  const container = document.getElementById("articlesList");
  container.innerHTML = "";

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "article-card";

    card.innerHTML = `
      <h3>
        <a href="article_viewer.html?file=${encodeURIComponent(item.file)}">
          ${item.title}
        </a>
      </h3>
      <p class="meta">
        ${item.source || ""}｜${item.date || ""}
        ${item.public === false ? `<span class="badge-private">非公開</span>` : ""}
      </p>
    `;

    container.appendChild(card);
  });
}

// ============================================================
//   記事詳細の読み込み
// ============================================================

async function loadArticleForViewer() {
  const params = new URLSearchParams(window.location.search);
  const file = params.get("file");

  if (!file) {
    document.getElementById("articleText").innerText = "ファイル指定なし";
    return;
  }

  try {
    const response = await fetch("./" + file);

    if (!response.ok) {
      document.getElementById("articleText").innerText = "読み込み失敗：" + file;
      return;
    }

    const article = await response.json();
    renderArticleViewer(article);

  } catch (e) {
    document.getElementById("articleText").innerText = "エラー：" + e;
  }
}

// ============================================================
//   記事ビュー UI の描画
// ============================================================

function renderArticleViewer(article) {

  // タイトル・メタデータ
  document.getElementById("articleTitle").innerText = article.title;
  document.getElementById("articleSource").innerText = article.source;
  document.getElementById("articleDate").innerText = article.date;

  // 元記事本文
  const articleTextDiv = document.getElementById("articleText");
  articleTextDiv.innerHTML = "";

  const sentencesRaw = article.text
    ? article.text.split(/(?<=[。！？\?])/g)
    : [];

  sentencesRaw.forEach(s => {
    const p = document.createElement("p");
    p.innerText = s.trim();
    articleTextDiv.appendChild(p);
  });

  // 文メタデータ
  const claims = document.getElementById("claimsList");
  claims.innerHTML = "";

  if (article.sentences && Array.isArray(article.sentences)) {
    article.sentences.forEach((s, i) => {
      const card = document.createElement("div");
      card.className = "claim-card";

      card.innerHTML = `
        <div><strong>${i+1}.</strong> ${s.text}</div>
        <div>分類：<span class="claim-type ${s.type}">${s.type}</span></div>
        <div>信頼度：${s.confidence ?? "N/A"}</div>
      `;

      claims.appendChild(card);
    });
  }

  // 方向性要約
  const summary = article.summary || [];
  const dir = document.getElementById("directionSummary");
  dir.innerHTML = "";

  summary.forEach(item => {
    const li = document.createElement("li");
    li.innerText = item;
    dir.appendChild(li);
  });

  // FutureTree
  document.getElementById("futureTreeText").innerText =
    article.futureTree || "No Future Tree.";
}
