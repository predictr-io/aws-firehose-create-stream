import * as core from '@actions/core';
import { FirehoseClient } from '@aws-sdk/client-firehose';
import {
  createStream,
  StreamConfig
} from './firehose';

async function run(): Promise<void> {
  try {
    // Get inputs
    const streamName = core.getInput('stream-name', { required: true });
    const skipIfExistsStr = core.getInput('skip-if-exists') || 'false';
    const tags = core.getInput('tags') || undefined;

    core.info('AWS Firehose Create Stream');
    core.info(`Stream Name: ${streamName}`);

    // Early validation: Check stream name is not empty
    if (!streamName || streamName.trim().length === 0) {
      throw new Error('stream-name cannot be empty');
    }

    // Parse boolean values
    const skipIfExists = skipIfExistsStr.toLowerCase() === 'true';

    // Create Firehose client (uses AWS credentials from environment)
    const client = new FirehoseClient({});

    // Build configuration
    const config: StreamConfig = {
      streamName,
      skipIfExists,
      tags
    };

    // Create stream
    const result = await createStream(client, config);

    // Handle result
    if (!result.success) {
      throw new Error(result.error || 'Failed to create stream');
    }

    // Set outputs
    if (result.streamArn) {
      core.setOutput('stream-arn', result.streamArn);
    }

    if (result.created !== undefined) {
      core.setOutput('created', String(result.created));
    }

    // Summary
    core.info('');
    core.info('='.repeat(50));
    if (result.created) {
      core.info('Stream created successfully');
    } else {
      core.info('Stream already exists (skip-if-exists enabled)');
    }
    if (result.streamArn) {
      core.info(`Stream ARN: ${result.streamArn}`);
    }
    core.info('='.repeat(50));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(errorMessage);
  }
}

run();
