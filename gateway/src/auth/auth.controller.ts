import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NatsService } from '../orders/nats.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import type { Request, Response } from 'express';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  tokens: AuthTokens;
  user: Record<string, unknown>;
}

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly natsService: NatsService) {}

  /** POST /auth/register => inscription publique
   * @Public() => bypass le JwtAuthGuard
   * => Envoie les data à l'auth-service via NATS sur 'auth-register'
   */

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.natsService.send<AuthResult>(
      'auth-register',
      dto,
    );

    /** Place le refreshToken dans un cookie HttpOnly
     * -> inaccessible deupis JS ( protection XSS)
     * SameSite = Strict -> n'est pas envoyé depuis les requêtes cross-site (protection CSRF)
     * Secure => uniquement sur HTTPS ( à activer en prod)
     */
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7j en ms
      // secure : true,
    });

    /** Retourne uniquement l'accessToken et les infos user
     * Le refresh Token est dans le cookie
     */
    return res.json({
      accessToken: result.tokens.accessToken,
      user: result.user,
    });
  }

  /** POST /auth/login -> Connexion publique
   * @Public -> bypass le JwtAuthGuard
   */

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK) // POST Retourne par défaut 201, maison veut 200
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.natsService.send<AuthResult>('auth-login', dto);

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // secure: true,
    });

    return res.json({
      accessToken: result.tokens.accessToken,
      user: result.user,
    });
  }

  /** POST /auth/refresh => renouvellement du token
   * @Public() => pas de JWT requis
   * Le refresh token est lu depuis le cookie HttpOnly
   */

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res() res: Response) {
    // Lire le refresh token depuis le cookie (pas du body)
    const cookies = req.cookies as Record<string, string | undefined>;
    const refreshToken = cookies.refreshToken;
    if (!refreshToken) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Refresh token manquant' });
    }

    const tokens = await this.natsService.send<AuthTokens>('auth-refresh', {
      refreshToken,
    });

    // Renouveler le cookie avec le nouveau refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ accessToken: tokens.accessToken });
  }

  /** POST /auth/logout => déconnexion
   * Route protégée -> JwtAuthGuard injecte request.user
   * Le userId est extrait du payload JWT par le guard
   */

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    await this.natsService.send('auth-logout', { userId: req.user.sub });

    // Supprime le cookie refresh token
    res.clearCookie('refreshToken');

    return res.json({ message: 'Déconnexion réussie' });
  }
}
