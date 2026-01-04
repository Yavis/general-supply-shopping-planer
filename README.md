# General Supply Shopping Planner

A comprehensive shopping planning application that helps you track products, prices, and shops to optimize your regular shopping experience.

## Overview

The General Supply Shopping Planner is designed to help users efficiently manage their regular shopping by:
- Tracking products, prices, and shops
- Creating organized shopping lists categorized by shop
- Comparing prices per unit (e.g., per kg)
- Monitoring shopping history and patterns

## Features

### MVP (Minimum Viable Product)

#### Core Functionality
- **User Authentication**
  - User registration and login
  - JWT-based authentication
  - User-scoped data (each user sees only their own products/shops)

- **Product Management**
  - Save products with name, size, price, and shop
  - Calculate and store price per unit (e.g., per kg) for easy comparison
  - Search and filter products

- **Shop Management**
  - Save shops/markets where you regularly buy products
  - Associate products with specific shops

- **Shopping List Creation**
  - Select products you need to buy
  - Automatically categorize shopping list by shop
  - Calculate expected total price per shop
  - Display overall shopping summary

- **Shopping List Management**
  - Mark items as:
    - ✅ Bought
    - ❌ Not bought
    - ⚠️ Wrong price
    - 🚫 Not available
  - Track shopping completion status

- **Database & Storage**
  - Centralized PostgreSQL database for products, shops, users, and offers
  - Persistent storage for all shopping data

### Future Enhancements

- **Product Images**
  - Add product pictures
  - Centralized image storage (optimized, small file sizes)
  - Image upload and management

- **User Groups & Sharing**
  - Create user groups (e.g., family members)
  - Share shopping lists within groups
  - Collaborative shopping planning

- **Offers Management**
  - View and manage product offers
  - Track offer validity periods
  - Compare regular prices with offer prices

- **Local Shop Integration**
  - Save and manage your local shops
  - Get updated offers from shops via API (where available)
  - Receive alerts when offers match your regular products

- **Shopping Analytics**
  - Shopping history tracking
  - Monitor purchase frequency
  - Price trend analysis
  - Shopping pattern insights

## Technology Stack

**Frontend:**
- **Web & Mobile**: Next.js (TypeScript) with PWA support
  - Single codebase for web and mobile
  - Progressive Web App for mobile devices
  - Responsive design optimized for mobile

**Backend:**
- **API**: Node.js/Express (TypeScript)
- **Database**: PostgreSQL
- **Authentication**: JWT-based authentication for user management

**Infrastructure:**
- **Development**: Local Docker setup (Docker Compose)
- **Production Options**:
  - Google Cloud Run with AlloyDB (PostgreSQL-compatible)
  - Own server with PostgreSQL + API

## Project Structure

```
general-supply-shopping-planer/
├── README.md
├── docker-compose.yml    # Local Docker setup
├── frontend/             # Next.js application (PWA)
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Data models
│   │   ├── middleware/   # Custom middleware
│   │   └── utils/         # Utility functions
│   ├── database/         # Database schemas and migrations
│   └── package.json
├── docker/               # Docker configuration files
└── docs/                 # Additional documentation
```

## MVP Development Plan

See [MVP_PLAN.md](./MVP_PLAN.md) for detailed step-by-step development plan.

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Git
- direnv (for environment variable management)

### Local Development Setup

The application runs in a Docker environment for local development:

1. Clone the repository
2. Configure environment variables using direnv:
   - The project uses `.envrc` for environment variable management
   - Copy `.envrc.dist` to `.envrc` if you need custom values (optional)
   - direnv will automatically load the environment variables
   - If you don't use direnv, you can manually source `.envrc.dist`
3. Start all services with Docker Compose:
   ```bash
   docker-compose up
   ```
4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

### Building and Running Services Individually

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Database Schema

### Users
- `id` (UUID, Primary Key)
- `email` (String, Unique, Required)
- `password_hash` (String, Required)
- `name` (String, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Products
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to Users)
- `name` (String, Required)
- `size` (String, e.g., "400g")
- `price` (Decimal, Required)
- `price_per_unit` (Decimal, Calculated - e.g., price per kg)
- `shop_id` (UUID, Foreign Key to Shops)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Shops
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to Users)
- `name` (String, Required)
- `address` (String, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Shopping Lists
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to Users)
- `name` (String, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `completed_at` (Timestamp, Nullable)

### Shopping List Items
- `id` (UUID, Primary Key)
- `shopping_list_id` (UUID, Foreign Key)
- `product_id` (UUID, Foreign Key to Products)
- `status` (Enum: 'pending', 'bought', 'not_bought', 'wrong_price', 'not_available')
- `actual_price` (Decimal, Nullable - for price updates)
- `notes` (String, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Offers
- `id` (UUID, Primary Key)
- `product_id` (UUID, Foreign Key to Products)
- `shop_id` (UUID, Foreign Key to Shops)
- `offer_price` (Decimal, Required)
- `start_time` (Timestamp, Required)
- `end_time` (Timestamp, Required)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Note**: All user-specific data is scoped by `user_id` for multi-user support. User groups (for family sharing) will be added in future enhancements. Offers are linked to products and shops, allowing tracking of special prices and promotions.

## API Endpoints

✅ **All MVP Step 2 endpoints are fully implemented and tested** (194 tests passing)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (returns JWT)
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/account` - Get current user

### Products
- `GET /api/products` - List user's products (with search by name and filter by shop)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create new product (auto-calculates price per unit)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Shops
- `GET /api/shops` - List user's shops
- `GET /api/shops/:id` - Get shop details
- `POST /api/shops` - Create new shop
- `PUT /api/shops/:id` - Update shop
- `DELETE /api/shops/:id` - Delete shop

### Shopping Lists
- `GET /api/shopping-lists` - List user's shopping lists
- `GET /api/shopping-lists/:id` - Get shopping list with items (grouped by shop, with totals)
- `POST /api/shopping-lists` - Create new shopping list from product IDs
- `PUT /api/shopping-lists/:id/items/:itemId` - Update item status/price/notes
- `DELETE /api/shopping-lists/:id` - Delete shopping list

### Offers
- `GET /api/offers` - List offers (filter by active status, product, shop, date range)
- `GET /api/offers/:id` - Get offer details
- `POST /api/offers` - Create new offer
- `PUT /api/offers/:id` - Update offer
- `DELETE /api/offers/:id` - Delete offer

## Contributing

_Contributing guidelines will be added as the project develops_

## License

This project is licensed under a custom license that allows:

✅ **Permitted:**
- Use the software for personal or commercial purposes
- Modify the source code
- Distribute the software
- Use the software in your own projects

❌ **Prohibited:**
- Selling the software itself or a modified version of it
- Including this software in a commercial product that is primarily a shopping planner application
- Removing or modifying the license notice

**Commercial Use:** You may use this software commercially (e.g., in your business), but you may not sell the software itself or a competing product based on this code.

**Author's Rights:** The original author reserves the right to sell commercial licenses or versions of this software.

For questions about commercial licensing, please contact the project maintainer.

## Roadmap

1. **Phase 1: MVP** (Current)
   - User authentication
   - Core product and shop management
   - Offers tracking (database schema)
   - Shopping list creation and management
   - Basic UI/UX

2. **Phase 2: Enhanced Features**
   - Product images
   - Shopping history
   - Analytics dashboard
   - Offers management UI
   - Price comparison tools

3. **Phase 3: Integration**
   - Shop API integrations
   - Offer alerts
   - Advanced analytics
   - User groups and sharing
