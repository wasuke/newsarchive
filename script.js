// 簡易データ（今回の新潟日報の記事ベース）
const articleData = {
  id: "article:niigata-20251114",
  title: "「投げ売りも出てくるのでは」新米在庫だぶつき、JAや集荷業者から懸念の声…米価下落の見通し強まる",
  source: "新潟日報",
  publishedAt: "2025-11-14T10:00:00+09:00",
  // 表示用の文配列（実運用だと自動分割）
  claims: [
    {
      id: "claim:1",
      text: "コメ価格下落の見通しが強まっている。",
      type: "fact",
      certainty: "medium",
      timeScope: "future",
      predictionRef: null
    },
    {
      id: "claim:2",
      text: "2025年産米の収穫量が増え、需給が緩むとの予測が業者の間に広まる。",
      type: "prediction",
      certainty: "high",
      timeScope: "future",
      predictionRef: "pred:1"
    },
    {
      id: "claim:3",
      text: "仮渡し金が最高額となる中、高値で集荷した県内JA系統や民間業者からは懸念の声が聞かれる。",
      type: "fact",
      certainty: "high",
      timeScope: "present",
      predictionRef: null
    },
    {
      id: "claim:4",
      text: "中小の集荷業者の中には、資金繰りを見通しコメを投げ売りする損切りの動きが出るとの見方もある。",
      type: "prediction",
      certainty: "medium",
      timeScope: "future",
      predictionRef: "pred:2"
    },
    {
      id: "claim:5",
      text: "国産米の高騰で、民間輸入の外国産米を入れる実需が多く新米の在庫がだぶついていると推察。",
      type: "prediction",
      certainty: "medium",
      timeScope: "present",
      predictionRef: "pred:3"
    },
    {
      id: "claim:6",
      text: "24年産で過去最低水準に落ち込んだ新潟県JA系統の集荷率は、25年産も大きく回復しないとの見方が大勢だ。",
      type: "prediction",
      certainty: "high",
      timeScope: "future",
      predictionRef: "pred:5"
    },
    {
      id: "claim:7",
      text: "短期融資の支払期限はだいたい年末で、これから投げ売りも出てくるのではないかと推察する。",
      type: "prediction",
      certainty: "low",
      timeScope: "future",
      predictionRef: "pred:2"
    },
    {
      id: "claim:8",
      text: "昨年はコメ不足の影響で秋に需要の先食いが起こり、新米が収穫早々売れていった。",
      type: "fact",
      certainty: "high",
      timeScope: "past",
      predictionRef: null
    },
    {
      id: "claim:9",
      text: "ことしの新米もこうした動きに戻るとの見方もあるが、新米の価格が高すぎるため、24年産や輸入米を買い、25年産が下がるまで待とうとする消費者の動きが顕著だと担当者は話す。",
      type: "prediction",
      certainty: "medium",
      timeScope: "future",
      predictionRef: "pred:6"
    },
    {
      id: "claim:10",
      text: "インバウンド需要の上振れや災害などで今後需給が引き締まる可能性もあり、市場の動向を注視する。",
      type: "prediction",
      certainty: "low",
      timeScope: "future",
      predictionRef: "pred:8"
    }
  ],
  predictions: [
    {
      id: "pred:1",
      text: "25年産で収穫量が増え、需給が緩む",
      confidence: "high",
      target: "需給緩和・米価下落方向",
      outcome: "unknown"
    },
    {
      id: "pred:2",
      text: "中小業者の投げ売り（損切り）が発生する",
      confidence: "medium",
      target: "投げ売り・価格急落リスク",
      outcome: "unknown"
    },
    {
      id: "pred:3",
      text: "新米在庫がだぶつく状態が続く",
      confidence: "medium",
      target: "在庫過多・倉庫圧迫",
      outcome: "unknown"
    },
    {
      id: "pred:5",
      text: "25年産もJA系統の集荷率は大きく回復しない",
      confidence: "high",
      target: "JA系統のシェア低下継続",
      outcome: "unknown"
    },
    {
      id: "pred:6",
      text: "市場は通常の動きに戻る可能性があるが、当面は24年産や輸入米へのシフトが続く",
      confidence: "medium",
      target: "消費者の様子見・安価志向",
      outcome: "unknown"
    },
    {
      id: "pred:8",
      text: "インバウンドや災害次第で需給が引き締まる可能性もある",
      confidence: "low",
      target: "需給逼迫・価格再上昇リスク",
      outcome: "unknown"
    }
  ]
};

// ユーティリティ
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function claimTypeLabel(t) {
  if (t === "fact") return "事実";
  if (t === "prediction") return "予測";
  if (t === "opinion") return "意見・分析";
  return t;
}

// DOM要素参照
const articleTitleEl = document.getElementById("articleTitle");
const articleDateEl = document.getElementById("articleDate");
const articleTextEl = document.getElementById("articleText");
const claimsListEl = document.getElementById("claimsList");
const predictionsListEl = document.getElementById("predictionsList");
const futureTreeTextEl = document.getElementById("futureTreeText");
const directionSummaryEl = document.getElementById("directionSummary");
const keywordInputEl = document.getElementById("keywordInput");
const claimTypeFilterEl = document.getElementById("claimTypeFilter");

let currentFilter = {
  keyword: "",
  type: "all"
};

// 初期描画
function init() {
  articleTitleEl.textContent = articleData.title;
  articleDateEl.textContent = formatDate(articleData.publishedAt);

  renderArticleSentences();
  renderClaimCards();
  renderPredictions();
  renderDirectionSummary();
  renderFutureTree();
  bindSearch();
}

