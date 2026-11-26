# SalonBook --- Server

The REST API for **SalonBook**, a role-based salon appointment booking
platform. Built with **Node.js**, **Express.js**, **MongoDB**, and
**Mongoose**. The server handles authentication integration,
authorization, service and appointment management, Stripe Checkout, and
verified Stripe webhook processing.

## Live Demo

-   **Live website:** \[Add deployed client URL\]
-   **Server API:** \[Add deployed server URL\]
-   **Server repository:** \[Add server GitHub repository URL\]
-   **Client repository:** \[Add client GitHub repository URL\]

## Features

-   RESTful API built with Express.js.
-   MongoDB data persistence using Mongoose (if used).
-   Better Auth integration and authenticated request verification.
-   JWT verification middleware for protected API routes.
-   Server-side role authorization for admin and customer operations.
-   Blocked-user checks on protected platform features.
-   Service CRUD, active/inactive status, and validation.
-   Appointment creation, duplicate-slot conflict prevention,
    cancellation, confirmation, and status management.
-   Customer ownership checks for appointment and profile operations.
-   Stripe Checkout Session creation for eligible confirmed
    appointments.
-   Stripe webhook signature verification.
-   Payment and transaction records updated only after a verified Stripe
    webhook event.
-   ImgBB image upload integration (if implemented).
-   Centralized error handling, input validation, and CORS
    configuration.

## Technology Stack

-   Node.js
-   Express.js
-   JavaScript / TypeScript
-   MongoDB
-   Mongoose (optional)
-   Better Auth
-   JWT
-   Stripe
-   ImgBB
-   dotenv

## Database Collections

The application uses Better Auth's authentication collections and the
following main application collections:

### `users`

-   `name`
-   `email`
-   `image`
-   `role` (`customer` or `admin`)
-   `isBlocked`

### `services`

-   `serviceName`
-   `category`
-   `description`
-   `price`
-   `duration`
-   `image`
-   `status` (`active` or `inactive`)
-   `createdAt`

### `appointments`

-   `serviceId`
-   `customerId`
-   `appointmentDate`
-   `timeSlot`
-   `message`
-   `servicePrice`
-   `paymentStatus` (`unpaid` or `paid`)
-   `status` (`pending`, `confirmed`, or `cancelled`)
-   `createdAt`

### `transactions`

-   `appointmentId`
-   `customerId`
-   `amount`
-   `currency`
-   `stripeSessionId`
-   `status` (`paid` or `failed`)
-   `createdAt`

Use references between documents and add appropriate indexes, including
a strategy to prevent duplicate active bookings for the same
service/date/time slot.

## Getting Started

### Prerequisites

-   Node.js (LTS recommended)
-   npm, pnpm, or yarn
-   MongoDB local instance or MongoDB Atlas database
-   Stripe account with test-mode API keys
-   Stripe CLI for local webhook testing (recommended)
-   Better Auth configuration
-   ImgBB API key, if image uploads are enabled

### Installation

``` bash
git clone <SERVER_REPOSITORY_URL>
cd <SERVER_PROJECT_DIRECTORY>
npm install
```

Create a `.env` file in the server project root:

``` env
PORT=
NODE_ENV=
CLIENT_URL=
SERVER_URL=
MONGODB_URI=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUCCESS_URL=
STRIPE_CANCEL_URL=
IMGBB_API_KEY=
```

Use the exact variable names expected by the implementation. Never
commit `.env` or real credentials.

### Run locally

``` bash
npm run dev
```

If the project does not define a `dev` script, add one appropriate to
its runtime (for example, `nodemon` for JavaScript or `tsx` for
TypeScript).

### Production

``` bash
npm run build
npm run start
```

Use the scripts defined in the actual `package.json`; remove or adjust
commands that are not configured.

## Environment Variables

  -----------------------------------------------------------------------
  Variable                            Purpose
  ----------------------------------- -----------------------------------
  `PORT`                              Express server port

  `NODE_ENV`                          Runtime environment

  `CLIENT_URL`                        Allowed frontend origin

  `SERVER_URL`                        Public backend URL

  `MONGODB_URI`                       MongoDB connection string

  `BETTER_AUTH_SECRET`                Better Auth signing/encryption
                                      secret

  `BETTER_AUTH_URL`                   Better Auth base URL

  `GOOGLE_CLIENT_ID`                  Google OAuth client ID

  `GOOGLE_CLIENT_SECRET`              Google OAuth client secret

  `JWT_SECRET`                        Secret for verifying application
                                      JWTs, if separately used

  `STRIPE_SECRET_KEY`                 Stripe secret API key

  `STRIPE_WEBHOOK_SECRET`             Stripe webhook signing secret

  `STRIPE_SUCCESS_URL`                Checkout success redirect URL

  `STRIPE_CANCEL_URL`                 Checkout cancel redirect URL

  `IMGBB_API_KEY`                     ImgBB image hosting API key
  -----------------------------------------------------------------------

Do not publish actual values. Never place private server secrets in
client-side environment variables.

## API Routes

