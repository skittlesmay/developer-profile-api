import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('Application startup', () => {
  it('initializes and closes the Nest application', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication();

    try {
      await expect(app.init()).resolves.toBe(app);
    } finally {
      await app.close();
    }
  });
});
