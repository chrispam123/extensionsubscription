# Lambda Module

## Overview

This Terraform module packages and deploys the backend as an AWS Lambda function.
`payload.zip` is generated automatically by the `archive_file` data source during `terraform plan`/`apply` — it must **never** be committed to the repository.

## How `payload.zip` is generated

Terraform runs this block at plan/apply time:

```hcl
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = var.source_dir   # points to ../backend/build_lambda
  output_path = "${path.module}/payload.zip"
}
```

`payload.zip` is written to `infra/modules/lambda/payload.zip` locally and then uploaded to AWS Lambda.
This file is listed in `.gitignore` (`**/payload.zip`) and must stay out of version control.

## Before running `terraform apply`

Always build the Lambda bundle first so that `backend/build_lambda` contains the correct artefacts:

```bash
cd backend
npm run build:lambda
```

`build:lambda` does the following (see `backend/package.json`):

1. Compiles TypeScript → `backend/dist/`
2. Copies `dist/`, `node_modules/`, and **`package.json`** into `backend/build_lambda/`

> **Important:** `package.json` must be present at the root of `build_lambda` (and therefore at the root of `payload.zip`) so that Node.js recognises the code as an ES Module (`"type": "module"`).
> Omitting it causes the Lambda runtime to treat compiled `.js` files as CommonJS and throw:
> `SyntaxError: Cannot use import statement outside a module`

Then apply infrastructure:

```bash
cd ../infra
terraform apply
```

## Common pitfalls

| Mistake | Symptom | Fix |
|---|---|---|
| Deploying a stale `payload.zip` from the repo | Lambda fails with ESM/CJS error even though source code looks correct | Delete the local zip, run `build:lambda`, then `terraform apply` |
| Skipping `build:lambda` before `apply` | Zip is generated from an outdated `build_lambda/` (or missing `package.json`) | Always run `npm run build:lambda` in `backend/` before deploying |
| Committing `payload.zip` | Stale binary in repo can be deployed instead of a freshly built one | `payload.zip` is git-ignored — do not force-add it |
