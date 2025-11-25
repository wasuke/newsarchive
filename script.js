// ============================================================
//   常時管理者モード（全記事を表示）
// ============================================================

const ADMIN_MODE = true;


// ============================================================
//   記事一覧ページ処理
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("articlesList");

  if (listContainer) {
    loadArticleList();
  }

  const viewerContainer = document.getElementById("articleText");
  if (viewerContainer) {
    loadArticleForViewer();
  }
});


// ============================================================
//   記事一覧の読み込み
// ============================================================

async function loadArticleList() {
  try {
    console.log("Fetching list.json...");
    const response = await fetch("./data/list.json");

    if (!response.ok) {
      console.error("list.json を取得できませんでした:", response.status);
      return;
    }

    const list = await response.json();
    console.log("list.json:", list);

    renderArticleList(list);
  } catch (error) {
    console.error("list.json 読み込みエラー:", error);
  }
}


// ============================================================
//   記事一覧の描画
// ============================================================

function renderArticleList(list) {
  const container = document.getElementById("articlesList");
  container.innerHTML = "";

  const visibleArticles = list;

  visibleArticles.forEach(item => {
    const card = document.createElement("div");
    card.className = "article-card";

    card.innerHTML = `
      <h3>
        <a href="article_viewer.html?file=${encodeURIComponent(item.file)}">
          ${item.title}
        </a>
      </h3>
      <p class="meta">
        ${item.source || "（媒体不明）"}
        ${item.date ? "｜" + item.date : ""}
        ${item.public === false ? `<span class="badge-private">非公開</span>` : ""}
      </p>
    `;

    container.appendChild(card);
  });
}


// ============================================================
//   記事ビューアの読み込み
// ============================================================

async function loadArticleForViewer() {
  const params = new URLSearchParams(window.location.search);
  const file = params.get("file");

  if (!file) {
    document.getElementById("articleText").innerText = "ファイルが指定されていません";
    return;
  }

  try {
    console.log("Loading article:", file);

    const response = await fetch("./" + file);

    if (!response.ok) {
      document.getElementById("articleText").innerText =
        "記事 JSON を読み込めませんでした：" + file;
      return;
    }

    const article = await response.json();
    renderArticleViewer(article);

  } catch (err) {
    document.getElementById("articleText").innerText =
      "エラーが発生しました：" + err;
  }
}


// ============================================================
//   記事ビューア UI の描画
// ============================================================

function renderArticleViewer(article) {
  document.getElementById("articleTitle").innerText = article.title;
  document.getElementById("articleSource").innerText = article.source;
  document.getElementById("articleDate").innerText = article.date;

  const articleTextDiv = document.getElementById("articleText");
  articleTextDiv.innerHTML = "";

  const sentences = article.text ? article.text.split(/(?<=[。！？\?])/g) : [];

  sentences.forEach((sentence, idx) => {
    const p = document.createElement("p");
    p.innerText = sentence.trim();
    articleTextDiv.appendChild(p);
  });

  const claimsContainer = document.getElementById("claimsList");
  claimsContainer.innerHTML = "";

  if (article.sentences && Array.isArray(article.sentences)) {
    article.sentences.forEach((s, idx) => {
      const card = document.createElement("div");
      card.className = "claim-card";

      card.innerHTML = `
        <div><strong>${idx + 1}.</strong> ${s.text}</div>
        <div>分類：<span class="claim-type ${s.type}">${s.type}</span></div>
        <div>信頼度：${s.confidence || "N/A"}</div>
      `;

      claimsContainer.appendChild(card);
    });
  }

  const direction = document.getElementById("directionSummary");
  direction.innerHTML = "";

  const summary = article.summary || ["方向性のデータなし"];
  summary.forEach(item => {
    const li = document.createElement("li");
    li.innerText = item;
    direction.appendChild(li);
  });

  const futureTree = document.getElementById("futureTreeText");
  futureTree.innerText = article.futureTree || "No Future Tree.";
}
