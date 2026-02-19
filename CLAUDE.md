# Astro + microCMS 静的サイトテンプレート

## プロジェクト概要

LP・採用サイト・コーポレートサイトを量産するためのベーステンプレート。
Astro（静的生成）+ microCMS + TypeScript + Terraform + GitHub Actions 構成。

## 技術スタック

- **Astro v5** — 静的サイトジェネレーター（`output: 'static'`）
- **microCMS** — ヘッドレス CMS（microcms-js-sdk）
- **TypeScript** — strict モード
- **Terraform** — AWS インフラ管理（`infra/` ディレクトリ）
- **GitHub Actions** — S3 + CloudFront への自動デプロイ

## ディレクトリ構成

```
src/
├── components/   # Header, Footer, Hero, CTA, NewsCard
├── layouts/      # BaseLayout（共通）, LPLayout（LP用）
├── lib/          # microcms.ts（クライアント・型定義・ヘルパー）
├── pages/        # index.astro, news/index.astro, news/[slug].astro
└── styles/       # global.css（リセット + CSS カスタムプロパティ）
infra/            # Terraform（S3, CloudFront, OAC, IAM, Route53）
.github/workflows/deploy.yml  # CI/CD
```

## テンプレートリポジトリの初回セットアップ

このテンプレート自体を GitHub に登録する際の手順（初回のみ）。

```bash
# 1. GitHub にリポジトリを作成してプッシュ
gh repo create {org}/astro-microcms-template --source=. --push --private
```

2. ブラウザで GitHub リポジトリページ → Settings → General → 「Template repository」にチェック
   （この設定は CLI からできないため、ユーザーにブラウザでの操作を案内する）

## MCP 設定

microCMS の MCP サーバーを使う場合、以下を実行して登録する:

```bash
claude mcp add microcms -- npx -y microcms-mcp-server
```

登録後、microCMS のサービスドメインと API キーの入力を求められる。
MCP 経由で API 情報の取得・コンテンツの CRUD・メディア管理が可能。

## 新しいサイトの立ち上げフロー

このテンプレートから新しいサイトを作る際の手順。
Claude Code が自動実行できるステップと、ユーザーに手動操作を依頼するステップがある。

### 前提条件

以下がインストール済みであること:
- Node.js >= 20
- Terraform >= 1.2
- AWS CLI >= 2（`aws configure` 済み）
- GitHub CLI >= 2（`gh auth login` 済み）

### フロー

#### Phase 1: ユーザーに確認する情報

以下をユーザーに聞く:
- **プロジェクト名**（例: `my-corp-site`）— リポジトリ名・リソース命名に使用
- **S3 バケット名**（例: `my-corp-site-assets`）— グローバルで一意
- **GitHub Organization または個人アカウント名**
- **microCMS のサービスドメインと API キー**（後から入力でも OK）
- **カスタムドメインの有無**（任意: ドメイン名, ACM 証明書 ARN, Route53 ホストゾーン ID）

#### Phase 2: Claude Code が自動実行

```bash
# 1. テンプレートからリポジトリ作成
gh repo create {org}/{project_name} --template {org}/astro-microcms-template --private --clone
cd {project_name}

# 2. 依存関係インストール
npm install

# 3. 環境変数設定（ローカル開発用）
cp .env.example .env
# .env を編集して MICROCMS_SERVICE_DOMAIN, MICROCMS_API_KEY を設定

# 4. Terraform でインフラ構築
cd infra
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集（project_name, s3_bucket_name, 任意でドメイン設定）
terraform init
terraform plan
terraform apply -auto-approve

# 5. GitHub Secrets を設定（Terraform output から自動取得）
cd ..
gh secret set AWS_ACCESS_KEY_ID --body "$(cd infra && terraform output -raw deploy_access_key_id)"
gh secret set AWS_SECRET_ACCESS_KEY --body "$(cd infra && terraform output -raw deploy_secret_access_key)"
gh secret set AWS_S3_BUCKET --body "$(cd infra && terraform output -raw s3_bucket_name)"
gh secret set AWS_CLOUDFRONT_DISTRIBUTION_ID --body "$(cd infra && terraform output -raw cloudfront_distribution_id)"
gh secret set MICROCMS_SERVICE_DOMAIN --body "{サービスドメイン}"
gh secret set MICROCMS_API_KEY --body "{APIキー}"

# 6. MCP で microCMS 疎通確認（MCP 登録済みの場合）
# microCMS の API 一覧を取得して news API が存在するか確認

# 7. デプロイ
git add -A
git commit -m "初期セットアップ"
git push origin main

# 8. デプロイ URL を確認
cd infra && terraform output site_url
```

#### Phase 3: ユーザーに手動操作を依頼（microCMS 管理画面）

以下は microCMS の管理画面からの操作が必要。ユーザーに手順を案内する。

**初回セットアップ時（サービス未作成の場合）:**

