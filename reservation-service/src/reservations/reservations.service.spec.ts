import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Reservation } from './schemas/reservation.schema';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

/**
 * Mock du modèle Mongoose
 * - findOne()           → vérification doublon dans createReservation()
 * - findById()          → findById(), update(), updateStatus()
 * - findByIdAndUpdate() → update(), updateStatus()
 * - countDocuments()    → findAll()
 * - find()              → findAll(), findByCustomer()
 *
 * Particularité de ce service :
 * - .lean() est utilisé → retourne un objet JS simple, pas un Document Mongoose
 * - findById() et find() sont chaînés avec .lean() directement (pas .exec())
 * - findByIdAndUpdate() retourne directement une Promise (pas de chaîne)
 */

type MockReservationModel = jest.Mock & {
  findOne: jest.Mock;
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  countDocuments: jest.Mock;
};

const mockSave = jest.fn();

const mockReservationModel = jest.fn().mockImplementation(() => ({
  save: mockSave,
})) as MockReservationModel;

describe('ReservationsService', () => {
  let service: ReservationsService;

  beforeEach(async () => {
    /** Réinitialisation des méthodes statiques entre chaque test
     * (nécessaire car jest.clearAllMocks() ne réinitialise pas les implémentations)
     */
    mockReservationModel.findOne = jest.fn();
    mockReservationModel.find = jest.fn();
    mockReservationModel.findById = jest.fn();
    mockReservationModel.findByIdAndUpdate = jest.fn();
    mockReservationModel.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getModelToken(Reservation.name),
          useValue: mockReservationModel,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  /** createReservation()
   * - vérifie d'abord qu'il n'y a pas de doublon via findOne()
   * - puis instancie le modèle avec "new this.reservationModel()" et appelle .save()
   *
   * Mocks nécessaires :
   * - findOne → null (pas de doublon)
   * - mockSave → la réservation créée
   */
  describe('createReservation()', () => {
    const validDto: CreateReservationDto = {
      customerId: 'customer-abc',
      ressourceId: 'T1',
      date: '2026-06-15T19:30:00.000Z',
      numberOfGuests: 4,
      notes: 'Anniversaire',
      createdBy: 'customer-abc',
    };

    it('devrait créer une réservation avec le statut PENDING', async () => {
      // ARRANGE
      mockReservationModel.findOne.mockResolvedValue(null);
      mockSave.mockResolvedValue({
        _id: 'res-123',
        status: 'PENDING',
        ...validDto,
        date: new Date(validDto.date),
      });

      // ACT
      const result = await service.createReservation(validDto);

      // ASSERT
      expect(result.status).toBe('PENDING');
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('devrait lever ConflictException si le créneau est déjà réservé', async () => {
      // ARRANGE - findOne() retourne une réservation existante → doublon
      mockReservationModel.findOne.mockResolvedValue({
        _id: 'res-existant',
        ressourceId: 'T1',
        status: 'CONFIRMED',
      });

      // ASSERT
      await expect(service.createReservation(validDto)).rejects.toThrow(
        ConflictException,
      );

      // save() ne doit pas être appelé si doublon détecté
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('devrait vérifier le doublon avec les bons critères', async () => {
      // ARRANGE
      mockReservationModel.findOne.mockResolvedValue(null);
      mockSave.mockResolvedValue({ _id: 'res-123', status: 'PENDING' });

      // ACT
      await service.createReservation(validDto);

      // ASSERT - vérifier que findOne est appelé avec les bons filtres MongoDB
      expect(mockReservationModel.findOne).toHaveBeenCalledWith({
        ressourceId: 'T1',
        date: new Date(validDto.date),
        status: { $in: ['PENDING', 'CONFIRMED'] },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  /** findAll()
   * - utilise Promise.all() avec find().sort().limit().skip().lean()
   *   et countDocuments()
   *
   * Mocks nécessaires :
   * - find → { sort → { limit → { skip → { lean → résultat } } } }
   * - countDocuments → nombre total
   */
  describe('findAll()', () => {
    it('devrait retourner les réservations avec le total', async () => {
      // ARRANGE
      const mockReservations = [
        { _id: 'res-1', status: 'PENDING' },
        { _id: 'res-2', status: 'CONFIRMED' },
      ];

      mockReservationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockReservations),
            }),
          }),
        }),
      });
      mockReservationModel.countDocuments.mockResolvedValue(2);

      // ACT
      const result = await service.findAll(20, 0);

      // ASSERT
      expect(result.reservations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });

    it('devrait utiliser les valeurs par défaut limit=20 skip=0', async () => {
      // ARRANGE
      mockReservationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockReservationModel.countDocuments.mockResolvedValue(0);

      // ACT
      const result = await service.findAll();

      // ASSERT
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  /** findByCustomer()
   * - utilise find({ customerId }).sort().lean()
   *
   * Mock nécessaire : find → { sort → { lean → résultat } }
   */
  describe('findByCustomer()', () => {
    it("devrait retourner les réservations d'un client", async () => {
      // ARRANGE
      const mockReservations = [
        { _id: 'res-1', customerId: 'customer-abc' },
        { _id: 'res-2', customerId: 'customer-abc' },
      ];

      mockReservationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockReservations),
        }),
      });

      // ACT
      const result = await service.findByCustomer('customer-abc');

      // ASSERT
      expect(mockReservationModel.find).toHaveBeenCalledWith({
        customerId: 'customer-abc',
      });
      expect(result).toHaveLength(2);
    });

    it("devrait retourner un tableau vide si le client n'a pas de réservation", async () => {
      // ARRANGE
      mockReservationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      // ACT
      const result = await service.findByCustomer('client-inconnu');

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  /** findById()
   * - utilise findById(id).lean()
   * - lève NotFoundException si null
   *
   * Mock nécessaire : findById → { lean → résultat }
   */
  describe('findById()', () => {
    it('devrait retourner la réservation si elle existe', async () => {
      // ARRANGE
      const mockReservation = { _id: 'res-123', status: 'PENDING' };

      mockReservationModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockReservation),
      });

      // ACT
      const result = await service.findById('res-123');

      // ASSERT
      expect(mockReservationModel.findById).toHaveBeenCalledWith('res-123');
      expect(result._id).toBe('res-123');
    });

    it('devrait lever NotFoundException si la réservation est introuvable', async () => {
      // ARRANGE - lean() retourne null → réservation introuvable
      mockReservationModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // ASSERT
      await expect(service.findById('res-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("devrait inclure l'id dans le message d'erreur", async () => {
      // ARRANGE
      mockReservationModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // ASSERT
      await expect(service.findById('res-999')).rejects.toThrow(
        'Réservation res-999 introuvable',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  /** update()
   * - Si Client : vérifie d'abord via findById() que la réservation lui appartient
   * - puis findByIdAndUpdate() pour la MAJ
   *
   * Mocks nécessaires :
   * - findById → réservation (pour vérification propriétaire si Client)
   * - findByIdAndUpdate → réservation mise à jour
   */
  describe('update()', () => {
    it('devrait mettre à jour la réservation pour le staff sans vérification propriétaire', async () => {
      // ARRANGE - staff → findById() ne doit pas être appelé
      const updateData: UpdateReservationDto = {
        numberOfGuests: 6,
        updatedBy: 'staff-abc',
        requesterId: 'staff-abc',
        requesterRole: 'Staff_salle',
      };

      mockReservationModel.findByIdAndUpdate.mockResolvedValue({
        _id: 'res-123',
        numberOfGuests: 6,
        status: 'PENDING',
      });

      // ACT
      const result = await service.update('res-123', updateData);

      // ASSERT
      expect(mockReservationModel.findById).not.toHaveBeenCalled();
      expect(result.numberOfGuests).toBe(6);
    });

    it('devrait autoriser un client à modifier SA propre réservation', async () => {
      // ARRANGE - customerId === requesterId → autorisé
      const updateData: UpdateReservationDto = {
        numberOfGuests: 5,
        updatedBy: 'customer-abc',
        requesterId: 'customer-abc',
        requesterRole: 'Client',
      };

      // findById() → même customerId que requesterId ✅
      mockReservationModel.findById.mockResolvedValue({
        _id: 'res-123',
        customerId: 'customer-abc',
      });

      mockReservationModel.findByIdAndUpdate.mockResolvedValue({
        _id: 'res-123',
        numberOfGuests: 5,
      });

      // ACT
      const result = await service.update('res-123', updateData);

      // ASSERT
      expect(result.numberOfGuests).toBe(5);
    });

    it("devrait lever ForbiddenException si un client modifie la réservation d'un autre", async () => {
      // ARRANGE - customerId différent du requesterId → interdit
      const updateData: UpdateReservationDto = {
        numberOfGuests: 5,
        updatedBy: 'customer-abc',
        requesterId: 'customer-abc',
        requesterRole: 'Client',
      };

      mockReservationModel.findById.mockResolvedValue({
        _id: 'res-123',
        customerId: 'autre-customer', // ← pas le même client
      });

      // ASSERT
      await expect(service.update('res-123', updateData)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockReservationModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('devrait lever NotFoundException si la réservation est introuvable', async () => {
      // ARRANGE - findByIdAndUpdate retourne null
      const updateData: UpdateReservationDto = {
        numberOfGuests: 5,
        updatedBy: 'staff-abc',
        requesterId: 'staff-abc',
        requesterRole: 'Staff_salle',
      };

      mockReservationModel.findByIdAndUpdate.mockResolvedValue(null);

      // ASSERT
      await expect(service.update('res-999', updateData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  /** updateStatus()
   * - Si Client : vérifie qu'il ne peut qu'annuler (status === 'CANCELLED')
   *   et que la réservation lui appartient via findById()
   * - puis findByIdAndUpdate() pour la MAJ
   */
  describe('updateStatus()', () => {
    it('devrait mettre à jour le statut pour le staff', async () => {
      // ARRANGE
      mockReservationModel.findByIdAndUpdate.mockResolvedValue({
        _id: 'res-123',
        status: 'CONFIRMED',
      });

      // ACT
      const result = await service.updateStatus(
        'res-123',
        'CONFIRMED',
        'staff-abc',
        'staff-abc',
        'Staff_salle',
      );

      // ASSERT
      expect(result.status).toBe('CONFIRMED');
      expect(mockReservationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'res-123',
        { status: 'CONFIRMED', updatedBy: 'staff-abc' },
        { new: true },
      );
    });

    it('devrait autoriser un client à annuler SA propre réservation', async () => {
      // ARRANGE
      mockReservationModel.findById.mockResolvedValue({
        _id: 'res-123',
        customerId: 'customer-abc',
      });

      mockReservationModel.findByIdAndUpdate.mockResolvedValue({
        _id: 'res-123',
        status: 'CANCELLED',
      });

      // ACT
      const result = await service.updateStatus(
        'res-123',
        'CANCELLED',
        'customer-abc',
        'customer-abc',
        'Client',
      );

      // ASSERT
      expect(result.status).toBe('CANCELLED');
    });

    it('devrait lever ForbiddenException si un client tente de confirmer une réservation', async () => {
      // ARRANGE - un client ne peut qu'annuler (CANCELLED)
      // Pas besoin de mocker findById() — la vérification du statut est faite avant

      // ASSERT
      await expect(
        service.updateStatus(
          'res-123',
          'CONFIRMED', // ← statut interdit pour un client
          'customer-abc',
          'customer-abc',
          'Client',
        ),
      ).rejects.toThrow(ForbiddenException);

      // findById et findByIdAndUpdate ne doivent pas être appelés
      expect(mockReservationModel.findById).not.toHaveBeenCalled();
      expect(mockReservationModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("devrait lever ForbiddenException si un client annule la réservation d'un autre", async () => {
      // ARRANGE
      mockReservationModel.findById.mockResolvedValue({
        _id: 'res-123',
        customerId: 'autre-customer', // ← pas le même client
      });

      // ASSERT
      await expect(
        service.updateStatus(
          'res-123',
          'CANCELLED',
          'customer-abc',
          'customer-abc',
          'Client',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockReservationModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('devrait lever NotFoundException si la réservation est introuvable', async () => {
      // ARRANGE - findByIdAndUpdate retourne null
      mockReservationModel.findByIdAndUpdate.mockResolvedValue(null);

      // ASSERT
      await expect(
        service.updateStatus(
          'res-999',
          'CONFIRMED',
          'staff-abc',
          'staff-abc',
          'Staff_salle',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});