import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    // Reflector permet de lire les métadonnées posées par les décorateurs
    // @Public, @Roles sur les routes.
    private readonly reflector: Reflector,
    // Client NATS pour envoyer le token à l'auth-service pour validation
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check si la route est marquée @Public()
    /** getAllAndOveride() cheche d'abord sur le handler (méthode)
     * puis sur la classe (controller) si pas trouvé sur la méthode.
     */

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Route publique -> on laisse passer sans vérifier le token
    if (isPublic) return true;

    // Extraire la requête HTTP
    const request = context.switchToHttp().getRequest<AuthRequest>();

    /** Extraire le Bearer token Authorization
     * Format attendu: "Authorization: Bearer eyJhbGc..."
     */
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      /** Envoyer le token à l'auth-service via NATS pour validation
       *  L'auth-service check la signature JWT et retourne le payload
       */
      const payload = await firstValueFrom(
        this.authClient.send<JwtPayload>('auth-verify', { token }),
      );

      /** Injecter le payload dans la request pour qu'il soit accessible
       * dans les controllers via @Raq() request.user
       * ou via un décorateur @CurrentUser() personnalisé
       */
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  /** Extrait le token Bearer du header Authorization.
   * Retourne undefined si le header est absent ou mal formaté.
   */

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    // Le header doit être de la forme "Bearer <token>"
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
