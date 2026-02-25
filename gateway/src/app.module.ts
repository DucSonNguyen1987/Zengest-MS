import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), OrdersModule, AuthModule],
  providers: [
    /**
     * APP_GUARD applique le JwtAuthGuard sur TOUTES les routes de la gateway.
     * Par défaut toutes les routes sont protégées.
     * Pour rendre une route publique : ajouter @Public() sur le handler.
     */
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    /**
     * RolesGuard vérifie les rôles après que JwtAuthGuard a validé le token.
     * Il lit le décorateur @Roles(...) sur les routes.
     */
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
