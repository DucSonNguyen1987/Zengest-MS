import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestWithUser extends Request {
  user?: { role: string };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lire les rôles requis depuis les metadatas de la route
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucun rôle requis sur la route -> accès autorisé
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Récupérer le user injecté par JwtAuthGuard dans request.user
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    // Check que le rôle du user est dans la liste des rôles requis.
    return requiredRoles.includes(user?.role ?? '');
  }
}
