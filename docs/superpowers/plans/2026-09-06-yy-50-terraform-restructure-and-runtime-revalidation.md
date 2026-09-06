# YY-50 Terraform Restructure and Runtime Revalidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure every existing AWS Terraform module and root composition into `modules`, `foundations`, and value-only `environments`, add a repository-scoped AWS CodeConnection, and revalidate the private-EKS CodeBuild-runner and CPU path without unsafe state assumptions.

**Architecture:** Reusable child modules are grouped by technical domain, deployable root modules live under `foundations`, and JSON/backend configuration lives under `environments`. A separate GitHub-integration state owns one CodeConnection; the private-delivery foundation consumes its sensitive output and the private-network state. Migration preserves backend keys and Terraform addresses, while protected workflows separate source validation, read-only inventory, plan, apply, owner handshake, and runtime evidence.

**Tech Stack:** Terraform, native Terraform tests, AWS CloudFormation bootstrap, AWS CodeConnections, AWS CodeBuild-hosted GitHub Actions runners, GitHub Actions OIDC and protected Environments, Amazon EKS, Bash, jq, TypeScript `node:test`, JSON Schema-compatible validation, CloudWatch.

**Spec:** `docs/superpowers/specs/2026-09-06-yy-50-terraform-structure-and-codeconnections-design.md`

## Global Constraints

- Branches use `feature/`, `docs/`, or `ci/`; never use the `codex/` prefix.
- Public documentation contains no employer/customer names, account IDs, private ARNs, subnet IDs, endpoints, credentials, prompts, or Terraform state.
- `_private/` notes remain ignored and uncommitted.
- Use `apply_patch` for file edits and isolated git worktrees for implementation.
- `bootstrap/cloudformation` owns only Terraform prerequisites and dedicated OIDC roles; Terraform owns platform resources.
- `modules` contains child modules only; `foundations` contains deployable root modules; `environments` contains no `.tf` files.
- Preserve all existing backend state keys, module block names, and resource addresses during source relocation.
- Do not combine directory relocation with state-key migration, `terraform state mv`, import, taint, untaint, or resource deletion.
- A destroyed or empty state uses sanitised before/after plan parity; a populated unchanged state requires no-op or separately reviewed drift evidence.
- No account-level CodeBuild credential, PAT, OAuth fallback, `ImportSourceCredentials`, CodePipeline, or temporary public EKS API.
- Every AWS mutation, GitHub Environment mutation, PR merge, paid apply, and deletion remains behind its own exact approval.
- No teardown is executed in this plan without a later, separate reviewed plan and exact user confirmation.
- ARC, GPU, Kueue, HyperPod, and Slurm are excluded from the first repeated runtime path.

---

### Task 1: Add the Terraform layout migration contract

**Files:**
- Create: `providers/aws/infra/terraform/layout-migration.json`
- Create: `providers/aws/app/api/tests/terraformRepositoryLayout.test.ts`
- Modify: `.github/workflows/terraform-tests.yaml`
- Modify: `docs/architecture/architecture-library.md`

**Interfaces:**
- Consumes: the exact current-to-target mapping in the approved spec.
- Produces: a machine-readable migration manifest and repository contract used by every later relocation task.

- [ ] **Step 1: Write the failing repository-layout test**

Create a `node:test` test that requires these top-level target layers and parses
the migration manifest:

```ts
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");
const terraformRoot = resolve(repoRoot, "providers/aws/infra/terraform");

test("Terraform layout migration is explicit and state safe", async () => {
  const manifest = JSON.parse(
    await readFile(resolve(terraformRoot, "layout-migration.json"), "utf8"),
  ) as {
    version: number;
    preserveStateKeys: boolean;
    preserveResourceAddresses: boolean;
    mappings: Array<{
      kind: "bootstrap" | "module" | "foundation";
      from: string;
      to: string;
      stateKey: string | null;
      status: "legacy" | "migrated";
    }>;
  };

  assert.equal(manifest.version, 1);
  assert.equal(manifest.preserveStateKeys, true);
  assert.equal(manifest.preserveResourceAddresses, true);
  assert.equal(manifest.mappings.length, 17);
  assert.equal((await stat(resolve(terraformRoot, "modules"))).isDirectory(), true);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --dir providers/aws/app/api test
```

Expected: FAIL because `layout-migration.json` does not exist.

- [ ] **Step 3: Add the exact JSON migration manifest**

