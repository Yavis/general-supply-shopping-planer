import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { shopsRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Validation schemas
const createShopSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().optional(),
});

const updateShopSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().optional(),
});

// GET /api/shops - List user's shops
router.get('/', shopsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const shops = await prisma.shop.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        address: true,
        createdAt: true,
      },
    });

    res.json({ shops });
  } catch (error) {
    console.error('Get shops error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/shops/:id - Get shop details
router.get('/:id', shopsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const shop = await prisma.shop.findFirst({
      where: {
        id,
        userId: req.userId, // Ensure user can only access their own shops
      },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json({ shop });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/shops - Create shop
router.post('/', shopsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, address } = createShopSchema.parse(req.body);

    const shop = await prisma.shop.create({
      data: {
        name,
        address,
        userId: req.userId,
      },
    });

    res.status(201).json({ shop });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Create shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/shops/:id - Update shop
router.put('/:id', shopsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = updateShopSchema.parse(req.body);

    // First check if shop exists and belongs to user
    const existingShop = await prisma.shop.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingShop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: updateData,
    });

    res.json({ shop });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Update shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/shops/:id - Delete shop
router.delete('/:id', shopsRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // First check if shop exists and belongs to user
    const existingShop = await prisma.shop.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingShop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    await prisma.shop.delete({
      where: { id },
    });

    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Delete shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;