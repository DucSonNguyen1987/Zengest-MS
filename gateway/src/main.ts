import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Active CORS pour autoriser les requêtes depuis le frontend Vite
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true, // Nécessaire pour envoyer les cookies pour le refreshToken
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // cookie-parser permet de lire req.cookies dans les controllers
  // Nécessaire pour récupérer le refresh token depuis le cookie HttpOnly
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(3000);
  console.log('✅ Gateway démarrée sur le port 3000');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
