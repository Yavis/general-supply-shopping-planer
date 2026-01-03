# MVP Development Plan

This document outlines the step-by-step plan for building the Minimum Viable Product (MVP) of the General Supply Shopping Planner.

## Overview

The MVP will focus on core functionality: user authentication, managing products, shops, and creating shopping lists. We'll build this incrementally, starting with Docker setup, then backend and database, then the frontend as a PWA (Progressive Web App) that works on both web and mobile.

## Development Phases

### Phase 1: Project Setup & Infrastructure

#### Step 1.1: Docker Setup
- [x] Create Docker Compose configuration
- [x] Set up PostgreSQL container
- [x] Set up backend container (Node.js/Express)
- [x] Set up frontend container (Next.js)
- [x] Configure networking between containers
- [x] Set up volume mounts for development
- [x] Create .envrc / .envrc.dist file
- [x] Test Docker setup locally

#### Step 1.2: Initialize Project Structure
- [x] Create project directory structure
- [x] Initialize Git repository
- [x] Set up package.json files (frontend and backend)
- [x] Configure TypeScript (for Next.js frontend)
- [x] Set up ESLint and Prettier
- [x] Create .gitignore files
- [x] Add Docker-related files to .gitignore

#### Step 1.3: Database Setup
- [x] Create PostgreSQL database schema:
  - [x] Users table
  - [x] Shops table
  - [x] Products table
  - [x] Shopping Lists table
  - [x] Shopping List Items table
  - [x] Offers table
- [x] Create database migrations
- [x] Set up database connection in backend
- [x] Test database connection from backend

#### Step 1.4: Backend Foundation
- [x] Initialize backend framework (Node.js/Express with TypeScript)
- [x] Set up environment variables (.env)
- [x] Configure CORS
- [x] Set up error handling middleware
- [x] Create basic health check endpoint
- [x] Set up logging

### Phase 2: Backend API Development

#### Step 2.1: Authentication API
- [ ] Create User model/schema
- [ ] Implement password hashing (bcrypt)
- [ ] Implement `POST /api/auth/register` - User registration
- [ ] Implement `POST /api/auth/login` - User login (returns JWT)
- [ ] Implement `POST /api/auth/logout` - User logout
- [ ] Implement `GET /api/auth/me` - Get current user
- [ ] Create JWT middleware for protected routes
- [ ] Add input validation
- [ ] Write API tests

