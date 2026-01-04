import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { shoppingListsRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Validation schemas
const createShoppingListSchema = z.object({
  name: z.string().max(200).optional(),
  productIds: z.array(z.string().uuid()).min(1).max(100),
});

const updateItemSchema = z.object({
  status: z.enum(['pending', 'bought', 'not_bought', 'wrong_price', 'not_available']).optional(),
  actualPrice: z.number().positive().multipleOf(0.01).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// GET /api/shopping-lists - List user's shopping lists
router.get('/', shoppingListsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const shoppingLists = await prisma.shoppingList.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    const formattedLists = shoppingLists.map(list => ({
      id: list.id,
      name: list.name,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      completedAt: list.completedAt,
      totalItems: list._count.items,
    }));

    res.json({ shoppingLists: formattedLists });
  } catch (error) {
    console.error('Get shopping lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shopping-lists/:id - Get shopping list with items grouped by shop
router.get('/:id', shoppingListsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const shoppingList = await prisma.shoppingList.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                shop: true,
              },
            },
          },
        },
      },
    });

    if (!shoppingList) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Group items by shop
    type FormattedItem = {
      id: string;
      productId: string;
      status: string;
      actualPrice: unknown;
      notes: string | null;
      product: {
        id: string;
        name: string;
        size: string | null;
        price: unknown;
        pricePerUnit: unknown;
      };
    };

    interface ShopData {
      shop: {
        id: string;
        name: string;
        address: string | null;
      };
      items: FormattedItem[];
      expectedTotal: number;
      actualTotal: number;
    }

    const itemsByShop = new Map<string, ShopData>();

    let overallExpectedTotal = 0;
    let overallActualTotal = 0;

    shoppingList.items.forEach(item => {
      const shopId = item.product.shopId;

      if (!itemsByShop.has(shopId)) {
        itemsByShop.set(shopId, {
          shop: item.product.shop,
          items: [],
          expectedTotal: 0,
          actualTotal: 0,
        });
      }

      const shopData = itemsByShop.get(shopId)!;

      // Format item for response
      const formattedItem = {
        id: item.id,
        productId: item.productId,
        status: item.status,
        actualPrice: item.actualPrice,
        notes: item.notes,
        product: {
          id: item.product.id,
          name: item.product.name,
          size: item.product.size,
          price: item.product.price,
          pricePerUnit: item.product.pricePerUnit,
        },
      };

      shopData.items.push(formattedItem);

      // Calculate expected total (always use product price)
      const productPrice = typeof item.product.price === 'object' ? item.product.price.toNumber() : Number(item.product.price);
      shopData.expectedTotal += productPrice;
      overallExpectedTotal += productPrice;

      // Calculate actual total (only for bought items)
      if (item.status === 'bought') {
        const actualPrice = item.actualPrice ? (typeof item.actualPrice === 'object' ? item.actualPrice.toNumber() : Number(item.actualPrice)) : productPrice;
        shopData.actualTotal += actualPrice;
        overallActualTotal += actualPrice;
      }
    });

    // Convert Map to array
    const itemsByShopArray = Array.from(itemsByShop.values()).map(shopData => ({
      shop: {
        id: shopData.shop.id,
        name: shopData.shop.name,
        address: shopData.shop.address,
      },
      items: shopData.items,
      expectedTotal: parseFloat(shopData.expectedTotal.toFixed(2)),
      actualTotal: parseFloat(shopData.actualTotal.toFixed(2)),
      itemCount: shopData.items.length,
    }));

    res.json({
      shoppingList: {
        id: shoppingList.id,
        name: shoppingList.name,
        createdAt: shoppingList.createdAt,
        updatedAt: shoppingList.updatedAt,
        completedAt: shoppingList.completedAt,
        itemsByShop: itemsByShopArray,
        overallExpectedTotal: parseFloat(overallExpectedTotal.toFixed(2)),
        overallActualTotal: parseFloat(overallActualTotal.toFixed(2)),
        totalItems: shoppingList.items.length,
      },
    });
  } catch (error) {
    console.error('Get shopping list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/shopping-lists - Create shopping list with product IDs
router.post('/', shoppingListsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, productIds } = createShoppingListSchema.parse(req.body);

    // Verify all products exist and belong to user
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId: req.userId,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        error: 'Invalid products',
        details: 'Some products not found or do not belong to you',
      });
    }

    // Create shopping list and items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const shoppingList = await tx.shoppingList.create({
        data: {
          userId: req.userId!,
          name: name || null,
        },
      });

      await tx.shoppingListItem.createMany({
        data: productIds.map(productId => ({
          shoppingListId: shoppingList.id,
          productId,
          status: 'pending',
        })),
      });

      return shoppingList;
    });

    res.status(201).json({ shoppingList: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Create shopping list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/shopping-lists/:id/items/:itemId - Update item status/price/notes
router.put('/:id/items/:itemId', shoppingListsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, itemId } = req.params;
    const updateData = updateItemSchema.parse(req.body);

    // Check shopping list belongs to user and item belongs to that list
    const item = await prisma.shoppingListItem.findFirst({
      where: {
        id: itemId,
        shoppingListId: id,
        shoppingList: {
          userId: req.userId,
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Shopping list item not found' });
    }

    // Prepare update data
    const dataToUpdate: Prisma.ShoppingListItemUpdateInput = {};
    if (updateData.status !== undefined) {
      dataToUpdate.status = updateData.status;
    }
    if (updateData.actualPrice !== undefined) {
      dataToUpdate.actualPrice = updateData.actualPrice;
    }
    if (updateData.notes !== undefined) {
      dataToUpdate.notes = updateData.notes;
    }

    const updatedItem = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: dataToUpdate,
      include: {
        product: true,
      },
    });

    res.json({ item: updatedItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Update shopping list item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/shopping-lists/:id - Delete shopping list
router.delete('/:id', shoppingListsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Check if shopping list exists and belongs to user
    const existingList = await prisma.shoppingList.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingList) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Delete shopping list (cascade will delete items)
    await prisma.shoppingList.delete({
      where: { id },
    });

    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    console.error('Delete shopping list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
