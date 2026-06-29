# ⚙️ LegalEase Server – API Documentation

This is the production-ready Express.js backend server for **LegalEase – Online Lawyer Hiring Platform**. Built with Node.js and MongoDB, it handles secure role-based access control, Stripe payment flows, and data computations.

---

## 📂 API Endpoints Summary

### 🛡️ Authentication & Middlewares
* Token Verification via remote JWKS: `verifyToken`
* Role-specific Route Guards: `userVerifyToken`, `lawyerVerifyToken`, `adminVerifyToken`

### 👥 User Routes
* `GET /user` — Fetch all users (Excluding Admin)
* `PATCH /user/role/:id` — Change user role (Admin Only)
* `DELETE /user/:id` — Delete a user profile (Admin Only)

### ⚖️ Lawyer Profiles & Services
* `GET /lawyers` — Browse lawyers with pagination, search, and filtering
* `GET /lawyers/:id` — Fetch single lawyer details along with their sub-services
* `POST /lawyers` — Add new lawyer data (`verifyToken`)
* `PATCH /lawyers/:userId` — Edit personal lawyer profile details
* `POST /services` | `PATCH /services/:id` | `DELETE /services/:id` — Manage specific legal offerings

### 📝 Client Comments System
* `GET /comments/:id` — Get all public reviews for a specific lawyer
* `POST /comments` — Post a new verified review (`userVerifyToken`)
* `GET /comments/user/:userId` — Dynamic user feedback summary aggregated with lawyer pictures and names using MongoDB Pipelines (`$lookup`, `$unwind`)
* `PATCH /comments/:id` | `DELETE /comments/:id` — Modify or remove existing reviews

### 🤝 Hiring & Consultation Flow
* `POST /hiring` — Initiate contract with a 'pending' status flag
* `GET /hiring/:userId` — Client-side dashboard hiring sheet history
* `GET /lawyer/hiring/:lawyerId` — Lawyer-side action tracking panel
* `PATCH /hiring/:id` — Transition proposal statuses (`accepted`, `rejected`)

### 📊 System Analytics (Admin Tower)
* `GET /analytics` — Fetch comprehensive data metrics simultaneously using `Promise.all()` and dynamic revenue grouping (`$group`, `$toDouble`)
* Dedicated metrics: `GET /analytics/users`, `/lawyers`, `/hires`, `/revenue`

### 💳 Stripe Safe Transactions
* `POST /create-payment-intent` — Generates payment secret handling calculation conversion (`fee * 100`)
* `POST /payments` — Atomically saves the transaction details and flags the hiring request as **'Paid'**
* `GET /all-payments` — Displays historical system transactions index sorted by date

---

## 🛠️ Dependencies Used
* **Backend Framework:** Node.js, Express.js
* **Database Driver:** Native MongoDB Driver
* **Auth Verification:** `jose-cjs` (Remote JWKS decoding)
* **Payment Gateway:** Stripe Engine API
* **Environment Controller:** Dotenv, CORS

---
