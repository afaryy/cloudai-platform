# P8c.1 Sanitized Bedrock Error Design

On a failed P8c runtime call, inspect the temporary AWS CLI stderr file locally and emit only an allowlisted category: `access-denied`, `validation-or-inference-profile-required`, `model-unavailable`, `throttled`, or `unknown`. Never print the raw error, prompt, response, ARN, account data, or temporary-file path. Preserve one-attempt invocation and temporary-file cleanup.
