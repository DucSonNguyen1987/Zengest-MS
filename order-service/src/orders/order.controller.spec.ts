import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/** Mock du service
 *  Le controller ne contient pas de logique -> il reçoit un mesage
 *  NATS et délègue au service. On remplace donc le service entier
 *  par un objet de mocks pour vérifier que:
 *  - la bonne méthode du service est appelée
 *  - les bons paramètres lui sont passés
 *  Ici pas besoin de mocker Mongoose => le service est entièrement simulé
 */

const mockOrdersService = {
  createOrder: jest.fn(),
  findAll: jest.fn(),
  findByOrderNumber: jest.fn(),
  findByCustomer: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
};

// Module de test

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          // On fournit le mock à la place du vrai OrderService
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  // Réinitialise tous les mocks entre chaque test
  afterEach(() => jest.clearAllMocks());

  // Test basique
  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  /** @MessagePattern('orders.create')
   *  Le controller reçoit le payload NATS et le passe à createOrder().
   *  On vérifie que le payload est transmis sans modification
   */
  describe('createOrder() - pattern NATS "orders.create"', () => {
    it('devrait déléguer au service avec le payload NATS reçu', async () => {
      // ARRANGE
      const payload = {
        customerId: 'customer-abc',
        ressourceId: 'table-3',
        items: [
          {
            productId: 'p1',
            productName: 'Burger Classic',
            quantity: 2,
            unitPrice: 12.5,
          },
        ],
        pricing: { subTotal: 25.0, total: 25.0 },
      };

      const expectedResult = {
        orderNumber: 'ORD-20240615-0001',
        status: 'PENDING',
        ...payload,
      };

      mockOrdersService.createOrder.mockResolvedValue(expectedResult);

      //ACT
      const result = await controller.createOrder(payload);

      // ASSERT
      // Le service doit être appelé exactement une fois avec le bon payload
      expect(mockOrdersService.createOrder).toHaveBeenCalledWith(payload);
      expect(mockOrdersService.createOrder).toHaveBeenCalledTimes(1);

      // La valeur retournée par le service est renvoyée au Gateway via NATS
      expect(result).toEqual(expectedResult);
    });

    it("devrait propager l'erreur si le service échoue", async () => {
      // ARRANGE - le service lève une erreur (ex: validation MongoDB échoue)
      mockOrdersService.createOrder.mockRejectedValue(
        new Error('Erreur MongoDB'),
      );

      //ASSERT
      await expect(
        controller.createOrder({ items: [], pricing: {} } as any),
      ).rejects.toThrow('Erreur MongoDB');
    });
  });

  /**  @MessagePattern('orders.findAll')
   *  Le controller transmet limit et skip au service
   *  Valeurs par défaut: limit=20, skip=0
   */

  describe('findAll() - pattern ANTS "orders.findAll"', () => {
    it('devrait transmettre undefined au service si limit/skip absents du payload', async () => {
      //ARRANGE
      mockOrdersService.findAll.mockResolvedValue([]);
      // ACT - payload vide, cas réel possible avec NATS
      await controller.findAll({});

      // ASSERT - les valeurs par défaut du controller doivent s'appliquer
      expect(mockOrdersService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('devrait retourner ce que le service retourne', async () => {
      //ARRANGE
      const mockOrders = [
        { orderNumber: 'ORD-0001' },
        { orderNumber: 'ORD-0002' },
      ];
      mockOrdersService.findAll.mockResolvedValue(mockOrders);
      // ACT
      const result = await controller.findAll({ limit: 20, skip: 0 });
      // ASSERT
      expect(result).toEqual(mockOrders);
    });
  });

  /** @MessagePattern('orders.findByOrderNumber')
   * Le controller passe l'ordernumber au service
   */
  describe('findByOrderNumber() - pattern NATS "orders.findByOrderNumber"', () => {
    it('devrait appeler le service avec le bon orderNumber', async () => {
      // ARRANGE
      const mockOrder = { orderNumber: 'ORD-20240615-0001', status: 'PENDING' };
      mockOrdersService.findByOrderNumber.mockResolvedValue(mockOrder);
      //ACT
      const result = await controller.findByOrderNumber({
        orderNumber: 'ORD-20240615-0001',
      });
      // ASSERT
      expect(mockOrdersService.findByOrderNumber).toHaveBeenCalledWith(
        'ORD-20240615-0001',
      );
      expect(result.orderNumber).toBe('ORD-20240615-0001');
    });
  });

  /** @MessagePattern('orders.updateStatus')
   * Règle de destructutring:  le payload contient { orderNumber, status, updatedBy}
   * Le controller les passe dans cet ordre de service
   */
  describe('updateStatus() - pattern NATS "orders.updateStatus"', () => {
    it('devrait passer orderNumber, status et updatedBy dans le bon ordre', async () => {
      // ARRANGE
      const payload = {
        orderNumber: 'ORD-0001',
        status: 'CONFIRM',
        updatedBy: 'staff@zengest.fr',
      };
      mockOrdersService.updateStatus.mockResolvedValue({
        orderNumber: 'ORD-0001',
        status: 'CONFIRM',
      });
      // ACT
      await controller.updateStatus(payload);
      // ASSERT - l'ordre des arguments est important
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
        'ORD-0001',
        'CONFIRM',
        'staff@zengest.fr',
      );
    });

    it("devrait propager l'erreur NotFoundException su service", async () => {
      // ARRANGE - simule une commande introuvable
      mockOrdersService.updateStatus.mockRejectedValue(
        new NotFoundException('Commande introuvable'),
      );

      // ASSERT
      await expect(
        controller.updateStatus({
          orderNumber: 'ORD-INEXISTANT',
          status: 'CONFIRM',
          updatedBy: 'staff',
        }),
      ).rejects.toThrow('Commande introuvable');
    });
  });

  /** @MessagePattern('orders.update')
   *  Règle importante : le controller déstructure le payload.
   *  Il extrait orderNumber et updatedBy, et passe le reste comme updatedData.
   */

  describe('update() - pattern NATS "orders.update"', () => {
    it('devrait déstructurer orderNumber et updatedBy, passer le reste comme updatedData', async () => {
      // ARRANGE
      const addItems = [
        { productId: 'p2', productName: 'Frites', quantity: 1, unitPrice: 3 },
      ];

      const payload = {
        orderNumber: 'ORD-0001',
        updatedBy: 'staff@zengest.fr',
        addItems,
        // notes non fournies ->  ne doit pas apparaître dans updatedData
      };
      mockOrdersService.update.mockResolvedValue({});

      // ACT
      await controller.update(payload);

      // ASERT - vérification du destructuring
      expect(mockOrdersService.update).toHaveBeenCalledWith(
        'ORD-0001',
        { addItems },
        'staff@zengest.fr',
      );
    });

    it("devrait pouvoir remplacer la liste d'items copmlète", async () => {
      // ARRANGE - remplacement complet des items ( pas additems, mais items)
      const items = [
        { productId: 'p1', productName: 'Burger', quantity: 1, unitPrice: 12 },
      ];

      const payload = {
        orderNumber: 'ORD-0001',
        updatedBy: 'staff@zengest.fr',
        items,
      };
      mockOrdersService.update.mockResolvedValue({});

      // ACT
      await controller.update(payload);

      // ASSERT
      expect(mockOrdersService.update).toHaveBeenCalledWith(
        'ORD-0001',
        { items },
        'staff@zengest.fr',
      );
    });
  });

  /** @MessagePattern('orders.findByCustomer') */

  describe('findByCustomer() - pattern NATS "orders.findByCustomer"', () => {
    it('devrait appeler le service avec le bon customerId', async () => {
      // ARRANGE
      mockOrdersService.findByCustomer.mockResolvedValue([]);

      // ACT
      await controller.findByCustomer({ customerId: 'customer-abc' });

      // ASSERT
      expect(mockOrdersService.findByCustomer).toHaveBeenCalledWith(
        'customer-abc',
      );
    });
  });
});
