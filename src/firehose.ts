import {
  FirehoseClient,
  CreateDeliveryStreamCommand,
  CreateDeliveryStreamCommandInput,
  DescribeDeliveryStreamCommand,
  Tag
} from '@aws-sdk/client-firehose';
import * as core from '@actions/core';

export interface StreamConfig {
  streamName: string;
  skipIfExists: boolean;
  tags?: string; // JSON string
}

export interface StreamResult {
  success: boolean;
  streamArn?: string;
  created?: boolean;
  error?: string;
}

/**
 * Parse tags from JSON string to Firehose Tag format
 */
export function parseTags(tagsJson: string): Tag[] {
  try {
    const parsed = JSON.parse(tagsJson);
    const tags: Tag[] = [];

    for (const [key, value] of Object.entries(parsed)) {
      tags.push({
        Key: key,
        Value: String(value)
      });
    }

    return tags;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse tags: ${errorMessage}`);
  }
}

/**
 * Validate stream name
 */
export function validateStreamName(streamName: string): void {
  // Stream name must not be empty
  if (!streamName || streamName.trim().length === 0) {
    throw new Error('Stream name cannot be empty');
  }

  // Stream name can be 1-64 characters
  if (streamName.length > 64) {
    throw new Error(`Stream name exceeds maximum length of 64 characters (got ${streamName.length})`);
  }

  // Valid characters: alphanumeric, hyphens, underscores, periods
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  if (!validPattern.test(streamName)) {
    throw new Error(
      `Stream name "${streamName}" contains invalid characters. Only alphanumeric characters, hyphens, underscores, and periods are allowed.`
    );
  }
}

/**
 * Check if delivery stream already exists
 */
export async function checkStreamExists(
  client: FirehoseClient,
  streamName: string
): Promise<{ exists: boolean; streamArn?: string }> {
  try {
    const command = new DescribeDeliveryStreamCommand({
      DeliveryStreamName: streamName
    });
    const response = await client.send(command);

    if (response.DeliveryStreamDescription?.DeliveryStreamARN) {
      return {
        exists: true,
        streamArn: response.DeliveryStreamDescription.DeliveryStreamARN
      };
    }

    return { exists: false };
  } catch (error) {
    // ResourceNotFoundException means it doesn't exist
    if ((error as Error & { name?: string }).name === 'ResourceNotFoundException') {
      return { exists: false };
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Create a Firehose delivery stream (simplified for testing - no real destination)
 */
export async function createStream(
  client: FirehoseClient,
  config: StreamConfig
): Promise<StreamResult> {
  try {
    // Validate inputs
    validateStreamName(config.streamName);

    core.info(`Stream name: ${config.streamName}`);

    // Check if stream already exists
    const existsCheck = await checkStreamExists(client, config.streamName);

    if (existsCheck.exists) {
      if (config.skipIfExists) {
        core.info(`✓ Stream already exists: ${existsCheck.streamArn}`);
        core.info('Skip-if-exists is enabled, treating as success');

        return {
          success: true,
          streamArn: existsCheck.streamArn,
          created: false
        };
      } else {
        throw new Error(`Delivery stream "${config.streamName}" already exists. Set skip-if-exists=true to succeed when stream exists.`);
      }
    }

    core.info('Creating new delivery stream...');

    // Build command input with minimal S3 destination for testing
    // This creates a valid stream that can accept records
    const input: CreateDeliveryStreamCommandInput = {
      DeliveryStreamName: config.streamName,
      DeliveryStreamType: 'DirectPut',
      ExtendedS3DestinationConfiguration: {
        BucketARN: 'arn:aws:s3:::firehose-test-bucket', // Placeholder for testing
        RoleARN: 'arn:aws:iam::000000000000:role/firehose-test-role', // Placeholder for testing
        BufferingHints: {
          SizeInMBs: 1,
          IntervalInSeconds: 60
        }
      }
    };

    // Add tags if provided
    if (config.tags) {
      input.Tags = parseTags(config.tags);
      core.info(`Tags: ${input.Tags.length} tag(s)`);
    }

    // Create stream
    const command = new CreateDeliveryStreamCommand(input);
    const response = await client.send(command);

    if (!response.DeliveryStreamARN) {
      throw new Error('Stream creation returned no stream ARN');
    }

    core.info('✓ Stream created successfully');
    core.info(`Stream ARN: ${response.DeliveryStreamARN}`);

    return {
      success: true,
      streamArn: response.DeliveryStreamARN,
      created: true
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.error(`Failed to create stream: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage
    };
  }
}