#### Step 2.2: Shop Management API
- [ ] Create Shop model/schema (with user_id)
- [ ] Implement `GET /api/shops` - List user's shops
- [ ] Implement `GET /api/shops/:id` - Get shop details
- [ ] Implement `POST /api/shops` - Create shop
- [ ] Implement `PUT /api/shops/:id` - Update shop
- [ ] Implement `DELETE /api/shops/:id` - Delete shop
- [ ] Add user-scoped queries (only user's own shops)
- [ ] Add input validation
- [ ] Write API tests

#### Step 2.3: Product Management API
- [ ] Create Product model/schema (with user_id)
- [ ] Implement `GET /api/products` - List user's products (with search/filter)
- [ ] Implement `GET /api/products/:id` - Get product details
- [ ] Implement `POST /api/products` - Create product
  - [ ] Calculate price_per_unit automatically
- [ ] Implement `PUT /api/products/:id` - Update product
- [ ] Implement `DELETE /api/products/:id` - Delete product
- [ ] Add user-scoped queries (only user's own products)
- [ ] Add search functionality (by name, shop)
- [ ] Add input validation
- [ ] Write API tests

#### Step 2.4: Offers API
- [ ] Create Offer model/schema
- [ ] Implement `GET /api/offers` - List offers
  - [ ] Filter by product, shop, active status
  - [ ] Filter by date range (active offers)
- [ ] Implement `GET /api/offers/:id` - Get offer details
- [ ] Implement `POST /api/offers` - Create offer
  - [ ] Validate product and shop exist
  - [ ] Validate date range (start_time < end_time)
- [ ] Implement `PUT /api/offers/:id` - Update offer
- [ ] Implement `DELETE /api/offers/:id` - Delete offer
- [ ] Add input validation
- [ ] Write API tests

#### Step 2.5: Shopping List API
- [ ] Create ShoppingList and ShoppingListItem models (with user_id)
- [ ] Implement `GET /api/shopping-lists` - List user's shopping lists
- [ ] Implement `GET /api/shopping-lists/:id` - Get shopping list with items
  - [ ] Group items by shop
  - [ ] Calculate totals per shop
  - [ ] Calculate overall total
  - [ ] Ensure user can only access their own lists
- [ ] Implement `POST /api/shopping-lists` - Create shopping list
  - [ ] Accept array of product IDs
  - [ ] Create shopping list items
  - [ ] Validate products belong to user
- [ ] Implement `PUT /api/shopping-lists/:id/items/:itemId` - Update item status
  - [ ] Support status: pending, bought, not_bought, wrong_price, not_available
  - [ ] Allow updating actual_price
  - [ ] Allow adding notes
- [ ] Implement `DELETE /api/shopping-lists/:id` - Delete shopping list
- [ ] Add user-scoped queries
- [ ] Add input validation
- [ ] Write API tests


### Phase 3: Frontend Development (Next.js PWA)

#### Step 3.1: Frontend Setup
- [ ] Initialize Next.js project (TypeScript)
- [ ] Configure PWA support:
  - [ ] Set up service worker
  - [ ] Create manifest.json
  - [ ] Configure offline support
- [ ] Set up routing (Next.js App Router)
- [ ] Configure API client (Axios or Fetch wrapper)
- [ ] Set up authentication context/state management
- [ ] Set up state management (Context API, Redux, or Zustand)
- [ ] Create basic layout components (Header, Navigation, Footer)
- [ ] Set up UI component library (Material-UI, Tailwind CSS, or custom)
- [ ] Configure responsive design (mobile-first approach)

#### Step 3.2: Authentication UI
- [ ] Create login page
- [ ] Create registration page
- [ ] Implement login/logout functionality
- [ ] Set up protected routes (require authentication)
- [ ] Add authentication state persistence
- [ ] Create user profile/account page
- [ ] Style and polish UI

#### Step 3.3: Shop Management UI
- [ ] Create shops list page
- [ ] Create shop form (create/edit)
- [ ] Implement shop CRUD operations
- [ ] Add shop deletion with confirmation
- [ ] Style and polish UI

#### Step 3.4: Product Management UI
- [ ] Create products list page
  - [ ] Display products in grid/list view (responsive)
  - [ ] Show product name, size, price, shop
  - [ ] Add search bar
  - [ ] Add filter by shop
  - [ ] Optimize for mobile viewing
- [ ] Create product form (create/edit)
  - [ ] Form fields: name, shop selection, size, price
  - [ ] Auto-calculate price per unit
  - [ ] Display price per unit
  - [ ] Mobile-friendly form layout
- [ ] Implement product CRUD operations
- [ ] Add product deletion with confirmation
- [ ] Style and polish UI (mobile-optimized)

#### Step 3.5: Offers Management UI
- [ ] Create offers list page
  - [ ] Display offers with product, shop, price, date range
  - [ ] Show active/inactive status
  - [ ] Add filters (product, shop, active status)
  - [ ] Optimize for mobile viewing
- [ ] Create offer form (create/edit)
  - [ ] Form fields: product selection, shop selection, offer price, start time, end time
  - [ ] Date/time picker components
  - [ ] Mobile-friendly form layout
- [ ] Implement offer CRUD operations
- [ ] Add offer deletion with confirmation
- [ ] Style and polish UI (mobile-optimized)

#### Step 3.6: Shopping List UI
- [ ] Create shopping list creation page
  - [ ] Product search/selection interface
  - [ ] Show selected products
  - [ ] Allow removing selected products
  - [ ] Mobile-friendly selection interface
- [ ] Create shopping list view page
  - [ ] Display items grouped by shop
  - [ ] Show expected price per shop
  - [ ] Show overall total
  - [ ] Allow marking items with status (touch-friendly)
  - [ ] Allow updating actual price
  - [ ] Allow adding notes
  - [ ] Optimize for mobile shopping (easy status updates)
- [ ] Create shopping lists history page
  - [ ] List all shopping lists
  - [ ] Show completion status
  - [ ] Allow viewing past lists
- [ ] Style and polish UI (mobile-first)

#### Step 3.7: PWA Features & UX Polish
- [ ] Create navigation menu (mobile-friendly)
- [ ] Add loading states
- [ ] Add error handling and display
- [ ] Add success notifications
- [ ] Implement offline support:
  - [ ] Cache API responses
  - [ ] Show offline indicator
  - [ ] Queue actions when offline
- [ ] Add form validation feedback
- [ ] Test user flows on mobile devices
- [ ] Test PWA installation on mobile
- [ ] Verify service worker functionality

### Phase 4: Testing & Polish

#### Step 4.1: Testing
- [ ] Write unit tests for backend API
- [ ] Write integration tests
- [ ] Test frontend components
- [ ] Test PWA on mobile devices (iOS and Android)
- [ ] Test offline functionality
- [ ] Perform end-to-end testing
- [ ] Fix bugs and issues

#### Step 4.2: Documentation
- [ ] Document API endpoints
- [ ] Create user guide
- [ ] Update README with Docker setup instructions
- [ ] Add code comments

#### Step 4.3: Deployment Preparation
- [ ] Prepare for Google Cloud Run deployment (if chosen)
  - [ ] Configure Cloud Run settings
  - [ ] Set up AlloyDB connection
- [ ] OR prepare for own server deployment
  - [ ] Configure server setup
  - [ ] Set up PostgreSQL on server
- [ ] Configure production environment variables
- [ ] Prepare deployment scripts
- [ ] Test deployment process

#### Step 4.4: Final Polish
- [ ] UI/UX improvements (especially mobile)
- [ ] Performance optimization
  - [ ] API response caching
  - [ ] PWA caching strategies
- [ ] Accessibility improvements
- [ ] Security review
  - [ ] Authentication security
  - [ ] API endpoint security
- [ ] Final testing on multiple devices

## Technical Decisions Needed

### Before Starting Development

1. **Authentication**
   - [ ] JWT token expiration time
   - [ ] Password requirements
   - [ ] Token refresh strategy

3. **Production Deployment**
   - [ ] Choose: Google Cloud Run + AlloyDB OR Own Server + PostgreSQL
   - [ ] Domain and SSL certificate setup

## MVP Success Criteria

The MVP is considered complete when:

- ✅ Users can register and login
- ✅ Users can create and manage shops (user-scoped)
- ✅ Users can create and manage products
- ✅ Users can create and manage offers (with start/end times)
- ✅ Users can create shopping lists by selecting products
- ✅ Shopping lists are automatically categorized by shop
- ✅ Users can see expected prices per shop and total
- ✅ Users can mark items with different statuses
- ✅ All data persists in PostgreSQL database
- ✅ Application runs in Docker locally
- ✅ Works on web browser
- ✅ Works as PWA on mobile (iOS and Android)
- ✅ Basic error handling and validation

## Post-MVP Enhancements

After MVP completion, consider:

1. **Product Images**
   - Add product pictures
   - Centralized image storage (optimized, small file sizes)
   - Image upload and management UI
   - Image optimization for mobile devices

2. **User Groups & Sharing**
   - Create user groups (e.g., family members)
   - Share shopping lists within groups
   - Collaborative shopping planning
   - Group-level product and shop sharing

3. **Shopping History**
   - Save completed shopping lists
   - Track purchase dates
   - Show purchase frequency
   - Historical price tracking

4. **Analytics**
   - Price trends
   - Shopping patterns
   - Most frequently bought items
   - Spending analysis
   - Offer effectiveness tracking

5. **Shop Integration**
   - API integrations for local shops
   - Offer notifications
   - Price comparison across shops
   - Automatic price updates
   - Automatic offer import from shop APIs

## Notes

- This plan assumes starting from scratch
- Docker setup enables consistent development environment
- PWA approach reduces development time vs native apps
- Images are excluded from MVP to reduce scope and complexity
- Offers table is included in database schema for future use
- Authentication is included in MVP to support family sharing in future
- User groups feature is planned for post-MVP
- Consider using existing UI libraries to speed up development
- Prioritize core features over perfect UI in MVP
- Test early and often, especially on mobile devices

