import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NatsService {
  constructor(
    // On injecte le client Nats enregistré dans le module
    // sous le token 'ORDER_SERVICE'
    @Inject('ORDER_SERVICE') private readonly client: ClientProxy,
  ) {}

  /** Méthode générique pour envoyer un message NATS
   * et attendre une réponse typée.
   *  Le générique <T> permet à TS de svoir quel type de domnnées
   *   sera retourné par le microservice.
   *
   * @param pattern => le sujet NATS à publier
   * @param data => les données à envoyer au microservice
   * @returns une Promise typée avec le résultat attendu
   */
  async send<T>(pattern: string, data: unknown): Promise<T> {
    /** this.client.send() retourne un Observable<unknown>
     * firstValueFrom() convertit cet Observable en Promise<T>,
     * Et on caste le résultat vers le type T attendu.
     */
    return firstValueFrom(this.client.send<T>(pattern, data));
  }
}
