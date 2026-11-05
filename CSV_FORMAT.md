# CSV形式

## 列の並び

CSVはUTF-8のカンマ区切りで、1行目にヘッダーを付ける場合は次の37列をこの順番で記述してください。ヘッダーは省略できますが、その場合もデータ列の順番は同じです。

```csv
time,AnkleLeft_X,AnkleLeft_Y,AnkleLeft_Z,AnkleRight_X,AnkleRight_Y,AnkleRight_Z,FootLeft_X,FootLeft_Y,FootLeft_Z,FootRight_X,FootRight_Y,FootRight_Z,HandLeft_X,HandLeft_Y,HandLeft_Z,HandRight_X,HandRight_Y,HandRight_Z,KneeLeft_X,KneeLeft_Y,KneeLeft_Z,KneeRight_X,KneeRight_Y,KneeRight_Z,Neck_X,Neck_Y,Neck_Z,spinebase_X,spinebase_Y,spinebase_Z,spinemid_X,spinemid_Y,spinemid_Z,spineshoulder_X,spineshoulder_Y,spineshoulder_Z
```

`time`は秒、関節座標はメートルです。数値は小数点に`.`を使います。

## 読み込み条件

- 37列がすべて必要です。列の不足・追加・並べ替えはエラーになります。
- ヘッダーを付ける場合は、上記の名前と順番に一致させてください。
- データ行は2行以上必要です。各値は有限の数値にしてください。
- 時刻は重複なしの昇順にしてください。
- 空の途中行は使えません。ファイル末尾の改行は使用できます。

## 再生方法

再生速度は時刻を基準にした1倍速です。CSV行の間は直前の行の姿勢を保持し、補間は行いません。タイムラインを行間に動かした場合も、指定時刻以前で最も新しい行を表示します。最後の行に到達すると停止し、再生ボタンを押すと先頭行から再開します。

CSVはブラウザー内で読み込みます。サーバーへの送信やプロジェクトへの自動保存は行いません。`.gitignore`ではCSVファイルをGitの追加対象から除外しています。
