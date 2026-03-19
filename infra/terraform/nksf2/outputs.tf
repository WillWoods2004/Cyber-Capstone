output "alb_dns_name" {
  description = "Public DNS name for the TLS-terminating application load balancer."
  value       = aws_lb.api.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.api.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.api.name
}

output "ecr_repository_url" {
  description = "Repository URL for the API container image."
  value       = aws_ecr_repository.api.repository_url
}

output "log_group_name" {
  description = "CloudWatch log group used by the ECS service."
  value       = aws_cloudwatch_log_group.api.name
}

output "token_secret_arn" {
  description = "Secrets Manager ARN used to inject the HMAC token secret."
  value       = aws_secretsmanager_secret.token_secret.arn
}
