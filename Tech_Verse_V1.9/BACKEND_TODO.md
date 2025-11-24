# Backend Integration TODOs (for Laravel integration)

This file lists recommended backend tasks, API endpoints, and data model outlines to implement once a Laravel backend is added. Keep this file in the repo and update it as integration work progresses.

## Goals
- Replace localStorage persistence with server-side storage (database + file storage).
- Implement secure authentication and session management via Laravel.
- Provide authenticated APIs for listings, reviews, and user account actions.
- Support image uploads (direct or via signed URLs) and protect uploads.

## High-level tasks

1. Authentication
   - Implement Laravel authentication (e.g., Laravel Breeze, Jetstream, or Fortify).
   - Routes:
     - `GET /login` (show login or redirect to SPA login)
     - `POST /login` (authenticate)
     - `POST /logout` (invalidate session)
     - `GET /api/user` (return current authenticated user JSON)
   - Notes:
     - Use server-side sessions (cookie-based) or JWT depending on architecture.
     - Ensure CSRF protection enabled for web forms.

2. Listings API
   - DB model: `listings` table with fields: id, seller_id, title, description, price, images (store separately), sold (bool), tracking, created_at, updated_at
   - Images: either a separate `listing_images` table (id, listing_id, path, order) or store image URLs in JSON column.
   - Endpoints:
     - `GET /api/listings` (public listing feed)
     - `GET /api/listings/{id}` (single listing)
     - `POST /api/listings` (authenticated; create listing)
     - `PUT /api/listings/{id}` (authenticated owner; update listing)
     - `DELETE /api/listings/{id}` (authenticated owner)
   - Image upload endpoints:
     - `POST /api/uploads` (multipart) or return signed upload URLs for direct S3 uploads.
   - Validation: image types, size limits, field validation.

3. Reviews API
   - DB model: `reviews` table with id, listing_id, user_id (nullable), rating, text, created_at
   - Endpoints:
     - `GET /api/listings/{id}/reviews` (public)
     - `POST /api/listings/{id}/reviews` (authenticated or allow anonymous with moderation)
   - Consider rate-limiting or moderation to avoid spam.

4. Account endpoints
   - `GET /api/user` (current user)
   - `PUT /api/user` (update profile)
   - Password change via secure Laravel flow.

5. Seller actions and marking sold
   - Authenticated endpoint to mark a listing as sold, and to set tracking:
     - `POST /api/listings/{id}/mark-sold` { tracking: string }
   - Ensure only the listing owner (seller_id) can perform this.

6. Security and deployment
   - Protect uploads and validate file contents.
   - Serve images from protected storage or signed URLs if required.
   - Add input validation and sanitize output.
   - Configure HTTPS and session cookie settings for production.

## Client-side integration notes (what to change in the frontend)

- Replace localStorage-based storage with API calls:
  - `javascript/seller.js` should POST listing data (and images) to `/api/listings`.
  - `javascript/customer.js` should fetch listings from `/api/listings`.
  - `javascript/product.js` should POST reviews to `/api/listings/{id}/reviews` and GET reviews from same.
- Replace the local `techverse_auth_user` flag with `GET /api/user` request to determine auth state. `javascript/auth.js` can fetch this endpoint and use the response instead of localStorage in production.
- Sign out should call `POST /logout` (to destroy session) instead of only clearing localStorage.
- When using server auth, ensure `auth.js` handles 401 responses and redirects to login.

## API contract examples (JSON)

- GET /api/user => 200
  {
    "id": 123,
    "name": "Alice",
    "email": "alice@example.com"
  }

- POST /api/listings (multipart/form-data)
  - Request: title, price, description, images[]
  - Response: 201 { listing }

- POST /api/listings/{id}/reviews
  - Request: { rating: 4, text: "Nice product" }
  - Response: 201 { review }

## Migration / Models (suggested)

- Listing model migration stub:
  - id (bigIncrements), seller_id (unsignedBigInteger), title (string), price (string/decimal), description (text), sold (boolean default false), tracking (string nullable), created_at, updated_at

- Review model migration stub:
  - id, listing_id, user_id nullable, rating integer, text text, created_at

## Deployment notes

- If using S3 for images, configure Laravel filesystem and CORS for direct uploads.
- Consider using signed URLs to let the frontend upload directly to S3.

## Flag images & geo UI integration

- Recommended approach: use a small, trusted CDN of SVG flag icons rather than embedding large image sets in the repo. FlagCDN (https://flagcdn.com/) and CDN-hosted SVGs (or a provider such as https://www.countryflags.com/) are good options.
- Client-side rendering: the frontend can request the visitor country (via `/api/geo` or `/api/user`) and map the 2-letter ISO country code to an SVG URL such as:
  - `https://flagcdn.com/{cc}.svg` (lowercase `{cc}`) or size-prefixed PNG `https://flagcdn.com/w40/{cc}.png` for small icons.
- Caching and performance:
  - Serve flags from a CDN with long cache headers (Cache-Control: public, max-age=31536000) because flags rarely change.
  - Use `loading="lazy"` for images in lists to avoid blocking rendering.
  - Prefer SVG for crisp rendering and small file size.
- Privacy and server-side geo:
  - For privacy and reliability, resolve the visitor country on the server (Laravel) using request IP and an IP-to-country service or local IP database.
  - Expose a small authenticated endpoint such as `GET /api/geo` or include `country` in `GET /api/user` payload. This avoids client-side calls to third-party IP services and reduces exposure of visitor IP to third parties.
- Security:
  - If you fetch flags from a third-party CDN, ensure you use `https` and valid integrity checks or trusted providers.

## Client-side flag integration notes (for frontend devs)

- Client should prefer server-provided country info (`/api/user` or `/api/geo`). If not available, fallback to a small IP-based lookup from the client.
- Map country code to CDN path: e.g., `https://flagcdn.com/{cc}.svg` with `{cc}` in lowercase. Example: `https://flagcdn.com/us.svg`.
- Render a small `<img alt="US flag" src="...">` with `width`/`height` attributes and an accessible `alt` attribute.


---
Keep this document updated as backend routes and contracts are finalized.
