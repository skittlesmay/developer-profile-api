export function getTestDatabaseUrl(environment: NodeJS.ProcessEnv): string {
  const value = environment.TEST_DATABASE_URL;
  if (!value?.trim()) {
    throw new Error('TEST_DATABASE_URL is required for e2e tests');
  }

  let url: URL;
  let name: string;
  try {
    url = new URL(value);
    name = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!name.endsWith('_test')) {
    throw new Error('The e2e database name must end with _test');
  }
  if (environment.DATABASE_URL) {
    const application = new URL(environment.DATABASE_URL);
    if (name === decodeURIComponent(application.pathname.slice(1))) {
      throw new Error(
        'The e2e database must differ from the application database',
      );
    }
  }
  return value;
}
