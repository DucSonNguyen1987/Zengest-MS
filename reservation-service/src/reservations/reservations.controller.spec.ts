import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

/**
 * Mock du service
 * Le controller ne contient pas de logique
 * -> il reçoit un message NATS et délègue au service.
 * On remplace donc le service entier par un objet de mocks pour vérifier que:
 * -> la bonne méthode du service est appelée
 * -> les bons paramètres lui sont passés
 *  Pas besoin de mocker Mongoose => le service est entièrement simulé
 */

const mockReservationService = {
  createReservation: jest.fn(),
  findAll: jest.fn(),
  findByCustomer: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
};

describe('ReservationsController', () => {
  let controller: ReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          // On fournit le mock à la place du vrai ReservationsService
          provide: ReservationsService,
          useValue: mockReservationService,
        },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  // Reset tous les mocks entre chaque test
  afterEach(() => jest.clearAllMocks());

  //Test basique
  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  /** @MessagePattern('reservations.create')
   * Le controller reçoit le payload NATS et le passe à createReservation().
   * On check que le payload est transmis sans modification.
   */

  describe('createReservation()-pattern NATS "reservations.create"', () => {
    it('devrait déléguer au service avec le payload NATS reçu', async () => {
      // ARRANGE
      const payload = {
        customerId: 'customer-abc',
        ressourceId: 'T1',
        date: '2026-06-15T19:30:00.000Z',
        numberOfGuests: 4,
        notes: 'Anniversaire',
        createdBy: 'customer-abc',
      };

      const expectedResult = {
        _id: 'reservation-123',
        status: 'PENDING',
        ...payload,
      };

      mockReservationService.createReservation.mockResolvedValue(
        expectedResult,
      );

      //ACT
      await controller.createReservation(payload);

      //ASSERT
      expect(mockReservationService.createReservation).toHaveBeenCalledWith(
        payload,
      );
      expect(mockReservationService.createReservation).toHaveBeenCalledTimes(1);
    });

    it("devrait propager l'erreur si le service échoue", async () => {
      // ARRANGE - le service lève une erreur (ex: créneau déja réservé)
      mockReservationService.createReservation.mockRejectedValue(
        new Error('Créneau déjà réservé'),
      );

      // ASSERT
      await expect(
        controller.createReservation({} as CreateReservationDto),
      ).rejects.toThrow('Créneau déjà réservé');
    });
  });

  /**
   * @MessagePattern('reservations.findAll')
   * Le controller transmet limit et skip au service
   * Valeurs par défaut: limit=20, skip=20
   */

  describe('findAll()- pattern NATS "reservations.findALL"', () => {
    it('devrait transmettre undefined au service si limit/skip absents du payload', async () => {
      //ARRANGE
      mockReservationService.findAll.mockResolvedValue({
        reservations: [],
        total: 0,
        limit: 20,
        skip: 0,
      });

      // ACT - Payload vide, cas réel possible avec NATS
      await controller.findAll({});

      // ASSERT - les valeurs par défaut du service doivent s'appliquer
      expect(mockReservationService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('devrait retourner ce que le service retourne', async () => {
      // ARRANGE
      const mockResult = {
        reservations: [{ _id: 'res-1' }, { _id: 'res-2' }],
        total: 2,
        limit: 20,
        skip: 0,
      };

      mockReservationService.findAll.mockResolvedValue(mockResult);

      // ACT
      const result = await controller.findAll({ limit: 20, skip: 0 });

      // ASSERT
      expect(result).toEqual(mockResult);
    });
  });

  /**
   * @MessagePattern('reservations.findByCustomer')
   * Le controller passe le customerId au service.
   */

  describe('findByCustomer() - pattern NATS "reservations.findByCustomer"', () => {
    it('devrait appeler le service avec le bon customerId', async () => {
      // ARRANGE
      mockReservationService.findByCustomer.mockResolvedValue([]);

      // ACT
      await controller.findByCustomer({ customerId: 'customer-abc' });

      // ASSERT
      expect(mockReservationService.findByCustomer).toHaveBeenCalledWith(
        'customer-abc',
      );
    });

    it('devrait retourner la liste des réservations du client', async () => {
      // ARRANGE
      const mockReservations = [
        { _id: 'res-1', customerId: 'customer-abc', status: 'PENDING' },
        { _id: 'res-2', customerId: 'customer-abc', status: 'CONFIRMED' },
      ];

      mockReservationService.findByCustomer.mockResolvedValue(mockReservations);

      // ACT
      const result = await controller.findByCustomer({
        customerId: 'customer-abc',
      });

      // ASSERT
      expect(result).toEqual(mockReservations);
    });
  });

  /**
   * @MessagePattern('reservations.findById')
   * Le controller passe l'id au service.
   */

  describe('findById() - pattern NATS "reservations.findById"', () => {
    it('devrait appeler le service avec le bon Id', async () => {
      // ARRANGE
      const mockReservation = { _id: 'res-123', status: 'PENDING' };
      mockReservationService.findById.mockResolvedValue(mockReservation);

      // ACT
      const result = await controller.findById({ id: 'res-123' });

      // ASSERT
      expect(mockReservationService.findById).toHaveBeenCalledWith('res-123');
      expect(result).toEqual(mockReservation);
    });

    it('devrait propager NotFoundException si la réservation est introuvable', async () => {
      // ARRANGE
      mockReservationService.findById.mockRejectedValue(
        new NotFoundException('Réservation res-999 introuvable'),
      );

      // ASSERT
      await expect(controller.findById({ id: 'res-999' })).rejects.toThrow(
        'Réservation res-999 introuvable',
      );
    });
  });

  /**
   * @MessagePattern('reservations.update')
   * Règle importante: le controller destructure le payload.
   * Il extrait id et passe le reste comme updateData.
   */

  describe('update() - pattern NATS "reservations.update"', () => {
    it('devrait déstructurer id et passer le reste comme updateData', async () => {
      // ARRANGE
      const payload = {
        id: 'res-123',
        numberOfGuests: 6,
        updatedBy: 'staff-abc',
        requesterId: 'staff-abc',
        requesterRole: 'Staff_salle',
      };
      mockReservationService.update.mockResolvedValue([]);

      // ACT
      await controller.update(payload);

      // ASSERT - id extrait, le reste est passé comme updateData
      const { id, ...updateData } = payload;

      expect(mockReservationService.update).toHaveBeenCalledWith(
        id,
        updateData,
      );
    });

    it('devrait propager ForbiddenException si un client modifie une réservation qui ne lui appartient pas', async () => {
      //ARRANGE
      mockReservationService.update.mockRejectedValue(
        new ForbiddenException(
          'Vous ne pouvez modifier que vos propres réservations',
        ),
      );

      // ASSERT
      await expect(
        controller.update({
          id: 'res-123',
          updatedBy: 'autre-client',
          requesterId: 'autre-client',
          requesterRole: 'Client',
        }),
      ).rejects.toThrow('Vous ne pouvez modifier que vos propres réservations');
    });
  });

  /**
   * @MessagePattern('reservations.updateStatus')
   * le controller passe Id, status, updatedBy, requesterId, requesterRole
   * au service dans le bon ordre.
   */

  describe('updateStatus() - pattern NATS "reservations.updateStatus"', () => {
    it('devrait passer les bons arguments au service dans le bon ordre', async () => {
      // ARRANGE
      const payload = {
        id: 'res-123',
        status: 'CONFIRMED',
        updatedBy: 'staff-abc',
        requesterId: 'staff-abc',
        requesterRole: 'Staff_salle',
      };
      mockReservationService.updateStatus.mockResolvedValue({
        _id: 'res-123',
        status: 'CONFIRMED',
      });

      // ACT
      await controller.updateStatus(payload);

      // ASSERT - l'ordre des arguments est important
      expect(mockReservationService.updateStatus).toHaveBeenCalledWith(
        'res-123',
        'CONFIRMED',
        'staff-abc',
        'staff-abc',
        'Staff_salle',
      );
    });

    it('devrait propager ForbiddenException si un client tente de confirmer une réservation', async () => {
      // ARRANGE - un client ne peut qu'annuler
      mockReservationService.updateStatus.mockRejectedValue(
        new ForbiddenException("un client ne peut qu'annuler une réservation"),
      );

      // ASSERT
      await expect(
        controller.updateStatus({
          id: 'res-123',
          status: 'CONFIRMED',
          updatedBy: 'client-abc',
          requesterId: 'client-abc',
          requesterRole: 'Client',
        }),
      ).rejects.toThrow("un client ne peut qu'annuler une réservation");
    });

    it('devrait propager NotFoundException si la réservation est introuvable', async () => {
      // ARRANGE
      mockReservationService.updateStatus.mockRejectedValue(
        new NotFoundException('Réservation res-999 introuvable'),
      );

      // ASSERT
      await expect(
        controller.updateStatus({
          id: 'res-999',
          status: 'CANCELLED',
          updatedBy: 'client-abc',
          requesterId: 'client-abc',
          requesterRole: 'Client',
        }),
      ).rejects.toThrow('Réservation res-999 introuvable');
    });
  });
});
