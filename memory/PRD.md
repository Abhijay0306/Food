# HyperEats - Hyperlocal Homemade Food Delivery Platform

## Problem Statement
Build a Swiggy-like hyperlocal homemade food marketplace with 4 actors: Customers, Kitchen Providers, Delivery Agents, Admin. Optimized for trust, speed, and simplicity.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + React-Leaflet
- **Backend**: FastAPI (Python) + MongoDB (Motor async)
- **Auth**: JWT with httpOnly cookies, role-based access control
- **Payments**: Stripe via emergentintegrations
- **Maps**: OpenStreetMap + Leaflet
- **Real-time**: WebSocket (FastAPI built-in)

## User Personas
1. **Customer** - Browse kitchens, order food, track delivery
2. **Kitchen Provider** - Manage menu, accept/manage orders
3. **Delivery Agent** - Accept deliveries, update status
4. **Admin** - Platform management, analytics, user management

## Core Requirements
- Multi-role auth (customer, kitchen_provider, delivery_agent, admin)
- Kitchen discovery with geolocation (Haversine distance)
- Menu management (CRUD)
- Cart system (localStorage-based, per-kitchen)
- Stripe payment integration
- Order state machine: placed → accepted → preparing → ready → picked_up → delivered
- Real-time order tracking via WebSocket
- Admin analytics dashboard

## What's Been Implemented (March 2026)
- [x] JWT auth with brute force protection, all roles
- [x] 3 seeded kitchens with menus, 2 delivery agents, admin
- [x] Customer flow: Browse → Menu → Cart → Checkout → Track
- [x] Kitchen dashboard: Orders, Menu CRUD, Open/Close toggle
- [x] Delivery dashboard: Available orders, My deliveries, Status updates
- [x] Admin dashboard: Analytics, Users, Orders, Agent assignment
- [x] Stripe payment integration (test mode)
- [x] OpenStreetMap map view on browse page
- [x] WebSocket real-time order status updates
- [x] Responsive design with organic/earthy theme
- [x] Seed data for demo

## Prioritized Backlog
### P0 (Next)
- Push notifications for order events
- Live GPS tracking on map for delivery
- Order rating/review system

### P1
- Kitchen provider earnings/payout dashboard
- Delivery agent live location broadcasting
- Search by cuisine type filters
- Order history analytics for kitchen providers

### P2
- OTP-based authentication
- Image upload for menu items (object storage)
- Customer saved addresses
- Favorites/bookmarks for kitchens
- Referral/promo code system
