{{- define "ai-api-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ai-api-service.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "ai-api-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ai-api-service.labels" -}}
helm.sh/chart: {{ include "ai-api-service.chart" . }}
app.kubernetes.io/name: {{ include "ai-api-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: cloudai-platform
cloudai.platform/owner: {{ .Values.platformLabels.owner | quote }}
cloudai.platform/environment: {{ .Values.platformLabels.environment | quote }}
cloudai.platform/data-scope: {{ .Values.platformLabels.dataScope | quote }}
cloudai.platform/cost-center: {{ .Values.platformLabels.costCenter | quote }}
cloudai.platform/capability: {{ .Values.platformLabels.platformCapability | quote }}
{{- end -}}

{{- define "ai-api-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ai-api-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "ai-api-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "ai-api-service.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
