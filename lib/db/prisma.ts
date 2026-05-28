export { prisma } from '@/lib/prisma';

export function isAwsDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.startsWith('postgresql'));
}
