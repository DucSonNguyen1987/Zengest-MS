import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // createMicroservice() au lieu de create() pour configurer le microservice avec NATS et pas HTTP
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS, // Utiliser NATS comme transport
      options: {
        servers: [process.env.NATS_URL || 'nats://localhost:4222'], // Adresse du serveur NATS
        // NATS gère le routage automatiquement via les sujets, donc pas besoin de configurer des routes spécifiques ici
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprimer les propriétés non définies dans les DTO
      transform: true, // Covertit automatiquement les types
    }),
  );

  await app.listen(); // Démarrer le microservice pour écouter les messages NATS
  console.log(" Order Service connecté à NATS et à l'écoute");
  console.log(` NATS URL: ${process.env.NATS_URL || 'nats://localhost:4222'}`);
}
bootstrap().catch((err) => {
  console.error(' Order Service pas connecté :', err);
  process.exit(1);
});
