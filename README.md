# 🧺 KLYNN Door-to-Door Laundry — Admin Web App

The **KLYNN Admin App** is a web-based operations dashboard used to manage door-to-door laundry orders.  
It supports **superhosts, riders, and vendors** for order monitoring, vendor assignment, and logistics operations.

This project is built with **React + Next.js** and uses **Supabase** as the backend database with **Row Level Security (RLS)**.

---

## 🚀 Tech Stack

- **Frontend:** React, Next.js (App Router)
- **Backend / Database:** Supabase (PostgreSQL + Auth + RLS)
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth
- **Runtime:** Node.js
- **Development Server:** `npm run dev`

---

## 📁 Project Structure (Important Files)

```
klynn-admin-app/
├─ app/
│ ├─ api/
│ │ └─ orders/route.ts # Server-side admin API
│ ├─ orders/page.tsx # Orders dashboard
│ ├─ history/page.tsx
│ ├─ map/page.tsx
│
├─ components/
│ ├─ order-list.tsx
│ ├─ superhost-dashboard.tsx
│
├─ lib/
│ ├─ supabaseClient.ts # Browser client (anon key)
│ ├─ supabaseServer.ts # Server-side user context
│ ├─ supabaseAdmin.ts # Service-role client (admin)
│ ├─ data.ts # Data mapping layer
│ ├─ operations.ts # Order updates & webhooks
│
├─ .env.example
├─ package.json
└─ README.md
```


---

## 🧑‍🏫 How to Run Locally 

### 1️⃣ Install Dependencies

```
npm install
```
### 2️⃣ Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://aerbkrsskxbsvjattofq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlcmJrcnNza3hic3ZqYXR0b2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzM1MDIsImV4cCI6MjA4MDQ0OTUwMn0.OUVlzVxdy_DgHi9redKhp5YweH0oCg3kH7BFFQsP6m4 

Note: SUPABASE_SERVICE_ROLE_KEY is not allowed to be shared for security reasons. It is illegal and dangerous to distribute this key.
```
### 3️⃣ Start the Development Server

```
npm run dev
```
Then open:
```
http://localhost:3000
```
### 🚨 Why the Service Role Key is Not Included

* The service role key bypasses all RLS policies
* Sharing it would expose full database access
* Industry best practice: never commit secrets 

### ✅ Expected Behavior Without Service Role Key

* App builds successfully
* UI renders normally
* Admin API routes return safe empty results
* No crashes or runtime errors
This behavior is intentional.

👥 Role-Based Features

Superhost
* View all orders
* Approve / cancel orders
* Assign vendors
* Edit rider information
* Generate quotations

Rider
* View approved pickup orders
* Navigation shortcuts (Google Maps / Waze)
* Confirm pickup
* Generate AWB labels

Vendor
* View assigned orders
* Track processing status 

### 📬 Notes

This repository intentionally omits sensitive credentials.
All architectural decisions follow industry security standards.

Thank you for reviewing this project.