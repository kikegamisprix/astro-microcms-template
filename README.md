# Astro + microCMS 静的サイトテンプレート

LP・採用サイト・コーポレートサイトを量産するためのベーステンプレートです。
Astro（静的生成）+ microCMS（ヘッドレス CMS）+ TypeScript 構成で、Terraform による AWS インフラ構築と GitHub Actions による自動デプロイまでオールインワンで含んでいます。

## 技術スタック

- **Astro** — 静的サイトジェネレーター
- **microCMS** — ヘッドレス CMS（お知らせなどのコンテンツ管理）
- **TypeScript** — 型安全な開発
- **Terraform** — AWS インフラ構築（S3 + CloudFront + OAC + IAM + Route53）
- **GitHub Actions** — CI/CD（S3 + CloudFront へのデプロイ）

## プロジェクト構成

```
src/
├── components/      # 共通コンポーネント（Header, Footer, Hero, CTA, NewsCard）
├── layouts/         # レイアウト（BaseLayout, LPLayout）
├── lib/             # microCMS クライアント・型定義
├── pages/           # ページ（index, news/）
└── styles/          # グローバル CSS
infra/
├── main.tf          # S3, CloudFront, OAC, IAM, Route53
├── variables.tf     # サイトごとに変える変数
├── outputs.tf       # デプロイに必要な ID・キーを出力
└── terraform.tfvars.example
```

## 前提条件

以下のツールがインストール済みであること。

| ツール | バージョン | 確認コマンド |
| :--- | :--- | :--- |
| Node.js | >= 20 | `node -v` |
| npm | >= 10 | `npm -v` |
| Terraform | >= 1.2 | `terraform -v` |
| AWS CLI | >= 2 | `aws --version` |
| GitHub CLI | >= 2 | `gh --version` |

また、Terraform を実行するための **AWS クレデンシャル**が設定済みであること。

```bash
aws configure
# または環境変数 AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY を設定
```

---

## テンプレートリポジトリの初回セットアップ

このテンプレート自体を GitHub に登録する手順です（初回のみ）。

```bash
# 1. GitHub にリポジトリを作成してプッシュ
gh repo create your-org/astro-microcms-template --source=. --push --private
```

```
# 2. テンプレートリポジトリとして設定
#    GitHub リポジトリページ → Settings → General → 「Template repository」にチェック
#    ※ この設定は CLI からできないため、ブラウザで行う
```

これ以降、`gh repo create --template` でこのテンプレートから新しいサイトを作成できます。

---

## 新しいサイトの立ち上げ手順

### 1. テンプレートからリポジトリを作成

```bash
gh repo create my-new-site --template your-org/astro-microcms-template --private --clone
cd my-new-site
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. microCMS をセットアップ

1. [microCMS](https://microcms.io/) にログインし、新しいサービスを作成
2. 「API を作成」から **リスト形式** の API を作成（エンドポイント: `news`）
3. 以下のスキーマを設定:

   | フィールド ID | 表示名 | 種類 |
   | :--- | :--- | :--- |
   | `title` | タイトル | テキストフィールド |
   | `content` | 本文 | リッチエディタ |
   | `category` | カテゴリ | 複数選択（任意） |
   | `thumbnail` | サムネイル | 画像（任意） |

4. サービス設定 → API キーから **API キー**を取得
5. サービスの **サービスドメイン**（`xxxx.microcms.io` の `xxxx` 部分）を確認

### 4. 環境変数を設定

```bash
cp .env.example .env
```

`.env` を編集:

```
MICROCMS_SERVICE_DOMAIN=上で確認したサービスドメイン
MICROCMS_API_KEY=上で取得したAPIキー
```

> microCMS 未接続でもダミーデータで動作するため、まずスキップしてローカル確認しても OK です。

### 5. ローカル開発サーバーを起動

```bash
npm run dev
```

`http://localhost:4321` でサイトを確認できます。

