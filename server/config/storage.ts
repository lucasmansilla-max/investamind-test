/**
 * Storage utilities for generating S3/R2 signed URLs
 * Supports both AWS S3 and Cloudflare R2 using AWS SDK v3
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

interface SignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
}

/**
 * Create S3 client from environment variables
 */
function createS3Client(): S3Client | null {
  const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_ENDPOINT } = env;

  if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    return null;
  }

  const config: any = {
    region: S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  };

  // Support Cloudflare R2 by using custom endpoint
  if (S3_ENDPOINT) {
    config.endpoint = S3_ENDPOINT;
    config.forcePathStyle = true; // Required for R2
  }

  return new S3Client(config);
}

// Singleton S3 client
let s3Client: S3Client | null = null;

/**
 * Get or create S3 client instance
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = createS3Client();
    if (!s3Client) {
      throw new Error('S3 client not configured. Please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.');
    }
  }
  return s3Client;
}

/**
 * Generate signed PUT URL and public URL for file uploads
 * @param contentType MIME type of the file (e.g., 'image/jpeg')
 * @returns Object containing uploadUrl (presigned PUT) and publicUrl
 */
export async function getSignedPutUrl(contentType: string): Promise<SignedUrlResult> {
  const bucket = env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET not configured');
  }

  const client = getS3Client();

  // Generate unique file key
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = contentType.split('/')[1] || 'bin';
  const key = `uploads/${timestamp}-${random}.${extension}`;

  // Create PUT command with content type
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  // Generate presigned URL (valid for 5 minutes)
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 300,
  });

  // Generate public URL
  const publicUrl = env.S3_ENDPOINT
    ? `${env.S3_ENDPOINT}/${bucket}/${key}`
    : `https://${bucket}.s3.${env.S3_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl };
}

/**
 * Generate a signed URL for downloading files from S3/R2
 * @param key File key/path in the bucket
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Signed URL for GET request
 */
export async function getSignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  const bucket = env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET not configured');
  }

  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a public URL for accessing files (no signing)
 * @param key File key/path
 * @returns Public URL
 */
export function getPublicUrl(key: string): string {
  const bucket = env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET not configured');
  }

  if (env.S3_ENDPOINT) {
    return `${env.S3_ENDPOINT}/${bucket}/${key}`;
  }

  return `https://${bucket}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

/**
 * Generate a unique file key for uploads
 * @param userId User ID
 * @param filename Original filename
 * @param prefix Optional prefix (e.g., 'avatars', 'posts')
 */
export function generateFileKey(userId: number, filename: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = filename.split('.').pop();
  const basePath = prefix ? `${prefix}/` : '';
  
  return `${basePath}${userId}/${timestamp}-${random}.${extension}`;
}
