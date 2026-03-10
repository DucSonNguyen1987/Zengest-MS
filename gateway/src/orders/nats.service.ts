import { Injectable, Inject, HttpStatus, HttpException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError } from 'rxjs';

@Injectable()
export class NatsService {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('MENU_SERVICE') private readonly menuClient: ClientProxy,
  ) {}

  /**
   * Envoie un message NATS au bon service selon le préfixe du pattern.
   * - Pattern commençant par 'auth-' → AUTH_SERVICE
   * - Pattern commençant par 'menu-' → MENU_SERVICE
   * - Tous les autres               → ORDER_SERVICE
   */
  async send<T>(pattern: string, data: unknown): Promise<T> {
    const client = this.getClient(pattern);
    return firstValueFrom(
      client.send<T>(pattern, data).pipe(
        catchError((error: unknown) => {
          // L'erreur NATS contient statusCode et message
          const err = error as Record<string, unknown>;
          const status: number =
            typeof err?.statusCode === 'number'
              ? err.statusCode
              : HttpStatus.INTERNAL_SERVER_ERROR;
          const message: string =
            typeof err?.message === 'string' ? err.message : 'Erreur interne';
          return throwError(() => new HttpException(message, status));
        }),
      ),
    );
  }

  /**
   * Sélectionne le bon client NATS selon le préfixe du pattern.
   * Centralisé ici pour éviter la duplication dans chaque méthode.
   */
  private getClient(pattern: string): ClientProxy {
    if (pattern.startsWith('auth-')) return this.authClient;
    if (pattern.startsWith('menu-')) return this.menuClient;
    return this.orderClient;
  }
}
