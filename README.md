# review-checklist-manager-

レビュー観点追加用のリポジトリです。

## 概要
このリポジトリは、ソフトウェア開発やドキュメント作成時に必要な「レビュー観点（チェックリスト）」を管理・追加・共有するためのものです。  
プロジェクトごとにレビュー項目を整理し、品質向上を目指します。

## 主な機能
- レビュー観点（チェックリスト）のテンプレート管理
- プロジェクトや用途に応じた観点追加・編集
- チームメンバーとのチェックリスト共有
- Pull RequestやIssueへのレビュー観点自動挿入（今後の機能追加予定）

## 使い方

1. **リポジトリをクローンする**
    ```bash
    git clone https://github.com/Takashi-home/review-checklist-manager-.git
    ```
2. **チェックリストを編集・追加する**  
   `checklists/` ディレクトリ配下のMarkdownファイルを編集して、目的に応じた観点を追加してください。

3. **共有する**  
   プルリクエストやGitHub Issueでチェックリストを利用し、レビュー時の抜け漏れ防止に活用できます。

## ディレクトリ構成例

```
├── checklists/
│   ├── web_application.md
│   ├── mobile_app.md
│   └── document_review.md
├── scripts/
│   └── insert_checklist.py
└── README.md
```

## 貢献方法

1. IssueやPull Requestで改善案やチェックリスト追加を提案してください。
2. コードやチェックリストを追加する際は、事前にIssueを立ててください。
3. レビュー後、マージします。

## ライセンス
MIT License

---

ご不明点や要望があれば、Issueにてご連絡ください。
