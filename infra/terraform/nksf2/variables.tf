variable "aws_region" {
  description = "AWS region for NKSF2 infrastructure."
  type        = string
}

variable "project_name" {
  description = "Project prefix for named AWS resources."
  type        = string
  default     = "securitypass"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "prod"
}

variable "vpc_id" {
  description = "VPC ID that hosts the ALB and ECS service."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the application load balancer."
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for the ECS tasks."
  type        = list(string)
}

variable "certificate_arn" {
  description = "ACM certificate ARN for the HTTPS listener."
  type        = string
}

variable "allowed_ingress_cidrs" {
  description = "CIDR ranges allowed to reach the ALB."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cors_allowed_origins" {
  description = "Browser origins allowed by the API CORS policy."
  type        = list(string)
}

variable "ecr_repository_name" {
  description = "ECR repository name for the container image."
  type        = string
  default     = "securitypass-api"
}

variable "service_name" {
  description = "Name used for the ECS service, task family, and ALB resources."
  type        = string
  default     = "securitypass-api"
}

variable "container_port" {
  description = "Port exposed by the API container."
  type        = number
  default     = 8080
}

variable "desired_count" {
  description = "Desired ECS task count."
  type        = number
  default     = 1
}

variable "cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 512
}

variable "image_tag" {
  description = "Container image tag to deploy."
  type        = string
  default     = "latest"
}

variable "healthcheck_path" {
  description = "HTTP path used by ALB and container health checks."
  type        = string
  default     = "/healthz"
}