### 6. AWS インフラを構築（Terraform）

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars` を編集:

```hcl
project_name   = "my-new-site"
s3_bucket_name = "my-new-site-assets"  # グローバルで一意な名前
```

インフラを作成:

```bash
terraform init
terraform plan    # 作成されるリソースを確認
terraform apply   # 実行（yes を入力）
```

### 7. GitHub Actions Secrets を設定

Terraform の output を使って GitHub Secrets を一括設定します。

```bash
cd ..  # プロジェクトルートに戻る

# Terraform output から値を取得して Secrets に設定
gh secret set AWS_ACCESS_KEY_ID --body "$(cd infra && terraform output -raw deploy_access_key_id)"
gh secret set AWS_SECRET_ACCESS_KEY --body "$(cd infra && terraform output -raw deploy_secret_access_key)"
gh secret set AWS_S3_BUCKET --body "$(cd infra && terraform output -raw s3_bucket_name)"
gh secret set AWS_CLOUDFRONT_DISTRIBUTION_ID --body "$(cd infra && terraform output -raw cloudfront_distribution_id)"

# microCMS の値を設定
gh secret set MICROCMS_SERVICE_DOMAIN --body "上で確認したサービスドメイン"
gh secret set MICROCMS_API_KEY --body "上で取得したAPIキー"
```

> **対応表**
>
> | Terraform output | GitHub Secret |
> | :--- | :--- |
> | `deploy_access_key_id` | `AWS_ACCESS_KEY_ID` |
> | `deploy_secret_access_key` | `AWS_SECRET_ACCESS_KEY` |
> | `s3_bucket_name` | `AWS_S3_BUCKET` |
> | `cloudfront_distribution_id` | `AWS_CLOUDFRONT_DISTRIBUTION_ID` |

### 8. microCMS Webhook を設定（コンテンツ更新時の自動再ビルド）

microCMS でコンテンツを更新したときに自動でサイトが再ビルドされるよう、Webhook を設定します。

1. GitHub で **Personal Access Token (classic)** を作成（スコープ: `repo`）
2. microCMS 管理画面 → API 設定 → Webhook → 「カスタム通知」を追加
3. 以下を設定:

   ```
   URL: https://api.github.com/repos/{owner}/{repo}/dispatches
   ヘッダー:
     Authorization: Bearer {上で作成したトークン}
     Accept: application/vnd.github.v3+json
   ボディ:
     {"event_type": "microcms_update"}
   ```

4. トリガー: 「コンテンツの公開・更新時」を選択

### 9. サイト名・デザインをカスタマイズ

- `src/layouts/` — サイト名・メタ情報を変更
- `src/styles/global.css` — カラー・フォントなどの CSS 変数を変更
- `src/components/` — 各セクションの内容を編集

### 10. デプロイ

```bash
git add -A && git commit -m "サイトをカスタマイズ" && git push origin main
```

`main` ブランチに push すると GitHub Actions が自動でビルド・デプロイを実行します。

デプロイ後の URL を確認:

```bash
cd infra && terraform output site_url
```

---

## コマンド一覧

| コマンド | 説明 |
| :--- | :--- |
| `npm install` | 依存関係のインストール |
| `npm run dev` | ローカル開発サーバーを起動（port 4321） |
| `npm run build` | 本番用の静的ファイルを `./dist/` に生成 |
| `npm run preview` | ビルド結果をローカルでプレビュー |

## インフラ構成（Terraform）

`infra/` ディレクトリで以下の AWS リソースを管理しています。

| リソース | 説明 |
| :--- | :--- |
| S3 バケット | 静的ファイルのホスティング（パブリックアクセスブロック有効） |
| CloudFront | CDN 配信 + HTTPS |
| OAC | CloudFront → S3 のセキュアなアクセス制御 |
| IAM ユーザー | GitHub Actions デプロイ用（最小権限: S3 書き込み + CloudFront 無効化のみ） |
| Route53 レコード | カスタムドメインの A レコード（任意） |

### Terraform 変数

| 変数 | 必須 | 説明 |
| :--- | :---: | :--- |
| `project_name` | Yes | プロジェクト名 |
| `s3_bucket_name` | Yes | S3 バケット名（グローバルで一意） |
| `domain_name` | No | カスタムドメイン |
| `acm_certificate_arn` | No | ACM 証明書 ARN（us-east-1 で発行済み） |
| `hosted_zone_id` | No | Route53 ホストゾーン ID |

### tfstate の管理

チームで運用する場合は `infra/main.tf` の `backend "s3"` ブロックのコメントを外し、tfstate を S3 で管理してください。

---

## Claude Code での自動セットアップ

このテンプレートは [Claude Code](https://claude.ai/claude-code) による自動セットアップに対応しています。

```
「このテンプレートから my-corp-site という名前で新しいサイトを立ち上げて」
```

と指示するだけで、リポジトリ作成 → インフラ構築 → Secrets 設定 → デプロイまで自動実行します。
詳細な手順は `CLAUDE.md` を参照してください。

### microCMS MCP 連携

Claude Code に microCMS MCP を登録すると、コンテンツの作成・管理も Claude Code から実行できます。

```bash
claude mcp add microcms -- npx -y microcms-mcp-server
```

---

## 命名規則

量産時に名前がバラバラにならないよう、以下の規則を推奨します。

| 項目 | 規則 | 例 |
| :--- | :--- | :--- |
| リポジトリ名 | `{種別}-{クライアント名}` | `lp-acme`, `corp-globex`, `recruit-initech` |
| `project_name` | リポジトリ名と同じ | `lp-acme` |
| `s3_bucket_name` | `{org名}-{project_name}-assets` | `myorg-lp-acme-assets` |
| microCMS サービスドメイン | `{project_name}` | `lp-acme` |
| Terraform state key | `sites/{project_name}/terraform.tfstate` | `sites/lp-acme/terraform.tfstate` |

**種別の例:** `lp`（ランディングページ）, `corp`（コーポレートサイト）, `recruit`（採用サイト）

---

## カスタムドメインの設定

カスタムドメインを使用する場合の追加手順です。

### 1. Route53 にホストゾーンを作成（ドメイン取得済みの場合）

```bash
# ホストゾーンを作成
aws route53 create-hosted-zone --name example.com --caller-reference "$(date +%s)"