Set `version`, both preservation booleans, and the 17 mappings from the spec.
Every root mapping must retain its current backend suffix, including:

```json
{
  "kind": "foundation",
  "from": "envs/eks-private-runner",
  "to": "foundations/private-eks-delivery",
  "stateKey": "eks-private-runner/terraform.tfstate",
  "status": "legacy"
}
```

Do not include account IDs, bucket names, role ARNs, resource IDs, or secrets.

- [ ] **Step 4: Make Terraform CI discover paths from the manifest**

Add a pre-matrix job that uses `jq` to select only `module` and `foundation`
mappings, emits the `from` path for `legacy` and the `to` path for `migrated`,
and feeds those implemented paths to the Terraform test matrix. Do not include
the bootstrap mapping or list the same root twice.

- [ ] **Step 5: Run repository and Terraform source tests**

Run:

```bash
pnpm --dir providers/aws/app/api test
terraform fmt -check -recursive providers/aws/infra/terraform
git diff --check
```

Expected: API tests PASS, formatting PASS, and no whitespace errors.

- [ ] **Step 6: Commit Task 1**

```bash
git add providers/aws/infra/terraform/layout-migration.json providers/aws/app/api/tests/terraformRepositoryLayout.test.ts .github/workflows/terraform-tests.yaml docs/architecture/architecture-library.md
git commit -m "test: define Terraform layout migration contract"
```

---

### Task 2: Add read-only existing-resource inventory before migration

**Files:**
- Create: `scripts/discover-terraform-runtime-inventory.sh`
- Create: `scripts/tests/test-discover-terraform-runtime-inventory.sh`
- Create: `.github/workflows/terraform-runtime-inventory.yml`
- Modify: `.github/workflows/terraform-tests.yaml`
- Modify: `docs/practices/current-status.md`
- Create: `_private/docs/notes/yy-50-pre-migration-runtime-inventory-2026-09-06.md` (ignored; never commit)

**Interfaces:**
- Consumes: exact known state suffixes and expected resource names/tags; protected read-only OIDC roles.
- Produces: Boolean/count-only evidence for legacy public EKS, private network, private runner, private EKS, and GPU capacity.

- [ ] **Step 1: Write a failing shell contract test**

The test must use a fake `aws` executable and fixture JSON to prove the script:

```bash
test "$(jq -r '.legacy_public_eks_present' "$evidence")" = "false"
test "$(jq -r '.private_eks_present' "$evidence")" = "false"
test "$(jq -r '.raw_identifiers_published' "$evidence")" = "false"
! grep -Eq 'arn:aws:|subnet-|vpc-|[0-9]{12}' "$evidence"
```

Also assert that the script contains none of:

```text
delete
destroy
apply
import
state rm
taint
untaint
```

- [ ] **Step 2: Run the shell test and verify RED**

Run:

```bash
bash scripts/tests/test-discover-terraform-runtime-inventory.sh
```

Expected: FAIL because the discovery script does not exist.

- [ ] **Step 3: Implement read-only scoped discovery**

Use only list/describe and read-only backend operations. Query the exact known
names/tags, convert raw responses immediately into local booleans/counts, and
delete no state or resource. The final artifact schema is:

```json
{
  "legacy_public_eks_present": false,
  "private_network_present": false,
  "private_runner_present": false,
  "private_eks_present": false,
  "gpu_capacity_present": false,
  "state_api_consistent": true,
  "unexpected_scope_detected": false,
  "raw_identifiers_published": false
}
```

- [ ] **Step 4: Add a protected inventory workflow**

The workflow has `contents: read`, `id-token: write`, environment
`aws-private-eks`, a single `discover` mode, and no Terraform apply/destroy
command. Upload only the sanitised JSON for seven days.

- [ ] **Step 5: Run local tests and open the inventory PR**

Run:

```bash
bash scripts/tests/test-discover-terraform-runtime-inventory.sh
pnpm --dir providers/aws/app/api test
git diff --check
```

Expected: all tests PASS. Open a PR but do not approve its Environment run or
merge without the separate user gates.

- [ ] **Step 6: After merge, run and record read-only inventory**

Run only after Environment approval. Record the run URL and Boolean evidence in
the ignored private note. If state and API disagree, stop the complete plan and
diagnose; do not continue to Task 3.

---

### Task 3: Relocate the CloudFormation bootstrap source

