locals {
  observability_namespace = "CloudAI/AgentCoreRag"
  observability_route     = "governed-rag-runtime"
}

resource "aws_cloudwatch_dashboard" "agentcore_rag" {
  count = var.enable_runtime && var.observability_enabled ? 1 : 0

  dashboard_name = "${local.name_prefix}-observability"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "AgentCore RAG outcomes"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Sum"
          period = 300
          metrics = [
            [local.observability_namespace, "AnswerCount", "Environment", var.environment, "Route", local.observability_route, "Outcome", "answer", { label = "Answers" }],
            [local.observability_namespace, "AbstentionCount", "Environment", var.environment, "Route", local.observability_route, "Outcome", "abstain", { label = "Abstentions" }],
            [local.observability_namespace, "DeniedCount", "Environment", var.environment, "Route", local.observability_route, "Outcome", "denied", { label = "Denied" }],
            [local.observability_namespace, "RetrievalUnavailableCount", "Environment", var.environment, "Route", local.observability_route, "Outcome", "abstain", { label = "Retrieval unavailable" }]
          ]
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "AgentCore RAG latency"
          region = var.aws_region
          view   = "timeSeries"
          stat   = "Average"
          period = 300
          metrics = [
            [local.observability_namespace, "InvocationLatencyMs", "Environment", var.environment, "Route", local.observability_route, "Outcome", "answer", { label = "Answer latency (ms)" }],
            [local.observability_namespace, "InvocationLatencyMs", "Environment", var.environment, "Route", local.observability_route, "Outcome", "abstain", { label = "Abstention latency (ms)" }]
          ]
        }
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "retrieval_unavailable" {
  count = var.enable_runtime && var.observability_enabled ? 1 : 0

  alarm_name          = "${local.name_prefix}-retrieval-unavailable"
  alarm_description   = "Synthetic AgentCore RAG retrieval became unavailable. No notification action is configured in the personal sandbox."
  namespace           = local.observability_namespace
  metric_name         = "RetrievalUnavailableCount"
  dimensions          = { Environment = var.environment, Route = local.observability_route, Outcome = "abstain" }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "answer_latency" {
  count = var.enable_runtime && var.observability_enabled ? 1 : 0

  alarm_name          = "${local.name_prefix}-answer-latency"
  alarm_description   = "Synthetic AgentCore RAG answer latency exceeded the initial sandbox threshold. Review the dashboard before changing the threshold."
  namespace           = local.observability_namespace
  metric_name         = "InvocationLatencyMs"
  dimensions          = { Environment = var.environment, Route = local.observability_route, Outcome = "answer" }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 1
  threshold           = 3000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
}
