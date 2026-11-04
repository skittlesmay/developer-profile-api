import { getTestDatabaseUrl } from './test-database';

describe('E2e database safety', () => {
  const database = 'postgresql://localhost/developer_profile';
  const testDatabase = 'postgresql://localhost/developer_profile_test';

  it('accepts an explicit separate test database', () => {
    expect(
      getTestDatabaseUrl({
        DATABASE_URL: database,
        TEST_DATABASE_URL: testDatabase,
      }),
    ).toBe(testDatabase);
  });

  it('accepts test configuration without an application URL in CI', () => {
    expect(getTestDatabaseUrl({ TEST_DATABASE_URL: testDatabase })).toBe(
      testDatabase,
    );
  });

  it.each([undefined, '', ' '])(
    'rejects missing TEST_DATABASE_URL=%s',
    (value) => {
      expect(() =>
        getTestDatabaseUrl({
          DATABASE_URL: database,
          TEST_DATABASE_URL: value,
        }),
      ).toThrow('TEST_DATABASE_URL is required');
    },
  );

  it.each(['not-a-url', 'https://localhost/developer_profile_test'])(
    'rejects invalid TEST_DATABASE_URL=%s',
    (value) => {
      expect(() => getTestDatabaseUrl({ TEST_DATABASE_URL: value })).toThrow(
        'TEST_DATABASE_URL must be a valid PostgreSQL URL',
      );
    },
  );

  it('refuses the application database', () => {
    expect(() => getTestDatabaseUrl({ TEST_DATABASE_URL: database })).toThrow(
      'The e2e database name must end with _test',
    );
  });

  it('rejects matching application/test databases even when the name ends with _test', () => {
    expect(() =>
      getTestDatabaseUrl({
        DATABASE_URL: testDatabase,
        TEST_DATABASE_URL: testDatabase,
      }),
    ).toThrow('The e2e database must differ');
  });

  it('rejects matching database names through a different localhost alias', () => {
    expect(() =>
      getTestDatabaseUrl({
        DATABASE_URL: testDatabase,
        TEST_DATABASE_URL: testDatabase.replace('localhost', '127.0.0.1'),
      }),
    ).toThrow('The e2e database must differ');
  });
});
