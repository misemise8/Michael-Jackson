# AGENTS.md

## Project Goal

Michael Jackson をテーマにしたレシートのデザインを制作する。

## Critical Rule: Do Not Edit `../pack`

- `../pack` は参考用の素材・雛形として読み込むだけにする。
- `../pack` 配下のファイルは絶対に編集、削除、移動、リネームしない。
- `../pack` 配下に新しいファイルやフォルダを作成しない。
- 必要な素材やコードがある場合は、この `Michael Jackson` フォルダ内へコピーしてから、コピーしたものだけを編集する。
- 作業対象はこの `Michael Jackson` フォルダ内のファイルに限定する。

## Pack Notes

- `../pack/これをとりあえず見ろ.txt` には、HTML 内で画像を `<img src="image/.png">` の形で入れて見比べるとよい、というメモがある。
- 既存ページの識別用プレフィックスは以下の通り。
  - `setting`: `set_`
  - `regi`: `reg_`
  - `monitor`: `moni_`
  - `kitchen`: `kit1_`, `kit2_`

## Design Direction

- レシートらしい縦長レイアウト、品目、金額、小計、合計、日時、店舗名風の見出しを含める。
- Michael Jackson らしさは、文字、配色、装飾、商品名、演出で表現する。
- 権利や素材の扱いに注意し、外部画像や `../pack` の素材を使う場合も元ファイルは変更しない。
