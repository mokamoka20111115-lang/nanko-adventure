# なんこの大冒険

[ゲームを遊ぶ](https://mokamoka20111115-lang.github.io/nanko-adventure/) — iPhoneはSafariで開いて「ホーム画面に追加」。

なんこ＆ちゃけが、はしもとに挑む無料の縦スクロールシューティング。

## 遊び方
- スマホ：ゲーム画面を指でドラッグすると移動（指を置いた場所にワープしません）。攻撃は自動。
- 武器：お金＝高速連射、お肉＝高威力＋爆風、お魚＝回転する3方向攻撃。
- ゲージ100%で「むかちゅくーーー！！」。弾を消し、広範囲ダメージ＋短時間無敵。
- ハート＝HP回復、黄色の星＝攻撃力アップ、紫の星＝必殺ゲージ回復。
- はしもとの眼鏡フラッシュは黄色い予告線の外へ避けよう。
- PC：矢印/WASDで移動、Shiftでゆっくり、1/2/3で武器、Z/Xで必殺技、Pで一時停止。
- 全3ステージ。途中ボスを倒すとHPが1回復。

## iPhoneに追加
Safariで公開ページを開き、共有→ホーム画面に追加→追加。
「オフライン準備OK」を確認してからオフラインにしてください。
iOSのストレージ整理等で保存が消えた場合は、再び通信環境で起動してください。
音は最初の操作後に開始。日本語音声が端末で使えない場合も、文字と効果音で演出します。
更新はプレイ中に強制適用せず、ゲームを閉じて再度開いたときに適用します。

## 構成
外部ライブラリ、外部音源、有料API、通信するゲームサーバーは使用しません。
Canvasで描く既存のキャラクターを継承。BGM/効果音はWeb Audio、声は端末の音声合成です。
ベストスコア・消音設定のみ、この端末のlocalStorageに保存します。

`index.html`, `style.css`, `game.js`, `pwa.js`, `service-worker.js`, `manifest.webmanifest`, `assets/`, `icons/` が配信対象です。

## 開発と公開
`python3 -m http.server 8000` でローカル起動。
mainへのpushで `.github/workflows/pages.yml` が静的ファイルをGitHub Pagesへ公開します。
初回のPages有効化に権限が不足する場合は、リポジトリのSettings → Pages → SourceをGitHub Actionsに設定してください。
配信ファイルを変更するときはservice-worker.jsのCACHE_NAMEも更新してください。
アイコンの再生成は `node tools/generate-art.cjs`（開発用に @napi-rs/canvas が必要）。