**Files:**
- Move: `providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml` to `providers/aws/infra/bootstrap/cloudformation/github-oidc-terraform-backend.yaml`
- Modify: `.github/workflows/update-aws-bootstrap.yml`
- Modify: `.github/workflows/terraform-tests.yaml`
- Modify: `providers/aws/app/api/tests/privateEksReferenceArchitectureDocumentation.test.ts`
- Modify: all current runbooks/indexes that treat the old path as operational

**Interfaces:**
- Consumes: the existing deployed CloudFormation stack and unchanged template logical IDs.
- Produces: a clearer source location with no stack or logical-resource change.

- [ ] **Step 1: Change path-contract tests first**

Point `bootstrapTemplatePath` and workflow grep contracts at
`bootstrap/cloudformation/github-oidc-terraform-backend.yaml`, then run the API
suite and verify it fails because the file has not moved.

- [ ] **Step 2: Move the template and update every executable reference**

Use `git mv`; do not alter any logical resource ID, parameter, output, metadata,
or policy document in this task. Update workflow, tests, current runbooks, and
architecture indexes together.

- [ ] **Step 3: Validate source equivalence**

Run:

```bash
pipx run cfn-lint providers/aws/infra/bootstrap/cloudformation/github-oidc-terraform-backend.yaml
pnpm --dir providers/aws/app/api test
git diff --check
```

Expected: all PASS. The staged diff must show one rename plus path-only edits.

- [ ] **Step 4: Commit Task 3**

```bash
git add providers/aws/infra/bootstrap .github/workflows/update-aws-bootstrap.yml .github/workflows/terraform-tests.yaml providers/aws/app/api/tests docs
git commit -m "refactor: separate CloudFormation bootstrap source"
```

---

### Task 4: Build the GitHub CodeConnection module and foundation with TDD

**Files:**
- Create: `providers/aws/infra/terraform/modules/integrations/github-codeconnection/main.tf`
- Create: `providers/aws/infra/terraform/modules/integrations/github-codeconnection/variables.tf`
- Create: `providers/aws/infra/terraform/modules/integrations/github-codeconnection/outputs.tf`
- Create: `providers/aws/infra/terraform/modules/integrations/github-codeconnection/versions.tf`
- Create: `providers/aws/infra/terraform/modules/integrations/github-codeconnection/github_codeconnection.tftest.hcl`
- Create: `providers/aws/infra/terraform/foundations/github-integration/{backend.s3.tf,main.tf,variables.tf,outputs.tf,versions.tf,github_integration.tftest.hcl}`
- Create: `providers/aws/infra/terraform/environments/sandbox/ap-southeast-2/github-integration.tfvars.json`
- Create: `providers/aws/infra/terraform/environments/sandbox/ap-southeast-2/github-integration.s3.tfbackend`

**Interfaces:**
- Consumes: non-secret connection name, provider `GitHub`, common tags, and the existing backend.
- Produces: sensitive `connection_arn`, non-sensitive provider/status contracts, and isolated `github-integration/terraform.tfstate` ownership.

- [ ] **Step 1: Write failing native Terraform tests**

Assert the provider and lifecycle boundary:

```hcl
mock_provider "aws" {}

run "plans_one_github_connection" {
  command = plan

  variables {
    connection_name = "cloudai-platform-github"
    provider_type    = "GitHub"
  }

  assert {
    condition     = aws_codeconnections_connection.github.provider_type == "GitHub"
    error_message = "The integration must use the GitHub provider."
  }
}
```

Add negative variable tests for an empty name, non-GitHub provider, and any
repository token/key input. The public module interface contains no credential.

- [ ] **Step 2: Verify RED**

Run:

```bash
terraform -chdir=providers/aws/infra/terraform/modules/integrations/github-codeconnection init -backend=false
terraform -chdir=providers/aws/infra/terraform/modules/integrations/github-codeconnection test
```

Expected: FAIL because the module implementation is missing.

- [ ] **Step 3: Implement the minimal module**

Create exactly one `aws_codeconnections_connection` with provider `GitHub`,
common tags, and an output marked `sensitive = true`. Do not add CodeBuild,
webhook, PAT, OAuth, Secrets Manager, CodePipeline, or repository resources.

- [ ] **Step 4: Implement the root foundation and value-only configuration**

The root calls `module "github_connection"` and owns the unchanged backend
suffix `github-integration/terraform.tfstate`. JSON contains only connection
name, provider, project/environment tags, and region. Backend configuration
contains no credential.

- [ ] **Step 5: Add environment/repository contracts**

Extend the TypeScript layout test to recursively prove:

