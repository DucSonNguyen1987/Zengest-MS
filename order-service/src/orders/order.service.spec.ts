import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';
import { NotFoundException } from '@nestjs/common';

// MOCK du modèle Mongoose
/**  Simule les méthodes Mongoose utilisées dans OrderService:
 * => findOne() : utilisé dans findByOrderNumber() et generateOrderNumber(),
 * => find : utilisé dans findAll() et findByCustomer(),
 * => findAndUpdate() : utilisé dans update() et updateStatus()
 
 * Chaque méthode est un jest.fn() => une fonction vide qu'on programme pour 
 * retourner ce qu'on veutt dans chaque test.
*/

/** Description de la forme complète du mock :
 * une fonction constructeur ( pour 'new') + les méthodes statiques Mongoose
 */

type MockOrderModel = jest.Mock & {
  findOne: jest.Mock;
  find: jest.Mock;
  findOneAndUpdate: jest.Mock;
};

const mockSave = jest.fn();

const mockOrderModel = jest.fn().mockImplementation(() => ({
  save: mockSave,
})) as MockOrderModel;

mockOrderModel.findOne = jest.fn();
mockOrderModel.find = jest.fn();
mockOrderModel.findOneAndUpdate = jest.fn();

// SETUP DU MODULE DE TEST

