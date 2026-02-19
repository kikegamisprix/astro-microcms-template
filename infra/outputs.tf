output "s3_bucket_name" {
  description = "デプロイ先の S3 バケット名（→ GitHub Secret: AWS_S3_BUCKET）"
  value       = aws_s3_bucket.site.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront ディストリビューション ID（→ GitHub Secret: AWS_CLOUDFRONT_DISTRIBUTION_ID）"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront のドメイン名"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "サイトの URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "deploy_access_key_id" {
  description = "デプロイ用 IAM アクセスキー ID（→ GitHub Secret: AWS_ACCESS_KEY_ID）"
  value       = aws_iam_access_key.deploy.id
}

output "deploy_secret_access_key" {
  description = "デプロイ用 IAM シークレットアクセスキー（→ GitHub Secret: AWS_SECRET_ACCESS_KEY）"
  value       = aws_iam_access_key.deploy.secret
  sensitive   = true
}