# ホストゾーン ID を確認
aws route53 list-hosted-zones-by-name --dns-name example.com --query "HostedZones[0].Id" --output text
```

ドメインのレジストラ（お名前.com、Route53 Domains 等）で、表示された NS レコードをネームサーバーに設定してください。

### 2. ACM で SSL 証明書を取得（us-east-1 で発行）

CloudFront で使う証明書は **必ず us-east-1** で発行する必要があります。

```bash
# us-east-1 で証明書をリクエスト
aws acm request-certificate \
  --region us-east-1 \
  --domain-name example.com \
  --validation-method DNS \
  --query "CertificateArn" --output text

# DNS 検証用の CNAME レコードを確認
aws acm describe-certificate \
  --region us-east-1 \
  --certificate-arn {上で取得した ARN} \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord"
```

表示された CNAME レコードを Route53（または DNS プロバイダ）に追加し、検証が通るのを待ちます。

### 3. terraform.tfvars にドメイン設定を追加

```hcl
project_name        = "lp-acme"
s3_bucket_name      = "myorg-lp-acme-assets"
domain_name         = "example.com"
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx"
hosted_zone_id      = "Z1234567890ABC"
```

```bash
cd infra
terraform apply
```

---

## サイトの削除（撤退手順）

サイトを閉じる場合は以下の順序で削除します。

### 1. AWS インフラを削除

```bash
# S3 バケットの中身を空にする（Terraform destroy の前に必要）
aws s3 rm s3://$(cd infra && terraform output -raw s3_bucket_name) --recursive

# Terraform でリソースを一括削除
cd infra
terraform destroy
```

### 2. GitHub リポジトリを削除

```bash
gh repo delete {owner}/{repo} --yes
```

### 3. microCMS サービスを削除（任意）

microCMS 管理画面 → サービス設定 → サービスの削除

### 4. 不要になった Secrets・トークンの失効

- GitHub Personal Access Token（Webhook 用に作成した場合）を失効
- microCMS の API キーは、サービス削除時に自動で無効化される

---

## microCMS 未接続時の動作

環境変数が未設定の場合、ダミーデータでページが表示されます。
microCMS なしでもローカル開発・ビルドが可能です。
