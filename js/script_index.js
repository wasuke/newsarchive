// dataフォルダ内のファイル一覧（手動 or 自動生成）
const articleFiles = [
  "20251114_rice_price.json",
  "20251112_election_poll.json",
  "20251110_typhoon.json"
];

// HTML要素
const listEl = document.getElementById("articleList");
const filterTypeEl = document.getElementById("filterType");
const keywordEl = document.getElementById("keywordInput");

let articles = [];

// 初期化：すべてのJSONをロード
async function init() {
  articles = await Promise.all(
    articleFiles.map(async fname => {
      const res = await fetch(`data/${fname}`);
      return await res.json();
    })
  );
  render();
}

// カードを描画
function render() {
  listEl.innerHTML = "";
  
  const keyword = keywordEl.value.trim();
  const typeFilter = filterTypeEl.value;

  articles.forEach(article => {

    const matchKeyword =
      !keyword ||
      article.title.includes(keyword) ||
      (article.summary && article.summary.includes(keyword));

    const matchType =
      typeFilter === "all" ||
      article.articleType === typeFilter;

    if (!matchKeyword || !matchType) return;

    const card = document.createElement("div");
    card.className = `article-card ${article.articleType}`;
    card.addEventListener("click", () => openArticle(article.id));

    card.innerHTML = `
      <div class="title">${article.title}</div>
      <div class="meta">${article.source}｜${article.publishedAt}</div>
      <div class="summary">${article.summary || ""}</div>
    `;

    listEl.appendChild(card);
  });
}

// 個別記事ページへ遷移
function openArticle(id) {
  location.href = `article.html?id=${id}`;
}

keywordEl.addEventListener("input", render);
filterTypeEl.addEventListener("change", render);

init();