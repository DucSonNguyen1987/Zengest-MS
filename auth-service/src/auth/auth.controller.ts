import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import {
  AuthResponse,
  AuthTokens,
  JwtPayload,
} from '../users/interfaces/user.interface';

/** AuthController écoute les messages NATS envoyés par la Gateway
 * sujet : 'auth.<action>
 */

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // auth.register => inscription d'un new user
  @MessagePattern('auth-register')
  async register(@Payload() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  // auth.login => connexion d'un user
  @MessagePattern('auth-login')
  async login(@Payload() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  /**  auth.refresh => renouvellement de l'access token
   * Refresh token extrait du cookie HttpOnly par la Gateway
   * avant d'être envoyé ici via NATS.
   */

  @MessagePattern('auth-refresh')
  async refresh(
    @Payload() data: { refreshToken: string },
  ): Promise<AuthTokens> {
    return this.authService.refresh(data.refreshToken);
  }

  /** auth.logout => Déconnexion du user (révocation du refresh token)
   *  userId est extrait du JWT par le JwtAuthGuard de la Gateway.
   */

  @MessagePattern('auth-logout')
  async logout(
    @Payload() data: { userId: string },
  ): Promise<{ message: string }> {
    await this.authService.logout(data.userId);
    return { message: 'Déconnexion réussie' };
  }

  /** auth.verify => validation d'un access token
   * Retourne le payload du token si valide, lève une exception sinon.
   */

  @MessagePattern('auth-verify')
  async verify(@Payload() data: { token: string }): Promise<JwtPayload> {
    return this.authService.verify(data.token);
  }
}
