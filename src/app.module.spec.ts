import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';

describe('Application startup', () => {
  it('initializes and closes the Nest application', async () => {
    const database = {
      onModuleInit: jest.fn(() => Promise.resolve()),
      onModuleDestroy: jest.fn(() => Promise.resolve()),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(database)
      .compile();
    const app = moduleRef.createNestApplication();

    try {
      await expect(app.init()).resolves.toBe(app);
      expect(database.onModuleInit).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
    expect(database.onModuleDestroy).toHaveBeenCalledTimes(1);
  });
});