```ts
assert.equal(environmentFiles.some((file) => file.endsWith(".tf")), false);
assert.equal(JSON.stringify(environmentJson).match(/token|private.?key|secret/i), null);
```

- [ ] **Step 6: Run module, foundation, API, formatting, and secret tests**

Expected: all PASS; no connection ARN or account ID appears in fixtures.

- [ ] **Step 7: Commit Task 4**

```bash
git add providers/aws/infra/terraform/modules/integrations providers/aws/infra/terraform/foundations/github-integration providers/aws/infra/terraform/environments providers/aws/app/api/tests
git commit -m "feat: add isolated GitHub CodeConnection foundation"
```

---

### Task 5: Add the dedicated connection role and protected lifecycle workflow

**Files:**
- Modify: `providers/aws/infra/bootstrap/cloudformation/github-oidc-terraform-backend.yaml`
- Modify: `.github/workflows/update-aws-bootstrap.yml`
- Create: `.github/workflows/terraform-github-integration.yml`
- Modify: `.github/workflows/terraform-tests.yaml`
- Create: `docs/solutions/github-codeconnection-runbook.md`

**Interfaces:**
- Consumes: existing GitHub OIDC provider, backend bucket/table, exact repository/environment trust conditions.
- Produces: dedicated integration Terraform role output and protected `source-validate`, `plan`, `apply`, and `status-validate` modes.

- [ ] **Step 1: Write failing bootstrap and workflow contract tests**

Tests must require a dedicated logical role/output, exact GitHub environment
trust, connection-only IAM actions, isolated backend key, no destroy mode, and
an apply confirmation of `I_UNDERSTAND_GITHUB_CODECONNECTION_APPLY`.

- [ ] **Step 2: Verify RED**

Run the focused shell/grep contracts and the API suite. Expected: FAIL because
the role, workflow, and output do not exist.

- [ ] **Step 3: Add least-privilege bootstrap identity**

Permit the integration role to access only its backend key and lock row and to
create/tag/get/delete only the named CodeConnection required by Terraform.
Deletion remains inaccessible from the workflow because it has no destroy mode;
the IAM delete action exists only for Terraform lifecycle ownership and requires
a later dedicated teardown design before use.

- [ ] **Step 4: Implement the lifecycle workflow**

`source-validate` has no AWS credential. `plan` uploads Boolean/change-count
evidence only. `apply` creates a fresh plan, rejects delete/replacement, requires
the exact confirmation, and expects `PENDING` or `AVAILABLE`. `status-validate`
calls `get-connection` on the Terraform output and publishes only:

```json
{"connection_present":true,"provider_is_github":true,"connection_available":true,"raw_identifiers_published":false}
```

- [ ] **Step 5: Validate and commit Task 5**

Run cfn-lint, workflow YAML parsing, Terraform tests, API tests, and
`git diff --check`. Commit:

```bash
git commit -m "ci: add protected GitHub connection lifecycle"
```

Stop after PR review. Do not create a CloudFormation change set or connection
until the design PR and implementation PR have their separate merge approvals.

---

### Task 6: Migrate networking and private-delivery source paths

**Files:**
- Move: `modules/private-network` to `modules/networking/private-network`
- Move: `modules/private-egress` to `modules/networking/private-egress`
- Move: `modules/private-runner` to `modules/delivery/codebuild-github-runner`
- Move: `envs/eks-private-network` to `foundations/private-eks-network`
- Move: `envs/eks-private-runner` to `foundations/private-eks-delivery`
- Create/update: sandbox JSON and `.s3.tfbackend` files for both foundations
- Modify: private-network/runner workflows, tests, current docs, and manifest

**Interfaces:**
- Consumes: unchanged state keys plus the GitHub-integration and network remote-state outputs.
- Produces: relocated private networking/delivery roots and CodeBuild source-level `CODECONNECTIONS` auth.

- [ ] **Step 1: Capture sanitised pre-move plan summaries**

For each root, record only address/action categories and counts. If runtime
inventory proves the state is empty, expected creates remain legitimate; if
populated, record the existing no-op/drift baseline. Never upload raw plans.

- [ ] **Step 2: Change path tests first and verify RED**

Update the test constants and workflow contracts to the target paths. Expected:
FAIL because source has not moved.

- [ ] **Step 3: Move modules and foundations without renaming Terraform blocks**

Use `git mv`, adjust relative module sources, and keep backend suffixes:

