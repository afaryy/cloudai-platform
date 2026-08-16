# AgentCore Governed RAG POC Controls

This directory contains public-safe, example-only deployment inputs for the
synthetic AgentCore RAG POC. It is not a record of a deployed environment.

## Safety gates

- Fixed region: `ap-southeast-2`.
- Synthetic/self-authored source content only.
- Read-only retrieval only; tools, writes, browser access, code execution, and
  durable memory are excluded.
- Gateway-only Runtime access and citations-or-abstention response behaviour.
- The preflight script is read-only. Deployment and teardown each require their
  own exact confirmation value and must be separately approved by the operator.

Run no deployment command until preflight and the implementation design have
been reviewed. The command files intentionally avoid identifiers, endpoints,
credentials, and raw request/response content.
