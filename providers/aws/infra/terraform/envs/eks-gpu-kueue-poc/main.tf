data "aws_eks_cluster" "existing" {
  name = var.eks_cluster_name
}

data "aws_eks_cluster_auth" "existing" {
  name = data.aws_eks_cluster.existing.name
}

data "aws_subnets" "existing_cluster_vpc" {
  filter {
    name   = "vpc-id"
    values = [data.aws_eks_cluster.existing.vpc_config[0].vpc_id]
  }
}

locals {
  common_tags = merge(var.tags, {
    Project          = "cloudai-platform"
    Environment      = "eks-gpu-kueue-poc"
    DataScope        = "synthetic-only"
    ManagedBy        = "terraform"
    CostBoundary     = "one-gpu-node-only"
    TeardownRequired = "true"
  })
}

data "aws_iam_policy_document" "gpu_node_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "gpu_node" {
  name               = "${var.eks_cluster_name}-gpu-poc-node-role"
  assume_role_policy = data.aws_iam_policy_document.gpu_node_assume_role.json
  tags               = local.common_tags
}

resource "aws_iam_role_policy_attachment" "gpu_node_worker" {
  role       = aws_iam_role.gpu_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "gpu_node_cni" {
  role       = aws_iam_role.gpu_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "gpu_node_registry" {
  role       = aws_iam_role.gpu_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

module "gpu_kueue" {
  source = "../../modules/eks-gpu-kueue"

  cluster_name                       = data.aws_eks_cluster.existing.name
  subnet_ids                         = data.aws_subnets.existing_cluster_vpc.ids
  gpu_node_role_arn                  = aws_iam_role.gpu_node.arn
  gpu_instance_type                  = var.gpu_instance_type
  gpu_min_size                       = var.gpu_min_size
  gpu_desired_size                   = var.gpu_desired_size
  gpu_max_size                       = var.gpu_max_size
  cuda_smoke_image                   = var.cuda_smoke_image
  nvidia_device_plugin_chart_version = var.nvidia_device_plugin_chart_version
  kueue_chart_version                = var.kueue_chart_version
  tags                               = local.common_tags

  depends_on = [
    aws_iam_role_policy_attachment.gpu_node_worker,
    aws_iam_role_policy_attachment.gpu_node_cni,
    aws_iam_role_policy_attachment.gpu_node_registry,
  ]
}
