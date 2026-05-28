import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.AWS_REGION ?? 'ap-south-1';
const bucket = process.env.AWS_S3_BUCKET ?? '';

let client: S3Client | null = null;

function getS3(): S3Client {
  if (!client) {
    client = new S3Client({
      region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return client;
}

export function isS3Configured(): boolean {
  return Boolean(bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export function proctorScreenshotKey(attemptId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `proctoring/${attemptId}/${Date.now()}-${safe}`;
}

export async function createProctorUploadUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; key: string; bucket: string }> {
  if (!bucket) throw new Error('AWS_S3_BUCKET is not configured');

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
    ServerSideEncryption: 'AES256',
  });

  const uploadUrl = await getSignedUrl(getS3(), command, {
    expiresIn: params.expiresInSeconds ?? 300,
  });

  return { uploadUrl, key: params.key, bucket };
}

export async function putObjectBuffer(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<void> {
  if (!bucket) throw new Error('AWS_S3_BUCKET is not configured');
  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ServerSideEncryption: 'AES256',
    }),
  );
}

export async function getSignedReadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (!bucket) throw new Error('AWS_S3_BUCKET is not configured');
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getS3(), command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  if (!bucket) return;
  await getS3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
