import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationDocument } from './schemas/reservation.schema';

@Controller()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // MessagePattern('sujet')-> s'abonne au sujet NATS 'reservations.create'
  // Quand la gateway fait client.send('reservations.create, data)
  // cette méthode est appelée avec les données en paramètres

  @MessagePattern('reservations.create')
  async createReservation(
    @Payload() data: CreateReservationDto,
  ): Promise<ReservationDocument> {
    // @Payload() extrait le corps du message NATS (équivalent de @Body en HTTP)
    console.log('📨 NATS reçu sur reservations.create :', data);

    // La valeur retournée est renvoyée à la Gateway via NATS
    // => Pattern Request/Reply de NATS
    return await this.reservationsService.createReservation(data);
  }

  @MessagePattern('reservations.findAll')
  findAll(@Payload() data: { limit?: number; skip?: number }) {
    // data peut être vide si la gateway n'envoie pas de payload
    return this.reservationsService.findAll(data.limit, data.skip);
  }

  @MessagePattern('reservations.findByCustomer')
  findByCustomer(@Payload() data: { customerId: string }) {
    return this.reservationsService.findByCustomer(data.customerId);
  }

  @MessagePattern('reservations.findById')
  findById(@Payload() data: { id: string }) {
    return this.reservationsService.findById(data.id);
  }

  @MessagePattern('reservations.update')
  update(@Payload() data: { id: string } & UpdateReservationDto) {
    //On destructure pour séparer l'identifiant des champs à mettre à jour
    const { id, ...updateData } = data;
    return this.reservationsService.update(id, updateData);
  }

  @MessagePattern('reservations.updateStatus')
  updateStatus(
    @Payload()
    data: {
      id: string;
      status: string;
      updatedBy: string;
      requesterId: string;
      requesterRole: string;
    },
  ): Promise<ReservationDocument> {
    return this.reservationsService.updateStatus(
      data.id,
      data.status,
      data.updatedBy,
      data.requesterId,
      data.requesterRole,
    );
  }
}
