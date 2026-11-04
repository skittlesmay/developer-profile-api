import { Test } from '@nestjs/testing';
import { PrismaService } from './database/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const database = {
    checkConnection: jest.fn(() => Promise.resolve()),
  };
  let controller: HealthController;

  beforeEach(async () => {
    database.checkConnection.mockReset();
    database.checkConnection.mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: database }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('reports success after checking the database', async () => {
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(database.checkConnection).toHaveBeenCalledTimes(1);
  });

  it('returns service unavailable without exposing database error details', async () => {
    database.checkConnection.mockRejectedValueOnce(
      new Error('Private database connection details'),
    );

    await expect(controller.check()).rejects.toMatchObject({
      response: {
        statusCode: 503,
        message: 'Database is unavailable',
      },
    });
  });
});
