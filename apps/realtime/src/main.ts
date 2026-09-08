import { NestFactory } from '@nestjs/core';
import { RealtimeModule } from './realtime.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(RealtimeModule);
  app.enableCors({ origin: true });
  app.enableShutdownHooks();
  await app.listen(process.env.REALTIME_PORT ?? 3003);
}
void bootstrap();
