# AI FinOps

AI FinOps focuses on cost visibility, forecasting, accountability, and optimization for AI workloads.

## Signals

- Estimated input and output token usage.
- Provider, model family, and environment labels.
- Request volume and latency.
- Cache effectiveness where applicable.
- Cost allocation tags.
- Quota, throughput, and capacity metadata for models, inference endpoints, retrieval services, agents, and GPU workloads.
- Showback or chargeback dimensions for use case, team, environment, provider, and model class.

## Capacity Lens

AI FinOps should connect cost to capacity decisions. A lower-cost model is not enough if it cannot meet latency, safety, regional, throughput, or governance requirements. A higher-capacity runtime is not justified unless its business value, reliability need, or risk reduction is visible.

Capacity signals to track:

- Model quota and rate-limit utilization.
- Real-time versus batch request volume.
- Provisioned throughput or reserved capacity usage.
- GPU/accelerator utilization and queue time.
- Retrieval index size, query volume, and refresh cost.
- Agent session, memory, sandbox, and tool-call volume.
- Fallback route frequency and cost impact.

## First Iteration

The repository includes a mock token-cost estimation script placeholder. It does not call real providers or calculate real invoices.
