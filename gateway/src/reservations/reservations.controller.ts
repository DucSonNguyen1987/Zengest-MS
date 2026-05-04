import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { NatsService } from 'src/orders/nats.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/guards/jwt-auth.guard';
import {
  Reservation,
  ReservationListResponse,
} from './interfaces/reservation.interface';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly natsService: NatsService) {}

  /**
   * POST /reservations
   * Accessible aux clients et au staff
   * Le customerId est extrait depuis le JWT si absent du body
   * createdby toujours forcé depuis le JWT
   */

  @Post()
  @Roles('Client', 'Staff_salle', 'Manager', 'Owner', 'Admin')
  async createReservation(
    @Body() body: CreateReservationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Reservation> {
    // On publie sur NATS - le NatsService route vers RESERVATION_SERVICE
    return this.natsService.send('reservations.create', {
      ...body,
      customerId: body.customerId || user.sub, // fallback sur le JWT
      createdBy: user.sub, // toujours depuis le JWT
    });
  }

  /**
   * GET /reservations - lister toutes les réservations
   * Réservé au staff (Les clients utilisent GET /reservations/my)
   */

  @Get()
  @Roles('Staff_salle', 'Manager', 'Owner', 'Admin')
  async findAll(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<ReservationListResponse> {
    return this.natsService.send<ReservationListResponse>(
      'reservations.findAll',
      {
        limit: limit ? parseInt(limit) : 20,
        skip: skip ? parseInt(skip) : 0,
      },
    );
  }

  /**
   * GET /reservations/my -> réservations du client
   * Le customerId est extrait du JWT -> le client ne peut voir que ses réservations
   * Cette route doit être avant /:id sinon Express l'interpréterait comme un id
   */

  @Get('my')
  @Roles('Client', 'Staff_salle', 'Manager', 'Owner', 'Admin')
  async findMy(@CurrentUser() user: JwtPayload): Promise<Reservation[]> {
    return this.natsService.send<Reservation[]>('reservations.findByCustomer', {
      customerId: user.sub,
    });
  }

  /**
   * GET /reservations/customer/:customerId -> réservations d'un client spécifique
   * Un client ne peut voir que SES réservations (forcé par le JWT)
   * Le staff peut voir celles de n'importe quel client
   */

  @Get('customer/:customerId')
  @Roles('Client', 'Staff-salle', 'Manager', 'Owner', 'Admin')
  async findByCustomer(
    @Param('customerid') customerId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Reservation[]> {
    // Si le rôle est Client, on ignore le param et on force son propre id
    const targetId = user.role === 'Client' ? user.sub : customerId;
    return this.natsService.send<Reservation[]>('reservations.findByCustomer', {
      customerId: targetId,
    });
  }

  /**
   * GET /reservations::id -> détail d'une réservation par son _id MongoDB
   */

  @Get(':id')
  @Roles('Client', 'Staff_salle', 'Manager', 'Owner', 'Admin')
  async findbyId(@Param('id') id: string): Promise<Reservation> {
    return this.natsService.send<Reservation>('reservations.findById', { id });
  }

  /**
   * PATCH /reservations/:id -> modifier date, numberOfGuests ou notes
   * updatedBy injecté automatiquement depuis le JWT
   */

  @Patch(':id')
  @Roles('Client', 'Staff_salle', 'Manager', 'Owner', 'Admin')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateReservationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Reservation> {
    return this.natsService.send<Reservation>('reservations;update', {
      id,
      ...body,
      updatedBy: user.sub, // tracé automatiquement pour l'audit
      requesterId: user.sub,
      resquesterRole: user.role,
    });
  }

  /**
   * PATCH /reservations/:id/status -> changer le statut d'une réservation
   * Réservé au staff -> un client ne peut pas confirmer ou annuler lui même
   */

  @Patch(':id/status')
  @Roles('Client', 'Staff_salle', 'Manager', 'Owner', 'Admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateReservationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Reservation> {
    return this.natsService.send<Reservation>('reservations.updateStatus', {
      id,
      ...body,
      updatedBy: user.sub,
      requesterid: user.sub,
      requesterRole: user.role,
    });
  }
}
