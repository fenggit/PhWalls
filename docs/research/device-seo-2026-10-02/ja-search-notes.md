# 日本語の壁紙SEO調査（2026-10-02）

本調査は995コレクションの日本語コピー作成に使う表現の調査です。Bingは実在する一般語・端末名でも「結果がありません」の空ページ、Googleはリダイレクト用シェル、DuckDuckGoは認証チャレンジを返しました。検索順位・検索数・難易度・検索ユーザーの割合は測定できていません。空ページを「需要なし」の根拠にしていません。日本語メディアの公開サイト内検索29件と、直接取得できた日本語記事・公式資料11件を根拠としています。詳細なURL・クエリ・短い抜粋・取得エラーは `ja-search-research.json` に記録しています。

## 日本語として自然な方向性

- メインの組み合わせは正確なモデル名＋「壁紙」。Pixel、Xperia、Galaxy、Fold/Flipなどを英字で残す実例を確認しました。ローマ字製品名のまわりを日本語の助詞・文で構成します。
- ダウンロードページは「壁紙をダウンロード」「壁紙N枚を掲載」。実際に無料なら「無料ダウンロード」を使えます。「無料」は著作権フリー・商用利用自由を意味しません。
- スマートフォンは「ホーム画面」「ロック画面」、デスクトップは「デスクトップ壁紙」「デスクトップ背景」、タブレットは「タブレット用」が具体的です。「待ち受け」はスマホの補助表現としてはあり得ますが、本調査で優先度や検索量を証明できていません。
- 「ライブ壁紙」は端末の動作する壁紙機能を示す実例があります。静止画をライブ壁紙と呼ばず、実在MP4には必要に応じて「動画壁紙」を使います。MP4配布からネイティブのライブ壁紙インストール対応を推論しません。
- 同じ文章の機種名だけを交換するより、実際の枚数・ライト/ダーク内訳・形式・色・Edition・画像サイズからページ固有の特徴を1〜2個選びます。Googleの公式文書は大規模DBの説明文を正確な固有データから生成することを認めています。

## 直接確認した根拠

| URL | 実際のタイトル・表現 | 採用する判断 |
|---|---|---|
| https://orefolder.jp/2019/10/pixel-4-wallpaper-2/ | Pixel 4でよく見るP4と描かれた壁紙「愛、そしてPixel」を設定する方法 | モデル名は英字。プロモーション画像と初期ホーム画面を区別しており、機種名から「デフォルト」を推論しない。 |
| https://orefolder.jp/2018/01/huawei-themes/ | ファーウェイのスマホで「テーマ」をダウンロードしてアイコンや壁紙をまとめて変更する方法 | ブランド記事ではカタカナ、型番はLatin表記。テーマは壁紙画像単体と異なるのでテーマ配布を約束しない。 |
| https://orefolder.jp/2014/02/wallpaper/ | はじめてのホーム画面カスタマイズ：壁紙設定あれこれ | ホーム画面・壁紙という語彙。古いサイズの一般則は適合保証に使わない。 |
| https://orefolder.jp/2017/02/minimal-flat-design-wallpapers/ | フラットデザインの壁紙がダウンロードできるアプリ5選 | デザインを表す語とダウンロード行動を自然な文で組み合わせる。 |
| https://helentech.jp/news-33252/ | Pixel Fold と Pixel Tablet に新しいライブ壁紙が追加 | FoldとTabletを区別し、ライブ壁紙は実際に動く機能に限定。この記事の枚数をPhWallsに転記しない。 |
| https://helentech.jp/how-to-change-wallpaper-on-chromebook/ | Chromebook の壁紙を変更する方法。設定手順を解説 | デスクトップの壁紙、自分の画像、JPEG/PNGといったPC用途の表現。 |
| https://helentech.jp/news-aluminium-os-desktop-exclusive-wallpapers-85998/ | Aluminium OS 向け「Desktop Exclusive」壁紙の4種類が新たに判明 | Desktop専用の区別がある。全OS画像をスマホ用としない。 |
| https://gori.me/microsoft/windows/161911 | Windows XP「草原」壁紙デザインのクロックスが一般販売開始 | Windows XP／デスクトップ壁紙という語彙の根拠。PhWallsに「草原」がある証拠にはしない。 |
| https://support.google.com/chromebook/answer/1251809?hl=ja | Chromebook の背景の壁紙とスクリーン セーバーを変更する | 公式日本語でも壁紙とスクリーンセーバーを区別。JPG/PNGダウンロードを壁紙の画像として扱う。 |
| https://developers.google.com/search/docs/appearance/title-link?hl=ja | Google 検索結果のタイトルリンクの変更 | 正確で具体的なタイトル、主要ページ言語と整合、キーワード羅列を避ける。 |
| https://developers.google.com/search/docs/appearance/snippet?hl=ja | スニペットの管理・メタ ディスクリプションについて | 固有データによる説明文生成は可能。表示スニペットはクエリ等に応じて変わり、固定長や順位は保証されない。 |

## タイトルと説明文の型

| 用途 | タイトル例の型 | 説明の補助語 |
|---|---|---|
| スマートフォン | `{モデル名}の壁紙{N}枚｜無料ダウンロード` | ホーム画面／ロック画面 |
| 折りたたみ | `{正確なFold/Flipモデル名}の壁紙{N}枚` | カバー画面はasset名がcoverの場合など、実在が確認できるときのみ |
| タブレット | `{モデル名}の壁紙{N}枚｜タブレット用` | タブレットの背景 |
| PC/デスクトップOS | `{OS・バージョン名}の壁紙{N}枚｜デスクトップ背景` | PCのデスクトップ背景 |
| OSのMobile Phone版 | `{OS・版名}のスマホ用壁紙{N}枚` | 縦長画像、実際の寸法 |
| 特別版 | `{モデル名とEdition名を省略せず}の壁紙{N}枚` | 通常版と区別したコレクション |