```text
eks-private-network/terraform.tfstate
eks-private-runner/terraform.tfstate
```

- [ ] **Step 4: Replace account-level auth with targeted remote state**

Add `data "terraform_remote_state" "github_integration"` to
`private-eks-delivery`. Set runner source auth to `CODECONNECTIONS` and pass the
sensitive connection ARN. Remove the `NONE` branch and account-level singleton
discovery.

- [ ] **Step 5: Scope connection access in the CodeBuild service role**

Add only `codeconnections:GetConnection` and
`codeconnections:GetConnectionToken` on the exact connection ARN. Do not use
`Resource = "*"`. Add native tests that inspect the decoded policy and fail on
wildcard connection access.

- [ ] **Step 6: Replace auth-discover with targeted status preflight**

Validate provider `GitHub`, current region, and status `AVAILABLE` before
Terraform plan. Publish Boolean evidence only. Remove
`codebuild:ListSourceCredentials` from the bootstrap role in a separately
reviewable CloudFormation change.

- [ ] **Step 7: Run source tests and post-move plan parity**

Run all module/root tests and compare sanitised post-move summaries with the
Task 6 baseline. Expected: matching address/action categories and no move-caused
delete/replacement.

- [ ] **Step 8: Commit Task 6**

```bash
git commit -m "refactor: separate private networking and delivery foundations"
```

---

### Task 7: Migrate compute, AI, governance, and GPU source paths

**Files:**
- Move: `modules/network` to `modules/networking/public-sandbox-network`
- Move: `modules/eks` to `modules/compute/eks`
- Move: `modules/eks-gpu-kueue` to `modules/compute/gpu-kueue`
- Move: `modules/bedrock-access` to `modules/ai/bedrock-access`
- Move: `modules/cost-guardrails` to `modules/governance/cost-guardrails`
- Move all remaining `envs/*` implemented roots to their approved `foundations/*` paths
- Modify all executable workflow, test, README, architecture, runbook, and index references

**Interfaces:**
- Consumes: the migration manifest and unchanged backend state suffixes.
- Produces: the complete domain-oriented module tree and foundation root tree.

- [ ] **Step 1: Migrate public/private EKS compute sources**

Change tests first, move `network`, `eks`, `eks-sandbox`, and
`eks-private-sandbox`, update references, and run Terraform/API tests. Preserve
the root module block names `network` and `eks`.

- [ ] **Step 2: Migrate Bedrock and AgentCore sources**

Move `bedrock-access`, `bedrock-sandbox`, and `agentcore-rag-sandbox`; update
image-build workflows and every current operational `terraform -chdir` command.
Do not change deployed resource definitions in the same commits.

- [ ] **Step 3: Migrate cost-governance sources**

Move module/root paths, keep the existing budget state key, and rerun native
tests plus protected-workflow contract tests. Do not change budget amounts.

- [ ] **Step 4: Migrate GPU source without running GPU capacity**

Move module/root paths and update source tests only. Do not run a remote GPU
plan or apply in this structural task.

- [ ] **Step 5: Remove empty placeholders and child-module lockfiles**

After `rg` proves no references, remove empty module directories and tracked
`.terraform.lock.hcl` files from child modules. Keep one lock file per deployed
foundation and regenerate it through reviewed CI when provider constraints
require an update.

- [ ] **Step 6: Enforce the final repository contract**

The TypeScript test must recursively assert:

- no `.tf` file beneath `terraform/environments`;
- no `backend` block beneath `terraform/modules`;
- no implemented root beneath legacy `terraform/envs`;
- every manifest mapping is `migrated`;
- every current workflow path exists;
- no duplicate foundation owns a backend suffix.

- [ ] **Step 7: Run the full source suite and commit domain-sized changes**

Use separate commits for compute, AI, governance, and GPU. Run API tests,
Terraform matrix, TFLint in Linux CI, YAML parsing, secret scan, and
`git diff --check` after every commit.

---

### Task 8: Execute protected connection and private-EKS runtime revalidation

**Files:**
- Update after evidence: `docs/practices/current-status.md`
- Update after evidence: `docs/solutions/github-codeconnection-runbook.md`
- Update after evidence: `docs/solutions/vpc-connected-runner-runbook.md`
- Update after evidence: `docs/architecture/private-eks-reference-architecture.md`
- Create: `_private/docs/notes/yy-50-terraform-restructure-runtime-revalidation-2026-09-06.md` (ignored; never commit)

