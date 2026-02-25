import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import type {
  IUserModel,
  JwtPayload,
  AuthResponse,
  AuthTokens,
} from '../users/interfaces/user.interface';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    // IUserModel pour avoir accès aux méthodes statiques (findByEmail, findActiveUsers)
    @InjectModel(User.name) private readonly userModel: IUserModel,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Inscription d'un nouvel utilisateur.
   * 1. Vérifie que l'email n'est pas déjà utilisé
   * 2. Crée le document User (le hook pre('save') hashera le mot de passe)
   * 3. Génère les tokens JWT
   * 4. Stocke le hash du refresh token en BDD
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Vérifier si l'email existe déjà — on utilise findOne (pas findByEmail)
    // car on n'a pas besoin du passwordHash ici
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      // 409 Conflict — email déjà utilisé
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    // Créer le document User
    // On passe le password en clair dans passwordHash —
    // le hook pre('save') va automatiquement le hasher avant la sauvegarde
    const user = new this.userModel({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash: dto.password, // sera hashé par le hook pre('save')
      role: dto.role, // undefined = défaut CLIENT du schéma
      phone: dto.phone,
    });

    // Générer les tokens avant le save pour stocker le refreshTokenHash
    const tokens = await this.generateTokens(user);

    // Hasher le refresh token avant de le stocker en BDD
    // (même principe que le password — jamais en clair)
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

    // save() déclenche le hook pre('save') → passwordHash est hashé ici
    await user.save();

    return {
      tokens,
      user: {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Connexion d'un utilisateur existant.
   * 1. Trouve l'utilisateur par email (avec passwordHash réinclu)
   * 2. Vérifie le mot de passe avec bcrypt.compare()
   * 3. Vérifie que le compte est actif
   * 4. Génère de nouveaux tokens et met à jour le refreshTokenHash en BDD
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // findByEmail() est notre méthode statique qui réinclut passwordHash
    const user = await this.userModel.findByEmail(dto.email);

    // Message générique volontairement — ne pas indiquer si c'est l'email ou le mot de passe
    // qui est incorrect (évite l'énumération des comptes)
    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Vérifier que le compte n'est pas suspendu
    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte a été désactivé');
    }

    // comparePassword() est notre méthode d'instance (définie dans user.schema.ts)
    // Elle appelle bcrypt.compare() en interne
    const isPasswordValid = await user.comparePassword(dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Générer de nouveaux tokens à chaque login (rotation des tokens)
    const tokens = await this.generateTokens(user);

    // Mettre à jour le refreshTokenHash en BDD
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await user.save();

    return {
      tokens,
      user: {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Renouvellement de l'access token via le refresh token.
   * 1. Vérifie que le refresh token est valide (signature JWT)
   * 2. Trouve l'utilisateur en BDD
   * 3. Vérifie que le refresh token correspond au hash stocké
   * 4. Génère de nouveaux tokens (rotation)
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      // Vérifier la signature du refresh token avec JWT_REFRESH_SECRET
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Récupérer l'utilisateur avec son refreshTokenHash (select: false → on le réinclut)
      const user = await this.userModel
        .findById(payload.sub)
        .select('+refreshTokenHash');

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Refresh token invalide');
      }

      // Vérifier que le refresh token reçu correspond au hash stocké en BDD
      // bcrypt.compare() compare le token en clair avec le hash
      const isRefreshValid = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash,
      );
      if (!isRefreshValid) {
        throw new UnauthorizedException('Refresh token invalide');
      }

      // Générer de nouveaux tokens (rotation — l'ancien refresh token est invalidé)
      const tokens = await this.generateTokens(user);

      // Mettre à jour le hash en BDD avec le nouveau refresh token
      user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
      await user.save();

      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Déconnexion — révocation du refresh token.
   * On met refreshTokenHash à null → le token ne peut plus être utilisé
   * même s'il n'est pas encore expiré (révocation immédiate).
   */
  async logout(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshTokenHash: null,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFY — utilisé par la Gateway pour valider un token entrant
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Vérifie qu'un access token est valide et retourne son payload.
   * Appelé par la Gateway via NATS sur le sujet 'auth.verify'
   * pour chaque requête protégée.
   */
  verify(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTHODE PRIVÉE — génération des tokens
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Génère un access token (court) et un refresh token (long).
   * Méthode privée — utilisée uniquement en interne par register/login/refresh.
   *
   * Access Token  : contient userId + email + role → 15 min
   * Refresh Token : contient uniquement userId → 7 jours
   */
  private async generateTokens(user: UserDocument): Promise<AuthTokens> {
    // Payload de l'access token — le minimum nécessaire pour identifier l'utilisateur
    const accessPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    // Payload du refresh token — uniquement l'id (moins d'infos = moins de risques)
    const refreshPayload = {
      sub: user._id.toString(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      // Access token signé avec JWT_SECRET, expire dans 15m
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<StringValue>('JWT_EXPIRES_IN'),
      }),
      // Refresh token signé avec JWT_REFRESH_SECRET (clé différente !), expire dans 7j
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<StringValue>(
          'JWT_REFRESH_EXPIRES_IN',
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
