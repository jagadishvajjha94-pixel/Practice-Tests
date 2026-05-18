/** True on Vercel / AWS Lambda — child_process compilers are not available. */
export function isServerlessHost(): boolean {
  return (
    process.env.CODING_FORCE_REMOTE === '1' ||
    process.env.VERCEL === '1' ||
    process.env.VERCEL === 'true' ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_EXECUTION_ENV)
  );
}
