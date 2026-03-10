import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen();
  console.log("✅ Menu Service connecté à NATS et à l'écoute");
  console.log(` NATS URL : ${process.env.NATS_URL || 'nats://localhost:4222'}`);
}

bootstrap().catch((err) => {
  console.error('❌ Menu Service pas connecté :', err);
  process.exit(1);
});