「公式」「純正」「標準」「デフォルト」「4K/8K」「全機種対応」はコレクションやファイル単位の証拠が必要です。端末ディスプレイ仕様から画像の解像度を推定しません。発売年・最新機種・発売済みといった文言も一覧の名前だけでは追加しません。

## 一覧データで特に区別する箇所

- Google Pixel 9 / Pro / Pro XL / Pro Foldを混ぜない。Pixel 6(October 8)、Pixel 3 Promotionalもコレクション名を維持する。
- Samsung Galaxy Note 10+ Star Wars（9枚）とStar Wars Edition（8枚）、Z Flip 3 Bespoke/Olympic、4G/5G、FEなどを省略しない。
- UbuntuのMobile Phone版はdesktopカテゴリでも2160×3840のスマホ画像。Chrome OS for Phone、Surface Duo系も名称と実画像を確認して用途を補正する。
- Android 15の3枚は5120×2880の横長JPG。Androidというだけで縦長スマホ壁紙とは書かない。
- Windows 7、Windows 7 Downloadable、Windows 7 Regionalを別コレクションとして維持する。

## 実在コレクションの日本語例

以下はinventory.jsonの枚数・形式・寸法・asset名に基づくコピー例です。「無料」はPhWallsで無料ダウンロードできることを前提とします。画像の由来・公式性の確認を意味しません。

### Google Pixel 9（8枚）

- タイトル：Google Pixel 9の壁紙8枚｜無料ダウンロード | PhWalls
- 説明：Google Pixel 9の壁紙8枚を無料ダウンロード。Jade、Obsidian、Peony、Porcelainのライト版・ダーク版を各4枚収録。3000×3000のJPEG画像から、ホーム画面やロック画面に使いたい1枚を選べます。

### Google Pixel 9 Pro Fold（4枚）

- タイトル：Google Pixel 9 Pro Foldの壁紙4枚｜無料ダウンロード | PhWalls
- 説明：Google Pixel 9 Pro Foldの壁紙4枚を掲載。ObsidianとPorcelainのライト版・ダーク版をJPEGでダウンロードできます。Pixel 9や9 Proの壁紙と区別して、このコレクションの画像を選べます。

### Samsung Galaxy Z Flip 5（45枚）

- タイトル：Samsung Galaxy Z Flip 5の壁紙45枚｜無料ダウンロード | PhWalls
- 説明：Samsung Galaxy Z Flip 5の壁紙45枚を無料ダウンロード。カバー画面用の画像を含むPNG・JPGのコレクションです。グラデーションや抽象デザインを見比べて、表示したい画面に合わせて選べます。

### Sony Xperia 1 II（33枚）

- タイトル：Sony Xperia 1 IIの壁紙33枚｜無料ダウンロード | PhWalls
- 説明：Sony Xperia 1 IIの壁紙33枚をPNG・JPGでダウンロード。黒を基調にした抽象デザインやグラデーションなどを収録しています。Xperia 1や1 IVと区別して、1 IIの画像を探せます。

### Huawei MatePad Pro（4枚）

- タイトル：Huawei MatePad Proの壁紙4枚｜タブレット用 | PhWalls
- 説明：Huawei MatePad Proの壁紙4枚を無料ダウンロード。2000×1600のJPG画像で、ゴールドやグリーン系のグラデーション・抽象デザインを収録。タブレットの背景に使う画像を選べます。

### Windows 11（31枚）

- タイトル：Windows 11の壁紙31枚｜デスクトップ背景 | PhWalls
- 説明：Windows 11の壁紙31枚をJPG・PNGで無料ダウンロード。抽象デザインやグラデーション、写真を収録しています。PCのデスクトップ背景に使いたい画像を、デザインを見比べながら選べます。

### Ubuntu 24.04 LTS Noble Numbat Mobile Phone（4枚）

- タイトル：Ubuntu 24.04 LTS Noble Numbatのスマホ用壁紙4枚 | PhWalls
- 説明：Ubuntu 24.04 LTS Noble NumbatのMobile Phone版を4枚収録。2160×3840の縦長JPG画像をダウンロードできます。カラー版に加えてダーク・ライト・Dimmed版を掲載した、スマートフォン向けコレクションです。

### Android 15 (Vanilla Ice Cream)（3枚）

- タイトル：Android 15（Vanilla Ice Cream）の壁紙3枚 | PhWalls
- 説明：Android 15（Vanilla Ice Cream）の壁紙3枚を掲載。5120×2880の横長JPG画像で、ダーク版も1枚収録しています。OS名で探せる壁紙コレクションから、好みの背景を無料ダウンロードできます。

### Nothing Phone 3a Community Edition（4枚）

- タイトル：Nothing Phone 3a Community Editionの壁紙4枚 | PhWalls
- 説明：Nothing Phone 3a Community Editionの壁紙4枚を無料ダウンロード。アクア、シアン、マゼンタ、パープルのPNG画像を1200×2676で収録。通常のPhone 3aと区別して、Community Editionのコレクションを見られます。

### Samsung Galaxy Note 10+ Star Wars Edition（8枚）

- タイトル：Samsung Galaxy Note 10+ Star Wars Editionの壁紙8枚 | PhWalls
- 説明：Samsung Galaxy Note 10+ Star Wars Editionの壁紙8枚をPNGでダウンロード。黒や赤を基調にしたグラデーション・抽象デザインなどを収録しています。このEdition名のコレクションから画像を選べます。
