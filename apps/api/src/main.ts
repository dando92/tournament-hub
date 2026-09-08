import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { requestTimingHandler } from './observability/request-timing.middleware';
import { requestTimingEnabled } from './observability/request-timing.settings';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (requestTimingEnabled()) {
    app.use(requestTimingHandler());
  }

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API description')
    .setVersion('1.0')
    .addTag('api')
    .build();

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Confirm-Control-Room-Stop'],
    credentials: true,
  });


  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
