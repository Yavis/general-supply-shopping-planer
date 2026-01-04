import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { offersRateLimiter } from '../middleware/rate-limit';

const router = Router();

// Validation schemas
const createOfferSchema = z.object({
  productId: z.string().uuid(),
  shopId: z.string().uuid(),
  offerPrice: z.number().positive().multipleOf(0.01),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: 'startTime must be before endTime',
  path: ['endTime'],
});

const updateOfferSchema = z.object({
  offerPrice: z.number().positive().multipleOf(0.01).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

const getOffersQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// GET /api/offers - List offers with filters
router.get('/', offersRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = getOffersQuerySchema.parse(req.query);
    const { productId, shopId, active, startDate, endDate } = query;

    // Build dynamic where clause with indirect user scoping
    const where: Prisma.OfferWhereInput = {
      product: { userId: req.userId },
      shop: { userId: req.userId },
    };

    if (productId) {
      where.productId = productId;
    }

    if (shopId) {
      where.shopId = shopId;
    }

    if (active === 'true') {
      const now = new Date();
      where.startTime = { lte: now };
      where.endTime = { gte: now };
    } else if (active === 'false') {
      const now = new Date();
      where.OR = [
        { startTime: { gt: now } },
        { endTime: { lt: now } },
      ];
    }

    if (startDate) {
      where.endTime = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.startTime = { lte: new Date(endDate) };
    }

    const offers = await prisma.offer.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            size: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    res.json({ offers });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.issues });
    }
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/offers/:id - Get offer details
router.get('/:id', offersRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const offer = await prisma.offer.findFirst({
      where: {
        id,
        product: { userId: req.userId },
        shop: { userId: req.userId },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            size: true,
            shopId: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    res.json({ offer });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/offers - Create offer
router.post('/', offersRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, shopId, offerPrice, startTime, endTime } = createOfferSchema.parse(req.body);

    // Validate product exists and belongs to user
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: req.userId,
      },
    });

    if (!product) {
      return res.status(400).json({
        error: 'Invalid product',
        details: 'Product not found or does not belong to you',
      });
    }

    // Validate shop exists and belongs to user
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        userId: req.userId,
      },
    });

    if (!shop) {
      return res.status(400).json({
        error: 'Invalid shop',
        details: 'Shop not found or does not belong to you',
      });
    }

    const offer = await prisma.offer.create({
      data: {
        productId,
        shopId,
        offerPrice,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            size: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    res.status(201).json({ offer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Create offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/offers/:id - Update offer
router.put('/:id', offersRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updateData = updateOfferSchema.parse(req.body);

    // Check if offer exists and user owns the related product/shop
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id,
        product: { userId: req.userId },
        shop: { userId: req.userId },
      },
    });

    if (!existingOffer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Validate date range if both dates are being updated or if one is being updated
    if (updateData.startTime || updateData.endTime) {
      const newStartTime = updateData.startTime ? new Date(updateData.startTime) : existingOffer.startTime;
      const newEndTime = updateData.endTime ? new Date(updateData.endTime) : existingOffer.endTime;

      if (newStartTime >= newEndTime) {
        return res.status(400).json({
          error: 'Invalid input',
          details: [{ message: 'startTime must be before endTime', path: ['endTime'] }],
        });
      }
    }

    // Prepare update data with Date objects
    const dataToUpdate: Prisma.OfferUpdateInput = {};
    if (updateData.offerPrice !== undefined) {
      dataToUpdate.offerPrice = updateData.offerPrice;
    }
    if (updateData.startTime !== undefined) {
      dataToUpdate.startTime = new Date(updateData.startTime);
    }
    if (updateData.endTime !== undefined) {
      dataToUpdate.endTime = new Date(updateData.endTime);
    }

    const offer = await prisma.offer.update({
      where: { id },
      data: dataToUpdate,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            size: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    res.json({ offer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    console.error('Update offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/offers/:id - Delete offer
router.delete('/:id', offersRateLimiter, authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Check if offer exists and user owns the related product/shop
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id,
        product: { userId: req.userId },
        shop: { userId: req.userId },
      },
    });

    if (!existingOffer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    await prisma.offer.delete({
      where: { id },
    });

    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
