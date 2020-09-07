# VSCode Easy Custom Editor Example

下記packageのExampleです。

https://github.com/hashrock/vscode-easy-custom-editor

# 動機

- VSCode Extension難しすぎる
- ブートストラップコードが多すぎ
- undo / redo難しすぎ

# 構成

- Node.jsサイドがお仕着せになっている
- client / host間は基本的にファイルのスナップショットを送り合っている
- undoバッファはスナップショットをフルで持っている
  - 特に解放はしていないので注意。用途によってはメモリがひどいことになる

# 制約

- フロントのbundleはmedia/dist/assets/js/index.js一本にすること
- CSSはinlineにすること

# おかしなところ

- undo / redoがずれる時がある？
- そもそもundoやロードが遅い
- どっかpromise内で例外が発生している
