/** True when running on AWS stack (RDS + S3 + NextAuth JWT). */
export function useAwsStack(): boolean {
  return process.env.USE_AWS_STACK !== 'false' && process.env.USE_PRISMA_AUTH !== 'false';
}
