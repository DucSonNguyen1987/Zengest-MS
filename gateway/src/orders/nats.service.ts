import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NatsService {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  /**
   * Envoie un message NATS au bon service selon le préfixe du pattern.
   * - Pattern commençant par 'auth.' → AUTH_SERVICE
   * - Tous les autres → ORDER_SERVICE
   */
  async send<T>(pattern: string, data: unknown): Promise<T> {
    const client = pattern.startsWith('auth.')
      ? this.authClient
      : this.orderClient;

    return firstValueFrom(client.send<T>(pattern, data));
  }
}
