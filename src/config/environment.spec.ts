import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const databaseUrl =
    'postgresql://test_user:test_password@localhost:5432/test_db';

  it('defaults PORT to 3000', () => {
    expect(validateEnvironment({ DATABASE_URL: databaseUrl })).toEqual({
      PORT: 3000,
      DATABASE_URL: databaseUrl,
    });
  });

  it.each(['1', '4000', '65535'])('parses PORT=%s', (port) => {
    expect(
      validateEnvironment({ PORT: port, DATABASE_URL: databaseUrl }).PORT,
    ).toBe(Number(port));
  });

  it.each(['', '0', '-1', '65536', '3000.5', '3e3', 'abc', '3000abc', 3000])(
    'rejects invalid PORT=%s',
    (port) => {
      expect(() =>
        validateEnvironment({ PORT: port, DATABASE_URL: databaseUrl }),
      ).toThrow('PORT must be an integer between 1 and 65535');
    },
  );

  it.each([undefined, '', '   '])(
    'rejects missing DATABASE_URL=%s',
    (databaseUrl) => {
      expect(() => validateEnvironment({ DATABASE_URL: databaseUrl })).toThrow(
        'DATABASE_URL is required',
      );
    },
  );

  it.each(['not-a-url', 'https://localhost/test_db', 'postgresql:///test_db'])(
    'rejects invalid DATABASE_URL=%s without exposing its value',
    (databaseUrl) => {
      expect(() => validateEnvironment({ DATABASE_URL: databaseUrl })).toThrow(
        'DATABASE_URL must be a valid PostgreSQL URL',
      );
    },
  );

  it('accepts the postgres protocol', () => {
    const url = 'postgres://test_user:test_password@localhost:5432/test_db';
    expect(validateEnvironment({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });
});
