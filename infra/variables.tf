variable "project_name" {
  description = "プロジェクト名（リソースの命名に使用）"
  type        = string
}

variable "aws_region" {
  description = "AWS リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "s3_bucket_name" {
  description = "S3 バケット名（グローバルで一意）"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront の価格クラス"
  type        = string
  default     = "PriceClass_200"
}

# ────────────────────────────────────
# カスタムドメイン（任意）
# ────────────────────────────────────

variable "domain_name" {
  description = "カスタムドメイン（空文字の場合は CloudFront デフォルトドメインを使用）"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM 証明書の ARN（us-east-1 で発行済みのもの。domain_name 設定時に必要）"
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "Route53 ホストゾーン ID（空文字の場合は Route53 レコードを作成しない）"
  type        = string
  default     = ""
}