function renderArticleSentences() {
  articleTextEl.innerHTML = "";
  articleData.claims.forEach((claim, idx) => {
    const span = document.createElement("span");
    span.className = `sentence-chip ${claim.type}`;
    span.dataset.claimId = claim.id;
    span.textContent = claim.text;
    span.addEventListener("click", () => onSentenceClick(claim.id));
    articleTextEl.appendChild(span);
    // 文末にスペースを入れて自然に
    articleTextEl.append(" ");
    if (idx === 0 || idx === 2 || idx === 4 || idx === 7) {
      // 段落っぽく改行を挟む
      articleTextEl.appendChild(document.createElement("br"));
      articleTextEl.appendChild(document.createElement("br"));
    }
  });
}

function renderClaimCards() {
  claimsListEl.innerHTML = "";
  const { keyword, type } = currentFilter;

  articleData.claims.forEach((claim, idx) => {
    const text = claim.text;
    const matchesKeyword =
      !keyword ||
      text.includes(keyword) ||
      (claimTypeLabel(claim.type).includes(keyword));

    const matchesType =
      type === "all" || claim.type === type;

    if (!matchesKeyword || !matchesType) return;

    const card = document.createElement("div");
    card.className = "claim-card";
    card.dataset.claimId = claim.id;
    card.addEventListener("click", () => onSentenceClick(claim.id));

    const header = document.createElement("div");
    header.className = "claim-card-header";

    const idSpan = document.createElement("span");
    idSpan.className = "claim-id";
    idSpan.textContent = `文 ${idx + 1}`;

    const badge = document.createElement("span");
    badge.className = `claim-type-badge ${claim.type}`;
    badge.textContent = claimTypeLabel(claim.type);

    header.appendChild(idSpan);
    header.appendChild(badge);

    const bodyText = document.createElement("p");
    bodyText.className = "claim-text";
    bodyText.textContent = claim.text;

    const meta = document.createElement("div");
    meta.className = "claim-meta";

    const cSpan = document.createElement("span");
    cSpan.textContent = `確度:${claim.certainty}`;
    meta.appendChild(cSpan);

    const tSpan = document.createElement("span");
    tSpan.textContent = `時間スコープ:${claim.timeScope}`;
    meta.appendChild(tSpan);

    if (claim.type === "prediction" && claim.predictionRef) {
      const pSpan = document.createElement("span");
      const pred = articleData.predictions.find(p => p.id === claim.predictionRef);
      pSpan.textContent = pred ? `予測ターゲット:${pred.target}` : "予測ターゲット:不明";
      meta.appendChild(pSpan);
    }

    card.appendChild(header);
    card.appendChild(bodyText);
    card.appendChild(meta);

    claimsListEl.appendChild(card);
  });
}

function renderPredictions() {
  predictionsListEl.innerHTML = "";
  articleData.predictions.forEach(pred => {
    const pill = document.createElement("div");
    pill.className = "prediction-pill";
    pill.innerHTML = `
      <span class="label">予測:</span> ${pred.text}<br>
      <span class="label">ターゲット:</span> ${pred.target}<br>
      <span class="label">確度:</span> ${pred.confidence}・結果:${pred.outcome}
    `;
    predictionsListEl.appendChild(pill);
  });
}

function renderDirectionSummary() {
  directionSummaryEl.innerHTML = "";
  const items = [
    "・全体として「25年産の需給緩和→米価下落」の見通しが強い",
    "・中小業者の投げ売りによる急激な価格下落リスクが示唆されている",
    "・消費者は「24年産・輸入米に流れ、25年産が下がるのを待つ」動きが描かれている",
    "・一方で、インバウンドや災害次第で需給が再び引き締まる可能性も同時に提示されている"
  ];
  items.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    directionSummaryEl.appendChild(li);
  });
}

function renderFutureTree() {
  const treeText = `
  2025年 以降のシナリオ（簡易）

  25年産 収穫量増
        |
        +--> 需給緩む (pred:1)
        |       |
        |       +--> 米価下落方向
        |       |       |
        |       |       +--> 中小業者の投げ売りリスク (pred:2)
        |
        +--> 在庫だぶつき継続 (pred:3)
        |
        +--> JA系統の集荷率 低迷継続 (pred:5)

  消費者行動 (pred:6)
        |
        +--> 24年産・輸入米を選好
        +--> 25年産の値下がり待ち

  逆方向シナリオ (pred:8)
        |
        +--> インバウンド・災害 等
                 |
                 +--> 需給引き締まり・価格再上昇 可能性
  `;
  futureTreeTextEl.textContent = treeText;
}

// クリックで左右ハイライト
function onSentenceClick(claimId) {
  // 左の文ハイライト
  document.querySelectorAll(".sentence-chip").forEach(el => {
    el.classList.toggle("highlight", el.dataset.claimId === claimId);
  });
  // 中央カードのハイライト（視覚的に強調したければ追加）
  document.querySelectorAll(".claim-card").forEach(card => {
    card.style.outline = (card.dataset.claimId === claimId) ? "2px solid #1e88e5" : "none";
    card.style.backgroundColor = (card.dataset.claimId === claimId) ? "#e3f2fd" : "#fff";
  });
}

// 検索・フィルタのバインド
function bindSearch() {
  keywordInputEl.addEventListener("input", () => {
    currentFilter.keyword = keywordInputEl.value.trim();
    renderClaimCards();
  });

  claimTypeFilterEl.addEventListener("change", () => {
    currentFilter.type = claimTypeFilterEl.value;
    renderClaimCards();
  });
}

document.addEventListener("DOMContentLoaded", init);