The following is a suggested REST API layout. Update the paths and
methods to match the implemented server.

  ------------------------------------------------------------------------------------------------
  Method            Endpoint                               Access            Purpose
  ----------------- -------------------------------------- ----------------- ---------------------
  `GET`             `/api/services`                        Public            List active services;
                                                                             support search,
                                                                             category filter, and
                                                                             price sorting

  `GET`             `/api/services/:id`                    Public            Get service details

  `POST`            `/api/services`                        Admin             Create a service

  `PATCH`           `/api/services/:id`                    Admin             Update service

  `DELETE`          `/api/services/:id`                    Admin             Delete a service

  `POST`            `/api/appointments`                    Customer          Request an
                                                                             appointment

  `GET`             `/api/appointments/me`                 Customer          List current
                                                                             customer's
                                                                             appointments

  `PATCH`           `/api/appointments/:id/cancel`         Appointment owner Cancel own pending
                                                                             appointment

  `GET`             `/api/admin/appointments`              Admin             List all appointments

  `PATCH`           `/api/admin/appointments/:id/status`   Admin             Confirm or cancel
                                                                             appointment

  `GET`             `/api/admin/users`                     Admin             List customers

  `PATCH`           `/api/admin/users/:id/block`           Admin             Block or unblock a
                                                                             customer

  `GET`             `/api/admin/transactions`              Admin             List transactions

  `PATCH`           `/api/users/me`                        Authenticated     Update own permitted
                                                                             profile fields

  `POST`            `/api/payments/checkout-session`       Customer          Create Checkout
                                                                             Session for eligible
                                                                             appointment

  `POST`            `/api/payments/webhook`                Stripe webhook    Verify Stripe event
                                                                             and update
                                                                             payment/transaction
                                                                             records
  ------------------------------------------------------------------------------------------------

These endpoints are documentation examples, not a claim that every route
is already implemented.

## Authentication and Authorization

-   Verify the authentication token/session on the server for every
    protected endpoint.
-   Verify the user's role on the server; frontend checks alone are
    insufficient.
-   Reject blocked users from protected platform features.
-   Customers may only read or modify their own appointments and
    profile.
-   Never accept `role` or `isBlocked` changes from a normal profile
    update request.
-   Admin privileges must be assigned through a trusted administrative
    process, not public registration.
-   Use secure cookie, CORS, and token settings appropriate to the
    deployment environment.

## Stripe Payment and Webhook Flow

1.  A customer requests an appointment. The server stores it as
    `pending` and `unpaid`.
2.  An admin confirms the appointment.
3.  The customer requests a Checkout Session for that confirmed, unpaid
    appointment.
4.  The server validates appointment ownership, status, amount, and
    payment eligibility before creating the session.
5.  Stripe redirects the customer to the configured success or cancel
    URL.
6.  Stripe sends an event to `/api/payments/webhook`.
7.  The server verifies the webhook signature using the raw request body
    and `STRIPE_WEBHOOK_SECRET`.
8.  Only after successful signature verification and validation of the
    relevant event does the server mark the appointment paid and
    create/update the transaction.
9.  Handle duplicate webhook deliveries idempotently. Do not mark an
    appointment paid based only on a browser redirect.

For local testing, configure the Stripe CLI to forward events to the
local webhook endpoint and use the generated webhook signing secret in
your local environment.

## Validation and Business Rules

-   Service price and duration must be positive numbers.
-   Only active services can be booked.
-   Only authenticated customers can create appointment requests.
-   Prevent duplicate active bookings for the same date and time slot
    according to the application's booking policy.
-   Customers can cancel only their own pending appointments.
-   Admins can confirm only pending appointments and can cancel pending
    or confirmed appointments.
-   Customers cannot pay for pending or cancelled appointments.
-   Never allow manual API updates to mark a transaction as paid.
-   Validate IDs, dates, time slots, request bodies, and uploaded files.
-   Return consistent HTTP status codes and safe error messages.

## Suggested Server Structure

``` text
src/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── validators/
└── app.js
```

Adapt filenames and extensions to the actual codebase.

## Deployment

1.  Provision a Node.js hosting service and MongoDB database.
2.  Configure all server environment variables in the hosting dashboard.
3.  Set `CLIENT_URL` to the exact deployed frontend origin.
4.  Configure Better Auth and Google OAuth allowed origins/callback
    URLs.
5.  Configure Stripe success/cancel URLs and register the deployed
    webhook endpoint in Stripe.
6.  Ensure the webhook route receives the raw request body before JSON
    parsing, as required by Stripe signature verification.
7.  Configure CORS to allow the production client origin and required
    methods/headers.
8.  Deploy and verify the health endpoint and all API routes.
9.  Test authentication, role permissions, image uploads, booking
    conflicts, Stripe Checkout, and webhook processing in test mode
    before going live.

## Security Checklist

-   Keep `.env` out of version control; include `.env.example` with
    variable names and empty values only.
-   Keep MongoDB credentials, Better Auth secrets, JWT secrets, Stripe
    secret keys, webhook secrets, Google OAuth secrets, and ImgBB keys
    private.
-   Verify JWT/session and role on every protected API.
-   Validate and sanitize client input.
-   Use Stripe webhook signature verification and idempotent event
    handling.
-   Restrict CORS to trusted origins.
-   Do not expose stack traces or secrets in production error responses.

## License

\[Add license information, if applicable.\]
