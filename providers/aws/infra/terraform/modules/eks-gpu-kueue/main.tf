locals {
  gpu_namespace = "gpu-poc"

  gpu_node_labels = {
    "cloudai.platform/workload-class" = "gpu-poc"
  }

  gpu_toleration = {
    key      = "gpu-poc"
    operator = "Equal"
    value    = "true"
    effect   = "NoSchedule"
  }
}

resource "aws_eks_node_group" "gpu_poc" {
  cluster_name    = var.cluster_name
  node_group_name = "${var.cluster_name}-gpu-poc"
  node_role_arn   = var.gpu_node_role_arn
  subnet_ids      = var.subnet_ids

  ami_type      = "AL2023_x86_64_NVIDIA"
  capacity_type = "ON_DEMAND"
  instance_types = [
    var.gpu_instance_type,
  ]

  scaling_config {
    min_size     = var.gpu_min_size
    desired_size = var.gpu_desired_size
    max_size     = var.gpu_max_size
  }

  labels = local.gpu_node_labels

  taint {
    key    = "gpu-poc"
    value  = "true"
    effect = "NO_SCHEDULE"
  }

  tags = merge(var.tags, {
    Name             = "${var.cluster_name}-gpu-poc"
    WorkloadClass    = "gpu-poc"
    CapacityBoundary = "one-node-only"
  })
}

resource "helm_release" "nvidia_device_plugin" {
  name       = "nvidia-device-plugin"
  repository = "https://nvidia.github.io/k8s-device-plugin"
  chart      = "nvidia-device-plugin"
  version    = var.nvidia_device_plugin_chart_version
  namespace  = "kube-system"

  values = [yamlencode({
    nodeSelector = local.gpu_node_labels
    tolerations  = [local.gpu_toleration]
  })]

  depends_on = [aws_eks_node_group.gpu_poc]
}

resource "helm_release" "kueue" {
  name             = "kueue"
  repository       = "oci://registry.k8s.io/kueue/charts"
  chart            = "kueue"
  version          = var.kueue_chart_version
  namespace        = "kueue-system"
  create_namespace = true

  depends_on = [helm_release.nvidia_device_plugin]
}

resource "kubernetes_manifest" "gpu_namespace" {
  manifest = {
    apiVersion = "v1"
    kind       = "Namespace"
    metadata = {
      name = local.gpu_namespace
      labels = {
        "cloudai.platform/data-scope" = "synthetic-only"
      }
    }
  }
}

resource "kubernetes_manifest" "resource_flavor" {
  manifest = {
    apiVersion = "kueue.x-k8s.io/v1beta1"
    kind       = "ResourceFlavor"
    metadata = {
      name = "gpu-poc-on-demand"
    }
    spec = {
      nodeLabels = local.gpu_node_labels
      tolerations = [
        local.gpu_toleration,
      ]
    }
  }

  depends_on = [helm_release.kueue]
}

resource "kubernetes_manifest" "cluster_queue" {
  manifest = {
    apiVersion = "kueue.x-k8s.io/v1beta1"
    kind       = "ClusterQueue"
    metadata = {
      name = "gpu-poc-cluster"
    }
    spec = {
      namespaceSelector = {
        matchLabels = {
          "kubernetes.io/metadata.name" = local.gpu_namespace
          "cloudai.platform/data-scope" = "synthetic-only"
        }
      }
      resourceGroups = [
        {
          coveredResources = ["cpu", "memory", "nvidia.com/gpu"]
          flavors = [
            {
              name = "gpu-poc-on-demand"
              resources = [
                { name = "cpu", nominalQuota = "2" },
                { name = "memory", nominalQuota = "8Gi" },
                { name = "nvidia.com/gpu", nominalQuota = "1" },
              ]
            },
          ]
        },
      ]
      preemption = {
        withinClusterQueue = "Never"
      }
    }
  }

  depends_on = [kubernetes_manifest.resource_flavor]
}

resource "kubernetes_manifest" "local_queue" {
  manifest = {
    apiVersion = "kueue.x-k8s.io/v1beta1"
    kind       = "LocalQueue"
    metadata = {
      name      = "gpu-poc"
      namespace = local.gpu_namespace
    }
    spec = {
      clusterQueue = "gpu-poc-cluster"
    }
  }

  depends_on = [
    kubernetes_manifest.gpu_namespace,
    kubernetes_manifest.cluster_queue,
  ]
}

resource "kubernetes_manifest" "cuda_smoke_job" {
  manifest = {
    apiVersion = "batch/v1"
    kind       = "Job"
    metadata = {
      name      = "cuda-smoke"
      namespace = local.gpu_namespace
      labels = {
        "cloudai.platform/workload" = "synthetic-cuda-smoke"
        "kueue.x-k8s.io/queue-name" = "gpu-poc"
      }
    }
    spec = {
      suspend                 = true
      backoffLimit            = 0
      activeDeadlineSeconds   = 300
      ttlSecondsAfterFinished = 900
      template = {
        spec = {
          restartPolicy = "Never"
          nodeSelector  = local.gpu_node_labels
          tolerations   = [local.gpu_toleration]
          containers = [
            {
              name    = "cuda-smoke"
              image   = var.cuda_smoke_image
              command = ["sh", "-ec", "nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader"]
              resources = {
                requests = {
                  cpu              = "500m"
                  memory           = "1Gi"
                  "nvidia.com/gpu" = "1"
                }
                limits = {
                  cpu              = "500m"
                  memory           = "1Gi"
                  "nvidia.com/gpu" = "1"
                }
              }
            },
          ]
        }
      }
    }
  }

  depends_on = [kubernetes_manifest.local_queue]
}
