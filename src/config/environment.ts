export function validateEnvironment(environment: Record<string, unknown>) {
  const rawPort = environment.PORT ?? '3000';

  if (typeof rawPort !== 'string' || !/^\d+$/.test(rawPort)) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const databaseUrl = environment.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL is required');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (
    !['postgresql:', 'postgres:'].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname
  ) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  return { ...environment, PORT: port, DATABASE_URL: databaseUrl };
}
