文字数を表示させる。
各Typeで検索する機能を持たせる（後で）
エクセルファイルで出力。KHコーダーフォーマットで出力するといい。
AIが判断した日付＋AIのメタデータが欲しい

2025/11/26
■ ニュースアーカイブ JSON スキーマ（正式版）

◆ ルート構造

{
  "articleId": string,          // 一意のID（通常はUNIXタイムミリ秒）
  "title": string,              // 記事タイトル
  "source": string,             // 媒体名（新聞社・ニュースサイト）
  "date": "YYYY-MM-DD",         // 公開日
  "public": boolean,            // 非公開/公開フラグ（デフォルト false）

  "text": string,               // 記事全文（段落改行を含む）

  "sentences": [ Sentence ],    // 文単位の分類メタデータ

  "summary": [ string ],        // 要約の箇条書き

  "futureTree": string          // 予測文の依存構造（テキスト形式）
}


⸻

◆ Sentence オブジェクトの構造

Sentence {
  "id": string,                 // 文ID（s1, s2, ...）
  "text": string,               // 文そのもの
  "type": "fact" | "prediction" | "opinion" | "quote",
  "confidence": number,         // 0〜1 の信頼度
  "predictionId": string | null // 予測文のID（p1, p2...）。fact/opinion/quote は null
}


⸻

◆ summary の構造

summary: [
  "要点１ …",
  "要点２ …",
  "（予測の整理がある場合はそれも含める）"
]


⸻

◆ futureTree の構造

AI が生成する「未来予測の構造化テキスト」。
現状は text 形式のみ を正式仕様とする。

例：

"futureTree": "Root: 政策検討状況
 └─ 事実のみ（予測文なし）
    └─ この政策に関する続報が将来追加された場合リンクが生成される"

または予測文がある場合：

"futureTree": "Root → p1 → p3
  p1: 価格予測（未確定）
  p3: 市場動向の時期予測（2026年夏）"


⸻

■ この JSON スキーマの特徴

・text が「記事全文」の正本
・sentences[] が「AI による文分類」
・summary[] が「方向性・要約」
・futureTree が「予測の構造」
・predictionId により futureTree と sentences がリンク

2025/11/26

ニュースアーカイブ・メタデータスキーマ（読みやすい説明版）

現在のプロトタイプが採用しているスキーマは、
「ニュース本文を研究用に安全に保存しながら、50年後でも文脈依存しない検索・検証ができる」
ことを目的に設計してあります。

中心となる特徴は次の3点です。
	1.	記事全体のメタデータ（タイトル・媒体・公開可否など）
	2.	文単位の意味分類（fact / prediction / opinion / quote）
	3.	予測内容の抽出と、将来の“答え”とつなぐための Future Tree

以下、それぞれの要素を短く整理します。

⸻

■ 1. 記事全体の基本情報

記事そのものに関する情報です。
	•	articleId
アップロード時に生成されるユニークID（UNIXミリ秒）。
データの主キーとして利用します。
	•	title / source / date
記事のタイトル、新聞社、公開日付。
これらは「入力された値をそのまま保存」します。
	•	public
記事全文を公開してよいかどうかのフラグ。
デフォルトは false。
研究目的の内部アーカイブ利用を前提としています。
	•	text
記事全文をそのまま保存します。
公開フラグによって外部 UI では非表示化されます。

⸻

■ 2. 文単位の分類情報（sentences）

本文から文を分割し、それぞれを AI が分類します。

各文には次の項目があります。
	•	id
“s1”“s2”のような連番。
	•	text
文そのもの。
	•	type（4種類）
	•	fact
客観的事実、出来事、数値、公式発表など
	•	prediction
未来の見通し、予測、懸念、期待
	•	opinion
記者・論者の評価、解説、主観的態度
	•	quote
誰かの発言そのもの（引用・証言・コメント）
	•	confidence
0.0〜1.0 の AI 推定信頼度
	•	predictionId
prediction の文にだけ付くID（例: “p1”）。
Future Tree をつなぐときのキーになる。

⸻

■ 3. 要約（summary）

記事全体の方向性と予測を、人間が読んでも理解しやすいよう整理します。

summary.keyPoints

記事の重要点を 3〜5 文で記述した要約。
50年後の読者でも理解しやすいよう、固有名詞を入れて書かれます。

summary.predictions

記事の中から抽出した「未来予測」を 1つずつ構造化したもの。
	•	predictionId
	•	sentence（短い正規化文）
	•	category（政治・国際・経済など）
	•	strength（予測の強さ 0〜1）

この部分は、将来「続報検索」や「予測の的中率分析」に活きます。

⸻

■ 4. FutureTree（予測と続報をつなぐ仕組み）

予測文ごとにノードを持ち、将来“答えとなる記事”が見つかったときに接続できる構造です。

futureTree.nodes

予測文ごとに 1 ノード。
	•	predictionId
	•	sentence（予測そのものの文）
	•	status（初期値は “pending”）
	•	answers（将来リンクが追加される配列）

futureTree.treeText

ツリー構造の簡易テキスト版（例: “Root → p1 → p2”）。
システムの UI 側で視覚化するための補助表現です。

⸻

■ スキーマ 全体像（文章まとめ）

本スキーマは、ニュース記事の長期的アーカイブにおいて「予測を含む記事の将来検証」を可能にするためのものです。
記事本文を文単位で構造化し、それぞれを fact / prediction / opinion / quote の4分類に分けた上で、予測だけに ID を付与し、将来の答えとなる記事を追加できる枠組みを備えています。
summary と futureTree によって、記事の方向性と予測構造を可視化し、50年後であってもニュースの文脈を失わずに分析できるよう設計されています。
