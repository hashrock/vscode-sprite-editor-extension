# VSCode Sprite Editor Extension

![vscode-sprite-ext-01](https://user-images.githubusercontent.com/3132889/92393088-467a6b00-f15a-11ea-8d04-f1e5bda9b5ba.gif)

- PNGの編集が可能です。
- 右クリックでスポイト
- 塗りつぶし機能つき

# 使い方

下記コマンドで新規作成をするか、

![image](https://user-images.githubusercontent.com/3132889/92401689-1e463880-f169-11ea-979d-82b3fa07466c.png)

PNGファイルを右クリックしてSprite Editorで開いてください。

![image](https://user-images.githubusercontent.com/3132889/92401733-39b14380-f169-11ea-98e4-fa57937e40e1.png)

![image](https://user-images.githubusercontent.com/3132889/92401783-5188c780-f169-11ea-8c32-4ecfb9795e9c.png)

# できないこと

- リサイズ
- 範囲選択や移動
- パレットの作成や保存
- その他ドット絵ツールに求められる基本的な機能すべて

# バグ

- 塗り残しが発生する
- アンドゥ履歴が怪しい
- そもそも安定している気がしない

# バグ報告について

- 報告はありがたいんですが直す気力はあまりないと思います
- 修正PRまでくれると嬉しいです

# ビルド手順

- yarn
- yarn watch:front
- VSCodeで開いてF5で実行
- front内を編集した場合はリロードが必要
