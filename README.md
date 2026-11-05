# 人体関節 3D ビューア

## GitHub Pagesで利用する場合

GitHubにリポジトリを作成しただけでは、Webサイトの配信は始まりません。GitHub側で **Settings → Pages** を開き、**Deploy from a branch**を選び、`index.html`があるブランチと`/(root)`を公開元に指定してください。公開完了後はPages設定に表示されるURLから利用できます。

この設定が済めば、Web上で使うためにローカルサーバーを立ち上げる必要はありません。HTMLのJS/CSS参照は、リポジトリ名を含むURLでも動く相対パスにしています。

GitHub Pagesのサイトはインターネット上に公開されます。リポジトリが非公開でも、Pagesの公開サイトは公開される場合があるため、実測関節データなどを含めないでください。[GitHub Pagesの作成手順](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## ローカルでプレビューする場合（任意）

`file://`で直接開くとESモジュールの読み込みが制限されるブラウザーがあります。ローカルで確認するときだけ、プロジェクトフォルダーをカレントディレクトリにして次を実行します。

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

ブラウザーで <http://127.0.0.1:8000/> を開きます。Three.jsはjsDelivr CDNから読み込むため、ローカル/Pagesのどちらでもインターネット接続が必要です。

## 現在の開発範囲

STEP6まで実装しています。XYZ軸・XZ平面グリッド・照明・カメラ操作に加えて、12関節の球体と接続線、関節ごとの数値入力・スライダー、全関節のXYZ座標一覧を表示します。関節IDは`AnkleLeft`、`AnkleRight`、`FootLeft`、`FootRight`、`HandLeft`、`HandRight`、`KneeLeft`、`KneeRight`、`Neck`、`spinebase`、`spinemid`、`spineshoulder`です。座標の状態は`jointData.js`で管理し、3D表示と入力欄と座標一覧は同じデータから更新します。

座標は1単位を1m、Y軸を上、人物の前方を+Z、人物の左側を+Xとしています。接続線は首・首元・背中・腰の体幹から左右の手と膝へつなぎ、膝・足首・足を結ぶ簡易骨格です。将来的なデータ形式は時間1列と12関節のXYZ座標36列の合計37列を想定しています。CSV読み込みと時間軸再生は未実装で、現在はJavaScript内の仮座標を使用します。

## GitHubへ公開する前に

公開範囲、秘密情報、実測関節データ、依存ライセンスなどの確認事項は[GitHubプッシュ前チェック表](GITHUB_PUSH_CHECKLIST.md)を参照してください。
