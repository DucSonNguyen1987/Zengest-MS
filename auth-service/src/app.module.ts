import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // ConfigModule charge le .env et rend les variables accessibles partout
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Connexion MongoDB — base séparée de l'order-service
    // Chaque microservice a SA propre base de données (principe d'isolation)
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-db',
    ),

    AuthModule,
  ],
})
export class AppModule {}
