import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { calculatePricePerUnit } from '../utils/priceCalculator';
import { productsRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  shopId: z.string().uuid(),
  size: z.string().max(50).optional(),
  price: z.number().positive().or(z.string().transform(val => parseFloat(val)).pipe(z.number().positive())),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  shopId: z.string().uuid().optional(),
  size: z.string().max(50).optional().nullable(),
  price: z.number().positive().or(z.string().transform(val => parseFloat(val)).pipe(z.number().positive())).optional(),
  pricePerUnit: z.number().positive().optional().nullable(),
});

// GET /api/products - List user's products with search/filter
router.get('/', authenticateToken, productsRateLimiter, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { search, shopId } = req.query;

    // Build dynamic where clause
    const where: Prisma.ProductWhereInput = { userId: req.userId };

    if (search && typeof search === 'string') {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (shopId && typeof shopId === 'string') {
      where.shopId = shopId;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        size: true,
        price: true,
        pricePerUnit: true,
        shopId: true,
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id - Get product details
router.get('/:id', authenticateToken, productsRateLimiter, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        userId: req.userId, // Ensure user can only access their own products
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products - Create product
router.post('/', authenticateToken, productsRateLimiter, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, shopId, size, price } = createProductSchema.parse(req.body);

    // Verify shop exists and belongs to user
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        userId: req.userId,
      },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Calculate price per unit
    const pricePerUnit = calculatePricePerUnit(size, price);

    const product = await prisma.product.create({
      data: {
        name,
        shopId,
        size,
        price,
        pricePerUnit,
        userId: req.userId,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', authenticateToken, productsRateLimiter, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = updateProductSchema.parse(req.body);

    // First check if product exists and belongs to user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If shopId is being updated, verify new shop belongs to user
    if (updateData.shopId) {
      const shop = await prisma.shop.findFirst({
        where: {
          id: updateData.shopId,
          userId: req.userId,
        },
      });

      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }
    }

    // Recalculate pricePerUnit if size or price is being updated
    if (updateData.size !== undefined || updateData.price !== undefined) {
      const newSize = updateData.size !== undefined ? updateData.size : existingProduct.size;
      const newPrice = updateData.price !== undefined ? updateData.price : existingProduct.price;
      updateData.pricePerUnit = calculatePricePerUnit(newSize, newPrice);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', authenticateToken, productsRateLimiter, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // First check if product exists and belongs to user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
