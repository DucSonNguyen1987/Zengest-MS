import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuModule } from './menu/menu.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Base de données dédiée au menu — séparée des autres services
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/menu-db',
    ),

    MenuModule,
  ],
})
export class AppModule {}
