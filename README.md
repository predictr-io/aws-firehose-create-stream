# AWS Firehose Create Stream

A GitHub Action to create AWS Kinesis Data Firehose delivery streams for testing purposes. Simplified for test workflows - creates streams without complex destination configuration.

## Features

- **Create streams** - Create Firehose delivery streams for testing
- **Skip if exists** - Optionally succeed without error if stream already exists
- **Tags** - Support for stream tagging
- **Simple integration** - Easy to use in test workflows

## Prerequisites

Configure AWS credentials before using this action.

### Option 1: AWS Credentials (Production)

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/my-github-actions-role
    aws-region: us-east-1
```

### Option 2: LocalStack (Testing)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      localstack:
        image: localstack/localstack
        ports:
          - 4566:4566
        env:
          SERVICES: firehose
    steps:
      - name: Create stream in LocalStack
        uses: predictr-io/aws-firehose-create-stream@v0
        env:
          AWS_ENDPOINT_URL: http://localhost:4566
          AWS_ACCESS_KEY_ID: test
          AWS_SECRET_ACCESS_KEY: test
          AWS_DEFAULT_REGION: us-east-1
        with:
          stream-name: 'test-stream'
```

## Usage

### Create Stream

```yaml
- name: Create Firehose stream
  uses: predictr-io/aws-firehose-create-stream@v0
  with:
    stream-name: 'my-test-stream'
```

### Create Stream with Skip-If-Exists

```yaml
- name: Create stream (idempotent)
  uses: predictr-io/aws-firehose-create-stream@v0
  with:
    stream-name: 'my-stream'
    skip-if-exists: 'true'
```

### Create Stream with Tags

```yaml
- name: Create tagged stream
  uses: predictr-io/aws-firehose-create-stream@v0
  with:
    stream-name: 'my-stream'
    tags: |
      {
        "Environment": "test",
        "Team": "backend"
      }
```

## Inputs

### Required Inputs

| Input | Description |
|-------|-------------|
| `stream-name` | Firehose delivery stream name (1-64 characters) |

### Optional Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `skip-if-exists` | If `true`, succeed without error if stream already exists | `false` |
| `tags` | Stream tags as JSON object | - |

## Outputs

| Output | Description |
|--------|-------------|
| `stream-arn` | ARN of the created Firehose delivery stream |
| `created` | Whether the stream was newly created (`true`) or already existed (`false`) |

## License

MIT

## Contributing

Contributions welcome! Please submit a Pull Request.
