// URL ?id=xxxxx に対応
async function loadArticle() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) {
    document.body.innerHTML = "<h2>記事IDが指定されていません</h2>";
    return;
  }

  // JSON ファイル名を決定
  const file = `./data/${id}.json`;

  const res = await fetch(file);
  const json = await res.json();

  window.currentArticle = json;

  renderArticle(json);
  renderClaims(json.claims);
  renderPredictions(json.predictions);
  renderFutureTree(json.futureTree);
  renderDirectionSummary(json);
}

// ---------------------------
// 元記事欄（左）
// ---------------------------
function renderArticle(article) {
  document.getElementById("articleTitle").textContent = article.title;
  document.getElementById("articleSource").textContent = article.source;
  document.getElementById("articleDate").textContent = article.publishedAt;

  const articleTextEl = document.getElementById("articleText");
  articleTextEl.innerHTML = "";

  // 今回は全文を claims の text から再構成
  article.claims.forEach((c, index) => {
    const p = document.createElement("p");
    p.textContent = c.text;
    p.className = "article-sentence";
    p.dataset.index = index;
    articleTextEl.appendChild(p);
  });
}

// ---------------------------
// 中央：文メタデータ
// ---------------------------
function renderClaims(claims) {
  const container = document.getElementById("claimsList");
  container.innerHTML = "";

  claims.forEach((c, index) => {
    const card = document.createElement("div");
    card.className = `claim-card claim-${c.type}`;

    card.innerHTML = `
      <div class="claim-index">文${index + 1}</div>
      <div class="claim-type">[${c.type}]</div>
      <div class="claim-text">${c.text}</div>
    `;

    container.appendChild(card);
  });
}

// ---------------------------
// 右：予測リスト
// ---------------------------
function renderPredictions(predictions) {
  const container = document.getElementById("predictionsList");
  container.innerHTML = "";

  if (!predictions || predictions.length === 0) {
    container.textContent = "（予測なし）";
    return;
  }

  predictions.forEach(p => {
    const box = document.createElement("div");
    box.className = "prediction-node";
    box.innerHTML = `
      <div><b>${p.text}</b></div>
      <div>信頼度：${p.confidence}</div>
      <div>対象：${p.target}</div>
      <div>結果：${p.outcome}</div>
    `;
    container.appendChild(box);
  });
}

// ---------------------------
// Future Tree
// ---------------------------
function renderFutureTree(treeText) {
  const el = document.getElementById("futureTreeText");
  el.textContent = treeText || "（なし）";
}

// ---------------------------
// 全体の方向性（軽い要約）
// ---------------------------
function renderDirectionSummary(article) {
  const ul = document.getElementById("directionSummary");
  ul.innerHTML = "";

  const li = document.createElement("li");
  li.textContent = article.summary;
  ul.appendChild(li);
}

// ---------------------------
// フィルタ（キーワード & タイプ）
// ---------------------------
document.getElementById("keywordInput").addEventListener("input", applyFilters);
document.getElementById("claimTypeFilter").addEventListener("change", applyFilters);

function applyFilters() {
  const keyword = document.getElementById("keywordInput").value.trim();
  const type = document.getElementById("claimTypeFilter").value;

  const claims = window.currentArticle.claims;

  const container = document.getElementById("claimsList");
  container.innerHTML = "";

  claims.forEach((c, index) => {
    if (type !== "all" && c.type !== type) return;
    if (keyword && !c.text.includes(keyword)) return;

    const card = document.createElement("div");
    card.className = `claim-card claim-${c.type}`;
    card.innerHTML = `
      <div class="claim-index">文${index + 1}</div>
      <div class="claim-type">[${c.type}]</div>
      <div class="claim-text">${c.text}</div>
    `;
    container.appendChild(card);
  });
}

// ---------------------------
loadArticle();