**Interfaces:**
- Consumes: merged source, exact protected environment values, reviewed budgets, and explicit approvals at every mutation gate.
- Produces: metadata-safe proof of connection, ephemeral CodeBuild runner, and private-EKS CPU runtime behaviour.

- [ ] **Step 1: Plan and apply only the dedicated integration OIDC role**

Create a non-executing CloudFormation change set, inspect every action and
replacement field, then stop. Execute only after the user supplies the exact
change-set name with the bootstrap confirmation phrase.

- [ ] **Step 2: Run GitHub-integration source validation and plan**

Require source tests and a connection-only plan. Stop if any CodeBuild, VPC,
EKS, NAT, endpoint, ARC, or GPU resource appears.

- [ ] **Step 3: Apply the CodeConnection after its exact approval**

Run a fresh no-delete plan and apply the saved plan. Expected initial state:
`PENDING`. Do not call this ready.

- [ ] **Step 4: Pause for the one interactive GitHub owner handshake**

The user authorises AWS Connector for GitHub and selects only
`afaryy/cloudai-platform`. No other console-created resource is permitted.

- [ ] **Step 5: Validate connection status**

Run `status-validate`; require all four evidence booleans to be true. If pending
or wrong-provider, stop before private-delivery plan.

- [ ] **Step 6: Reconcile private-network runtime state**

Use the Task 2 inventory result. If absent, create a new protected plan and cost
review; if present, require no-op or separately reviewed drift. Do not infer
that worker scale-to-zero means NAT/endpoints are absent.

- [ ] **Step 7: Plan, apply, and validate the CodeBuild runner**

Require the exact connection, private subnets, security group, CloudWatch logs,
and approved egress. Execute only after the runner-specific exact apply phrase.

- [ ] **Step 8: Run one real ephemeral runner smoke**

Trigger a workflow with the exact label:

```text
codebuild-<project-name>-<github.run_id>-<github.run_attempt>
```

Require one runner start, one job completion, runner termination, no public API
fallback, and metadata-only evidence.

- [ ] **Step 9: Revalidate private EKS with CPU desired size zero, then one**

Plan and apply the private control plane only after budget review. Validate
endpoint/egress first, then activate one CPU worker and run the existing
digest-pinned synthetic CPU smoke. ARC and GPU remain disabled.

- [ ] **Step 10: Reconcile claims and preserve deletion gate**

Update current docs only with observed evidence. Record continuing costs and
the existing teardown plan, but do not execute deletion without its later exact
confirmation.

---

### Task 9: Final architecture and evidence consistency review

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture/architecture.md`
- Modify: `docs/architecture/architecture-library.md`
- Modify: `docs/architecture/private-eks-reference-architecture.md`
- Modify: `docs/solutions/featured-solutions.md`
- Modify: `docs/practices/current-status.md`
- Test: `providers/aws/app/api/tests/privateEksReferenceArchitectureDocumentation.test.ts`
- Test: `providers/aws/app/api/tests/terraformRepositoryLayout.test.ts`

**Interfaces:**
- Consumes: merged source and verified runtime evidence.
- Produces: one consistent public architecture narrative and an accurate implementation-status boundary.

- [ ] **Step 1: Make documentation tests fail on legacy operational paths**

Require current docs to link only to `modules`, `foundations`, and
`environments`. Permit old paths only inside explicitly labelled historical
records.

- [ ] **Step 2: Update architecture diagrams and descriptions**

Show CloudFormation bootstrap, GitHub-integration state, private-network state,
private-delivery state, private-EKS state, Environment configuration, and later
ARC/GPU boundaries. Do not claim ARC/GPU runtime completion.

- [ ] **Step 3: Run complete verification**

Run:

```bash
pnpm --dir providers/aws/app/api test
terraform fmt -check -recursive providers/aws/infra/terraform
bash scripts/tests/test-discover-terraform-runtime-inventory.sh
git diff --check
```

Then require every GitHub PR check, Terraform matrix entry, TFLint job, secret
scan, and documentation contract to pass.

- [ ] **Step 4: Perform claim audit**

Verify public wording distinguishes `designed`, `source implemented`,
`deployed`, and `runtime validated`. Verify no account ID, ARN, subnet/VPC ID,
endpoint, token, state, customer data, or private note is tracked.

- [ ] **Step 5: Commit final documentation alignment**

```bash
git add README.md docs providers/aws/app/api/tests
git commit -m "docs: align Terraform foundations and runtime evidence"
```