1. **microCMS でサービスを作成**
   - https://microcms.io/ にログイン
   - 「サービスを作成」からサービスを作成
   - サービスドメイン（`xxxx.microcms.io` の `xxxx` 部分）を控える

2. **API を作成**
   - 「API を作成」→ リスト形式を選択
   - エンドポイント: `news`
   - 表示名: お知らせ
   - スキーマ設定:
     | フィールド ID | 表示名 | 種類 |
     |---|---|---|
     | `title` | タイトル | テキストフィールド |
     | `content` | 本文 | リッチエディタ |
     | `category` | カテゴリ | 複数選択（任意） |
     | `thumbnail` | サムネイル | 画像（任意） |

3. **API キーを取得**
   - サービス設定 → API キー
   - Claude Code / GitHub Actions 用に API キーをコピー

4. **Webhook を設定**（コンテンツ更新時の自動再ビルド）
   - GitHub で Personal Access Token (classic) を作成（スコープ: `repo`）
   - microCMS 管理画面 → API 設定 → Webhook → カスタム通知を追加
   - URL: `https://api.github.com/repos/{owner}/{repo}/dispatches`
   - ヘッダー:
     - `Authorization`: `Bearer {GitHubトークン}`
     - `Accept`: `application/vnd.github.v3+json`
   - ボディ: `{"event_type": "microcms_update"}`
   - トリガー: コンテンツの公開・更新時

## よくある操作

### ローカル開発

```bash
npm run dev      # 開発サーバー起動（http://localhost:4321）
npm run build    # 静的ビルド
npm run preview  # ビルド結果のプレビュー
```

### microCMS 未接続時

環境変数が未設定の場合、`src/lib/microcms.ts` のダミーデータで動作する。
ローカル開発・ビルドともにエラーにならない。

### サイトのカスタマイズ

- サイト名の変更: `src/layouts/LPLayout.astro` と `src/components/Header.astro` の `SITE NAME` を変更
- カラー・フォントの変更: `src/styles/global.css` の CSS カスタムプロパティを編集
- OGP・メタ情報の変更: `src/layouts/BaseLayout.astro` の props デフォルト値を編集
- ページの追加: `src/pages/` にファイルを追加（Astro のファイルベースルーティング）

### インフラの変更

```bash
cd infra
terraform plan   # 変更内容の確認
terraform apply  # 反映
```

### インフラの削除

```bash
cd infra
terraform destroy  # 全リソースを削除（確認プロンプトあり）
```

## 命名規則

量産時に統一するための命名規則。Phase 1 でユーザーに聞く際の参考にする。

| 項目 | 規則 | 例 |
|---|---|---|
| リポジトリ名 | `{種別}-{クライアント名}` | `lp-acme`, `corp-globex`, `recruit-initech` |
| `project_name` | リポジトリ名と同じ | `lp-acme` |
| `s3_bucket_name` | `{org名}-{project_name}-assets` | `myorg-lp-acme-assets` |
| microCMS サービスドメイン | `{project_name}` | `lp-acme` |
| Terraform state key | `sites/{project_name}/terraform.tfstate` | `sites/lp-acme/terraform.tfstate` |

種別: `lp`（ランディングページ）, `corp`（コーポレートサイト）, `recruit`（採用サイト）

## カスタムドメイン設定

カスタムドメインを使用する場合、Phase 2 で以下の追加作業を自動実行する。

### Route53 ホストゾーン作成

```bash
aws route53 create-hosted-zone --name {domain_name} --caller-reference "$(date +%s)"
# 出力される NS レコードをユーザーに共有し、レジストラ側での設定を依頼する
```

### ACM 証明書の取得（us-east-1 必須）

```bash
# 証明書をリクエスト
CERT_ARN=$(aws acm request-certificate \
  --region us-east-1 \
  --domain-name {domain_name} \
  --validation-method DNS \
  --query "CertificateArn" --output text)

# DNS 検証レコードを取得
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn $CERT_ARN \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord"

# Route53 に検証レコードを追加して検証完了を待つ
aws acm wait certificate-validated --region us-east-1 --certificate-arn $CERT_ARN
```

### terraform.tfvars に追記

```hcl
domain_name         = "{domain_name}"
acm_certificate_arn = "{CERT_ARN}"
hosted_zone_id      = "{hosted_zone_id}"
```

## サイトの削除（撤退手順）

サイトを閉じる場合は以下の順序で実行する。

```bash
# 1. S3 バケットを空にする（terraform destroy の前に必要）
aws s3 rm s3://$(cd infra && terraform output -raw s3_bucket_name) --recursive

# 2. AWS リソースを削除
cd infra
terraform destroy

# 3. GitHub リポジトリを削除
cd ..
gh repo delete {owner}/{repo} --yes
```

4. ユーザーに以下の手動作業を依頼:
   - microCMS 管理画面からサービスを削除（任意）
   - Webhook 用に作成した GitHub Personal Access Token の失効
