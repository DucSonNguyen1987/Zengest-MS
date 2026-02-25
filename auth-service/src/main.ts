import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // createMicroservice() — pas de serveur HTTP, uniquement NATS
  // Le auth-service n'est jamais appelé directement par le client
  // Il reçoit ses messages depuis la Gateway via NATS
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      },
    },
  );

  // whitelist: true  → supprime les champs non déclarés dans les DTOs
  // transform: true  → convertit automatiquement les types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen();
  console.log("✅ Auth Service connecté à NATS et à l'écoute");
  console.log(
    `   NATS URL : ${process.env.NATS_URL || 'nats://localhost:4222'}`,
  );
}

bootstrap().catch((err) => {
  console.error('❌ Auth Service pas connecté :', err);
  process.exit(1);
});
