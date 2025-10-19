# Paralegal

To run this locally, you would need to have docker running for the localstack setup. This also requries the aws cli, jq, and terraform to be installed.
If you are using windows, you can use `git bash` to run `./scripts/setup-localstack.sh`, on macOS and linux this shouldnt be an issue.

#### Some useful aws cli commands

- export aws local creds: `export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test`
- or if using powershell: 
```
  $env:AWS_ACCESS_KEY_ID = "test"
  $env:AWS_SECRET_ACCESS_KEY = "test"
  $env:AWS_DEFAULT_REGION = "ap-south-1"
```
- list all buckets: `aws --endpoint-url=http://localhost:4566 s3 ls`

To install dependencies:

```bash
bun install
````

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.9. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
