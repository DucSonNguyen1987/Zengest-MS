import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reservation, ReservationDocument } from './schemas/reservation.schema';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    // @InjectModel() injecte le modèle Mongoose - Nestjs gère l'instance
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
  ) {}

  async createReservation(
    dto: CreateReservationDto,
  ): Promise<ReservationDocument> {
    // Check qu'il n'y a pas déjà une réservation active pour cette ressource
    // à la même date ( évite les doublons)
    const existing = await this.reservationModel.findOne({
      ressourceId: dto.ressourceId,
      date: new Date(dto.date),
      status: { $in: ['PENDING', 'CONFIRMED'] }, // états "actifs"
    });

    if (existing) {
      // ConflictException préféré car mieux propagé par NATS
      throw new ConflictException(
        `La ${dto.ressourceId} est déjà réservée pour ce créneau`,
      );
    }

    // new this.reservationModel() crée un document Mongoose en mémoire
    const reservation = new this.reservationModel({
      ...dto,
      date: new Date(dto.date), // conversion string-> date
    });
    return reservation.save(); // persiste en base
  }

  async findAll(limit = 20, skip = 0) {
    const [reservations, total] = await Promise.all([
      this.reservationModel
        .find()
        .sort({ date: -1 }) // les plus récenntes
        .limit(limit)
        .skip(skip)
        .lean(), // lean() retourne des objets JS simples
      this.reservationModel.countDocuments(),
    ]);
    return { reservations, total, limit, skip };
  }

  async findByCustomer(customerId: string): Promise<ReservationDocument[]> {
    return await this.reservationModel
      .find({ customerId })
      .sort({ date: -1 })
      .lean();
  }

  async findById(id: string): Promise<ReservationDocument> {
    const reservation = await this.reservationModel.findById(id).lean();

    if (!reservation) {
      throw new NotFoundException(`Réservation ${id} introuvable`);
    }
    return reservation;
  }

  async update(
    id: string,
    updateData: UpdateReservationDto,
  ): Promise<ReservationDocument> {
    const { updatedBy, requesterId, requesterRole, ...fieldsToUpdate } =
      updateData;

    // Un client ne peut modifier que SES propres réservations
    if (requesterRole === 'Client') {
      const reservation = await this.reservationModel.findById(id);

      if (!reservation) {
        throw new NotFoundException(`Réservation ${id} introuvable`);
      }
      if (reservation.customerId !== requesterId) {
        throw new ForbiddenException(
          'Vous ne pouvez modifier que vos propres réservations',
        );
      }
    }
    const updated = await this.reservationModel.findByIdAndUpdate(
      id,
      {
        ...fieldsToUpdate,
        updatedBy,
        // Si date fournie, on convertit en Date
        ...(fieldsToUpdate.date && { date: new Date(fieldsToUpdate.date) }),
      },
      { new: true }, // retourne le document après modification
    );

    if (!updated) {
      throw new NotFoundException(`Réservation ${id} introuvable`);
    }
    return updated;
  }

  async updateStatus(
    id: string,
    status: string,
    updatedBy: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<ReservationDocument> {
    // Un client ne peut qu'annuler
    if (requesterRole === 'Client' && status !== 'CANCELLED') {
      throw new ForbiddenException(
        "Un client ne peut qu'annuler une réservation",
      );
    }

    // Un client ne peut annuler que sa réservation
    if (requesterRole === 'Client') {
      const reservation = await this.reservationModel.findById(id);
      if (!reservation) {
        throw new NotFoundException(`Réservation ${id} introuvable`);
      }
      if (reservation.customerId !== requesterId) {
        throw new ForbiddenException(
          'Vous ne pouvez annuler que vos propres réservations',
        );
      }
    }
    const updated = await this.reservationModel.findByIdAndUpdate(
      id,
      { status, updatedBy },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Réservation ${id} introuvable`);
    }
    return updated;
  }
}
