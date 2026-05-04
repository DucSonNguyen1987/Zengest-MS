import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // createMicroservice() pour indiquer à NestJS de ne pas créer de serveur HTTP
  // Le service ne sera uniquement joignable via NATS
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      // on utilise NATS comme "réseau interne"
      transport: Transport.NATS,
      options: {
        // L'URL NATS vient d'une variable d'environnement
        // En local : nats://localhost:4222
        // En Docker: nats://nats:4222
        servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      },
    },
  );

  // ValidationPipe global : valide automatiquement tous les Payload() des controllers
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs non déclarés dans les DTOs
      transform: true, // convertit automatiquement les types
    }),
  );
  // Démarre l'écoute NATS mais sans port HTTP
  await app.listen();

  console.log("✅ Reservation Service connecté à NATS et à l'écoute");
  console.log(` NATS URL : ${process.env.NATS_URL || 'nats://localhost:4222'}`);
}
bootstrap().catch((err) => {
  console.error('❌ Reservation Service pas connecté :', err);
  process.exit(1); // arrêt propre si NATS n'est pas disponible
});