describe('OrderService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    mockOrderModel.findOne = jest.fn();
    mockOrderModel.find = jest.fn();
    mockOrderModel.findOneAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService, // Service qu'on veut tester
        {
          /** getModelToken(Order.name) retourne le token d'injection NestJs
           * pour le Model<Order>. On le remplace par le mock.
           */
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('dervrait être défini', () => {
    expect(service).toBeDefined();
  });

  /** createOrder()
   * Crée une nouvelle commande avec le statut PENDING
   * Appelle generateOrderNumber() en interne (findOne().sort().exec())
   * puis instance le modèle avec "new this.orderModel()" et appelle .save()
   *
   * Mocks nécessaires :
   *   - findOne → { sort → { exec → null } }  (pour generateOrderNumber)
   *   - mockSave → la commande créée   (pour new this.orderModel().save())
   */

  describe('createOrder()', () => {
    it('devrait créer une commande avec le statut PENDING', async () => {
      // ARRANGE
      // generateOrderNumebr() utilise findOne().sort().exec()
      mockOrderModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null), // aucune commande ce jour
        }),
      });

      //save() retourne la commade créée
      mockSave.mockResolvedValue({
        orderNumber: 'ORD-20260326-0001',
        status: 'PENDING',
        customerId: 'customer-abc',
        items: [
          {
            productId: 'p1',
            productName: 'Burger',
            quantity: 1,
            unitPrice: 12,
          },
        ],
        pricing: { subtotal: 12, total: 12 },
        statusHistory: [{ status: 'PENDING', updatedBy: 'customer-abc' }],
      });

      const data = {
        customerId: 'customer-abc',
        ressourceId: 'table-3',
        items: [
          {
            productId: 'p1',
            productName: 'Burger',
            quantity: 1,
            unitPrice: 12,
          },
        ],
        pricing: { subtotal: 12, total: 12 },
      };

      // ACT
      const result = await service.createOrder(data);

      //ASSERT
      expect(result.status).toBe('PENDING');
      expect(result.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);

      //save() doit avoir été appelé pour persister en DB
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
    it('devrait utiliser "system" comme updatedBy si pas de customerId', async () => {
      // ARRANGE
      mockOrderModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });
      mockSave.mockResolvedValue({
        orderNumber: 'ORD-20260326-0001',
        status: 'PENDING',
        statusHistory: [{ status: 'PENDING', updatedBy: 'system' }],
      });

      // ACT - pas de customerId dans les données
      const result = await service.createOrder({
        items: [
          {
            productId: 'p1',
            productName: 'Burger',
            quantity: 1,
            unitPrice: 12,
          },
        ],
        pricing: { subtotal: 12, total: 12 },
      });

      // ASSERT - l'hisotrique doit avoir "system" comme updatedBy
      expect(result.statusHistory[0].updatedBy).toBe('system');
    });
  });

  /**  generateOrderNumber()
   * Méthode privée -> accès via ( service as any)
   * Chaîne Mongoose utilisée:
   * this.orderModel.findOne({ orderNumber: {$regex} }).sort().exec()
   *
   * Mock nécessaire : findOne -> {sort -> (exec -> résultat)}
   */

  describe('generateOrderNumber()', () => {
    it("devrait retourner ORD-YYYMMDD-0001 si aucune commande n'existe ce jour", async () => {
      // ARRANGE - null = aucune commande exsitante aujourd'hui
      mockOrderModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // ACT - (service as any) contourne la visibilité
      const result = await (
        service as unknown as { generateOrderNumber: () => Promise<string> }
      ).generateOrderNumber();

      // ASSERT - Vérifier le format et le premier numéro
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');

      expect(result).toBe(`ORD-${year}${month}${day}-0001`);
    });

    it('devrait incrémenter le numéro si une commande existe déjà ce jour', async () => {
      // ARRANGE - simule une commande ORD-YYYYMMDD-0005 existante
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');

      mockOrderModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            orderNumber: `ORD-${year}${month}${day}-0005`,
          }),
        }),
      });

      // ACT
      const result = await (
        service as unknown as { generateOrderNumber: () => Promise<string> }
      ).generateOrderNumber();

      // ASSERT - le suivant doitêtre 0006
      expect(result).toBe(`ORD-${year}${month}${day}-0006`);
    });
    it('devrait respecter le format ORD-YYYYMMDD-XXXX', async () => {
      // ARRANGE
      mockOrderModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });
      // ACT
      const result = await (
        service as unknown as { generateOrderNumber: () => Promise<string> }
      ).generateOrderNumber();

      /** ASSERT - Vérification par regex
       *  ^ORD- -> commence par ORD-
       *  \d{8} -> 8 chiffres (YYYYMMDD)
       *  -     -> tiret séparateur
       *  \d{4}$ -> 4 chiffres padded (0001, 0002)
       */

      expect(result).toMatch(/^ORD-\d{8}-\d{4}$/);
    });
  });

  /** findByOrderNumber()
   *  Chaîne Mongoose utilisée :
   *  this.orderModel.findOne ({ orderNumber}).exec()
   * Mock nécessaire : findOne -> { exec -> resultat }
   * ( pas de .sort() ici contrairement à generateOrderNumber)
   */

  describe('findByOrderNumber()', () => {
    it('devrait retourner la commande quand elle existe', async () => {
      // ARRANGE
      const mockOrder = {
        orderNumber: 'ORD-20240615-0001',
        status: 'PENDING',
        customerId: 'customer-abc',
        ressourceId: 'table-3',
      };

      // findOne() -> suivi directement de .exec() ( sans .sort())
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockOrder),
      });
      // ACT
      const result = await service.findByOrderNumber('ORD-20240615-0001');

      // ASSERT
      expect(mockOrderModel.findOne).toHaveBeenCalledWith({
        orderNumber: 'ORD-20240615-0001',
      });
      expect(result.orderNumber).toBe('ORD-20240615-0001');
      expect(result.status).toBe('PENDING');
    });

    it("devrait lever NotFoundExecption si la commande n'existe pas", async () => {
      // ARRANGE - null = commande introuvable
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      //ASSERT
      // rejects.toThrow() vérifie qu'une Promise est rejetée avec cette erreur

      await expect(service.findByOrderNumber('ORD-INEXISTANT')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("devrait inclure le numéro de commande dans le message d'erreur", async () => {
      // ARRANGE
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // ASSERT - on peut vérifier le message exact
      await expect(service.findByOrderNumber('ORD-XYZ')).rejects.toThrow(
        'Commande #ORD-XYZ introuvable',
      );
    });
  });

  /** findAll()
   * Chaîne Mongoose utilisée:
   * this.orderModel.find({status: { $ne: 'DELETED'} })
   * .sort().limit().skip().exec()
   *
   * Mock nécessaire: find -> {sort -> {limit -> {skip ->  {exec-> résultat} } } }
   */

  describe('findAll()', () => {
    it('devrait retourner les commandes non supprimées', async () => {
      // ARRANGE
      const mockOrders = [
        { orderNumber: 'ORD-0001', status: 'PENDING' },
        { orderNumber: 'ORD-0002', status: 'CONFIRM' },
      ];

      mockOrderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockOrders),
            }),
          }),
        }),
      });

      // ACT
      const result = await service.findAll(20, 0);

      // ASSERT - vérifier le filtre MogngoDB
      expect(mockOrderModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: { $ne: 'DELETED' } }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].orderNumber).toBe('ORD-0001');
    });

    it("devrait retourner un tableau vide s'il n'y a aucune commande", async () => {
      // ARRANGE
      mockOrderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      // ACT
      const result = await service.findAll();

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  /** findByCustomer()
   *  Chaîne Mongoose find({ customerId, status: { $ne: 'DELETED' }}).sort().exec()
   *  Mock nécessaire: find -> { sort -> {exec -> résultat }}
   */

  describe('findByCustomer()', () => {
    it("devrait retourner les commandes d'un client", async () => {
      // ARRANGE
      const mockOrders = [
        { orderNumber: 'ORD-0001', customerId: 'customer-abc' },
        { orderNumber: 'ORD-0002', customerId: 'customer-abc' },
      ];

      mockOrderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockOrders),
        }),
      });

      // ACT
      const result = await service.findByCustomer('customer-abc');

      // ASSERT
      expect(mockOrderModel.find).toHaveBeenCalledWith({
        customerId: 'customer-abc',
        status: { $ne: 'DELETED' },
      });
      expect(result).toHaveLength(2);
    });

    it("devrait retourner un tableau vide si le client n'a pas de commande", async () => {
      // ARRANGE
      mockOrderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      // ACT
      const result = await service.findByCustomer('customer-inconnu');

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  /** update()
   *  Chaîne Mongoose : findByOrderNumber() (findOne().exec())
   *  puis findOneAndUpdate({ orderNumber}, updateQuery, { new: true}).exec()
   *
   * Mocks nécessaires:
   * - findOne -> {exec -> commande existante} (pour findByOrderNumber)
   *  - findOneAndUpdate -> {exec -> commande mise à jour}
   */

  describe('update()', () => {
    it('devrait ajouter des items avec addItems', async () => {
      // ARRANGE
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ orderNumber: 'ORD-001' }),
      });

      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          orderNumber: 'ORD-001',
          items: [
            {
              productId: 'p1',
              productName: 'Burger',
              quantity: 1,
              unitPrice: 12,
            },
            {
              productId: 'p2',
              productName: 'Frites',
              quantity: 1,
              unitPrice: 3,
            },
          ],
        }),
      });

      // ACT
      const result = await service.update(
        'ORD-001',
        {
          addItems: [
            {
              productId: 'p2',
              productName: 'Frites',
              quantity: 1,
              unitPrice: 3,
            },
          ],
        },
        'staff@zengest.fr',
      );

      // ASSERT
      expect(mockOrderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { orderNumber: 'ORD-001' },
        expect.objectContaining({
          $push: {
            items: {
              $each: [
                {
                  productId: 'p2',
                  productName: 'Frites',
                  quantity: 1,
                  unitPrice: 3,
                },
              ],
            },
          },
        }),
        { new: true },
      );
      expect(result.items).toHaveLength(2);
    });

    it("devrait remplacer la liste d'items avec items", async () => {
      // ARRANGE
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ orderNumber: 'ORD-001' }),
      });

      const newItems = [
        { productId: 'p3', productName: 'Salade', quantity: 1, unitPrice: 8 },
      ];

      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          orderNumber: 'ORD-001',
          items: newItems,
        }),
      });

      // ACT
      await service.update('ORD-001', { items: newItems }, 'staff@zengest.fr');

      // ASSERT — $set.items doit contenir la nouvelle liste
      expect(mockOrderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { orderNumber: 'ORD-001' },
        expect.objectContaining({
          $set: expect.objectContaining({ items: newItems }) as unknown,
        }),
        { new: true },
      );
    });

    it('devrait mettre à jour le pricing', async () => {
      // ARRANGE
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ orderNumber: 'ORD-001' }),
      });

      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          orderNumber: 'ORD-001',
          pricing: { subtotal: 20, discount: 2, total: 18 },
        }),
      });

      // ACT
      await service.update(
        'ORD-001',
        { pricing: { subtotal: 20, discount: 2, total: 18 } },
        'staff@zengest.fr',
      );

      // ASSERT — les champs pricing sont mergés via $set champ par champ
      expect(mockOrderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { orderNumber: 'ORD-001' },
        expect.objectContaining({
          $set: expect.objectContaining({
            'pricing.subtotal': 20,
            'pricing.discount': 2,
            'pricing.total': 18,
          }) as unknown,
        }),
        { new: true },
      );
    });

    it('devrait mettre à jour les notes', async () => {
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ orderNumber: 'ORD-0001' }),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ orderNumber: 'ORD-0001', notes: 'Sans gluten' }),
      });

      await service.update(
        'ORD-0001',
        { notes: 'Sans gluten' },
        'staff@zengest.fr',
      );

      expect(mockOrderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { orderNumber: 'ORD-0001' },
        expect.objectContaining({
          $set: expect.objectContaining({ notes: 'Sans gluten' }),
        }),
        { new: true },
      );
    });

    it('devrait lever NotFoundExceptoion si findOneAndUpdate retourne null', async () => {
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ordernumber: 'ORD-0001' }),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.update('ORD-0001', { notes: 'test' }, 'staff@zengest.fr'),
      ).rejects.toThrow('Commande #ORD-0001 introuvable');
    });

    it("devrait lever NotFoundException si la commande n'existe pas", async () => {
      // ARRANGE
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // ASSERT
      await expect(
        service.update('ORD-INEXISTANT', { notes: 'test' }, 'staff@zengest.fr'),
      ).rejects.toThrow(NotFoundException);

      expect(mockOrderModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  /** UpdateStatus()
   *  Appelle d'abord findByOrderNumber() (-> findOne().exec())
   *  puis findOneAndUpdate().exec()
   *
   * Il faut donc gérer deux appels disctintcs dans le mock
   */

  describe('updateStatus()', () => {
    it('devrait mettre à jour le statut et retourner la commande à jour', async () => {
      // ARRANGE
      // 1er appel : findOne() pour vérification dans findByOrderNumber()
      mockOrderModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ orderNumber: 'ORD-0001', status: 'PENDING' }),
      });
      //2ème appel : findOneAndUpdate() pour la MAJ
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          orderNumber: 'ORD-0001',
          status: 'CONFIRM',
          statusHistory: [
            { status: 'PENDING', updatedBy: 'system' },
            { status: 'CONFIRM', updatedBy: 'staff@zengest.fr' },
          ],
        }),
      });
      // ACT
      const result = await service.updateStatus(
        'ORD-0001',
        'CONFIRM',
        'staff@zengest.fr',
      );
      // ASSERT
      expect(result.status).toBe('CONFIRM');

      // Vérifier que findOneAndUpdate est appelé avec les bons opérateurs MongoDB
      expect(mockOrderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { orderNumber: 'ORD-0001' },
        expect.objectContaining({
          $set: { status: 'CONFIRM' },
          $push: expect.objectContaining({
            statusHistory: expect.objectContaining({
              status: 'CONFIRM',
              updatedBy: 'staff@zengest.fr',
            }),
          }),
        }),
        { new: true }, // retourner le document après modification
      );
    });

    it("devrait propager NotFoundFoundException si la commande n'existe pas", async () => {
      // ARRANGE - findOne retourne null -> findByOrderNumber lèvera NotFoundException
      mockOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // ASSERT
      await expect(
        service.updateStatus('ORD-INEXISTANT', 'CONFIRM', 'staff@zengest.fr'),
      ).rejects.toThrow(NotFoundException);

      // findOneAndUpdate ne doit pas être appelé si la commande ne'existe pas
      expect(mockOrderModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  it('devrait lever NotFoundException si findOneAndUpdate retourne null', async () => {
    // ARRANGE
    // findByOrderNumber() passe (commande trouvée)
    mockOrderModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ orderNumber: 'ORD-0001' }),
    });

    // mais findOneAndUpdate retourne null
    mockOrderModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // ASSERT
    await expect(
      service.updateStatus('ORD-0001', 'CONFIRM', 'staff@zengest.fr'),
    ).rejects.toThrow('Commande #ORD-0001 introuvable pour mise à jour');
  });

  it('devrait accepter le status PAID sans passer par DELIVERED ( status independaants)', async () => {
    /**  Ce test documente une règle métier importante de Zengest
     * PAID et DELIVERED sont des statuts indépendants.
     * Un client peut payer sans que la livraison soit confirmée.
     */

    mockOrderModel.findOne.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ orderNumber: 'ORD-0001', status: 'READY' }),
    });
    mockOrderModel.findOneAndUpdate.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ orderNumber: 'ORD-0001', status: 'PAID' }),
    });

    // ACT - READY -> APID directement, sans delivered
    const result = await service.updateStatus(
      'ORD-0001',
      'PAID',
      'caisse@zengest.fr',
    );
    // ASSERT - ne doit pas lever d'erreur
    expect(result.status).toBe('PAID');
  });

  it('devrait accepter le statut DELIVERED sans passer par PAID', async () => {
    // Symétrique : livraison confirmée sans paiement enregistré (e.g paiement différé)
    mockOrderModel.findOne.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ orderNumber: 'ORD-0001', status: 'READY' }),
    });
    mockOrderModel.findOneAndUpdate.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ orderNumber: 'ORD-0001', status: 'DELIVERED' }),
    });

    const result = await service.updateStatus(
      'ORD-0001',
      'DELIVERED',
      'staff@zengest.fr',
    );
    expect(result.status).toBe('DELIVERED');
  });
});
