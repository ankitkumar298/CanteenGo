# 🍔 canteenGo — Smart College Canteen Ordering & Live Queue Management

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-9.11.4-880000?style=for-the-badge&logo=mongoose)](https://mongoosejs.com/)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)

> A full-stack smart college campus canteen web application designed to eliminate long queues and chaotic break-time rushes. Features multi-canteen ordering, real-time live queue progression, dynamic prep-time estimates, 4-digit pickup OTP verification, native browser voice announcements, and authentic 5-star dish reviews.

---

## 📌 Table of Contents

- [Overview & Core Problem](#-overview--core-problem)
- [✨ Key Features](#-key-features)
  - [1. Multi-Canteen Campus Hub](#1-multi-canteen-campus-hub)
  - [2. Student Food Ordering (`/order`)](#2-student-food-ordering-order)
  - [3. Live Queue Board & Loudspeaker Voice (`/queue`)](#3-live-queue-board--loudspeaker-voice-queue)
  - [4. My Orders & 5-Star Reviews (`/orders`)](#4-my-orders--5-star-reviews-orders)
  - [5. Vendor Kitchen Counter Dashboard (`/vendor`)](#5-vendor-kitchen-counter-dashboard-vendor)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Directory Structure](#-project-directory-structure)
- [🚀 Quick Start & Installation](#-quick-start--installation)
  - [Prerequisites](#prerequisites)
  - [Environment Variables Setup](#step-1-environment-variables-setup)
  - [Run Development Server](#step-2-run-development-server)
- [📡 REST API Endpoints](#-rest-api-endpoints)
- [🛡️ Security & Integrity Highlights](#️-security--integrity-highlights)
- [🤝 Contributing & Author](#-contributing--author)

---

## 💡 Overview & Core Problem

During short 15-to-20 minute college lecture breaks, campus canteens face severe congestion, bottlenecked counters, delayed orders, and confusion over whose food is ready. 

**canteenGo** modernizes the university dining experience into an automated, transparent, and enjoyable kiosk workflow:
- Students can browse live menus across multiple campus food courts (34 Block, NK Food Court, Main Canteen, Library Cafe).
- Every dish displays **live estimated wait times** based on real kitchen queues.
- Orders receive a digital token (`T-101`), itemized receipt, and **secret 4-digit pickup PIN (OTP)**.
- Real-time digital queue display calls out ready tokens using **synthesized voice loudspeaker announcements**.
- Students rate dishes out of 5 stars after pickup, dynamically updating community dish ratings for the entire campus.

---

## ✨ Key Features

### 1. Multi-Canteen Campus Hub
- **Campus Canteens Supported:**
  - 🏢 **Food Court near 34 Block** (Central fast foods & meals)
  - 🍜 **NK Food Court** (Snacks, wraps & shakes)
  - 🏛️ **Main Canteen** (North & South Indian meals, hot beverages)
  - ☕ **Library Cafe** (Artisanal coffees, pastries & light snacks)
- **Live Canteen Stats:** Automatic background polling computes active orders ahead, kitchen rush status (`Less Busy`, `Moderate`, `Busy`), and estimated prep times per canteen.
- **Choose Canteen Modal:** Compare wait times, walking distances, and prices across canteens before adding items to the cart.

### 2. Student Food Ordering (`/order`)
- **Category Filter Tabs:** Fast navigation through `All`, `Combos`, `Beverages`, `Meals & Wraps`, and `Hot Snacks`.
- **Dynamic Estimated Prep Times:** Prep times dynamically scale based on kitchen queue load and dish type (e.g., Quick cutting chai ~3 min vs Freshly cooked Maggi ~8 min).
- **Dish Ratings & Review Badges:** Every menu card showcases community ratings (e.g., `★ 4.8 (29)`) recalculated live from verified student reviews.
- **Interactive Cart & Cooking Notes:** Add custom instructions (e.g., *"Less sugar"*, *"Extra spicy, bina pyaz"*).
- **Payment Flexibility:** Choose between **Cash on Counter** or **Demo UPI QR Scanner** with simulated verification and pleasant audio confirmation.
- **Redesigned Order Confirmation Card:** Confetti celebration, high-contrast token slip, estimated pickup counter (`Counter 1 (Fast Dispatch)`), and direct navigation to Live Queue or My Orders.

### 3. Live Queue Board & Loudspeaker Voice (`/queue`)
- **4-Stage Kanban Columns:**
  1. ⏳ **Pending** — Order placed & waiting in queue.
  2. 👨‍🍳 **Preparing** — Currently on stove / chef preparation.
  3. 🔔 **Ready for Pickup** — Prepared & waiting at dispatch counter.
  4. ✅ **Completed** — Verified & handed over to student.
- **Sleek Sticky Order Bar:** Follows student while scrolling down the page, seamlessly expanding into a full token strip at the page bottom.
- **1-Click Looping `Next ›` Token Cycler:** Effortlessly switch between active orders with a single click.
- **Counter Loudspeaker Callouts:** Automatically chimes and speaks out loud:
  > *"Attention! Token T-121, your order is ready at Counter 1!"*

### 4. My Orders & 5-Star Reviews (`/orders` or `/my-orders`)
- **Status Filter Chips:** Filter your orders by `All`, `Active`, `Ready`, `Missed Pickup`, `Completed`, or `Cancelled`.
- **⭐ 5-Star Post-Pickup Rating:**
  - Once an order is marked `Completed` (*Collected & Handed Over*), students can rate food quality 1 to 5 stars directly with a 1-click inline star picker or inside the detail card.
  - Updates the menu item's overall rating across MongoDB Atlas instantly.
- **Secret 4-Digit Pickup OTP:** Hidden by default with an eye toggle button; presented to counter staff for verified food collection.
- **Missed Pickup Auto-Requeue:** If a student misses their food call, they can request a 1-click re-queue to retain food freshness.

### 5. Vendor Kitchen Counter Dashboard (`/vendor`)
- **Role-Protected Access:** PIN/password protected login for authorized canteen staff.
- **Status Progression Controls:** Advance orders smoothly: `Accept & Cook` ➔ `Mark Ready` ➔ `Hand Over`.
- **Secure OTP Verification:** Vendor enters the student's 4-digit code to complete the order, preventing wrong deliveries.
- **Live Menu & Stock Management:** Toggle dish availability (`In Stock` / `Sold Out`) and edit pricing in real-time.

---

## 🛠️ Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.4.3 (App Router)** | Full-stack SSR, API Route Handlers, and static page generation with Turbopack |
| **Library** | **React 19.3.1** | Component-driven declarative UI with hooks (`useState`, `useEffect`, `useRef`, `useContext`) |
| **Database** | **MongoDB & Mongoose 9.11.4** | Flexible schema models (`Menu`, `Order`, `Canteen`, `Student`) with connection pooling |
| **Authentication** | **JWT (`jsonwebtoken`) & Cookies** | Secure student and vendor authentication with HTTP-only cookies |
| **Styling** | **Pure Vanilla CSS** | Custom responsive design system with Google Fonts (*Outfit* & *Plus Jakarta Sans*) |
| **Audio APIs** | **Web Audio API & SpeechSynthesis** | Synthesizer counter bell chime and voice callout announcements |

---

## 📂 Project Directory Structure

```plaintext
CanteenGo/
├── public/
│   ├── images/                       # Crisp dish photos, logo & SVG illustrations
│   │   ├── canteengo-logo.png        # Official canteenGo branding logo
│   │   ├── chai.jpg, samosa.jpg, ... # Real food photography assets
│   │   └── meal-tray-hero.svg        # Hero illustrations
│   └── icon.png                      # App favicon
│
├── src/
│   ├── app/                          # Next.js App Router root & API routes
│   │   ├── api/                      # Backend REST API Handlers
│   │   │   ├── auth/student/         # Login, signup, logout, and me endpoints
│   │   │   │   ├── login/route.js
│   │   │   │   ├── logout/route.js
│   │   │   │   ├── me/route.js
│   │   │   │   └── signup/route.js
│   │   │   ├── canteens/             # Canteens list & live queue stats API
│   │   │   │   ├── route.js
│   │   │   │   └── stats/route.js
│   │   │   ├── menu/                 # Menu CRUD and seed endpoints
│   │   │   │   ├── route.js
│   │   │   │   └── [id]/route.js
│   │   │   └── orders/               # Order placement, status updates & ratings
│   │   │       ├── route.js
│   │   │       └── [id]/route.js
│   │   ├── my-orders/page.js         # Student orders route
│   │   ├── order/page.js             # Student food ordering route
│   │   ├── orders/page.js            # Alternative orders route
│   │   ├── queue/page.js             # Live token queue board route
│   │   ├── vendor/page.js            # Vendor kitchen counter route
│   │   ├── layout.js                 # App root layout with metadata & fonts
│   │   └── page.js                   # Landing hero & portal route
│   │
│   ├── components/                   # Reusable UI Components
│   │   ├── ChooseCanteenModal.jsx    # Multi-canteen switcher & comparison modal
│   │   ├── Footer.jsx                # Clean centered footer with GitHub & brand info
│   │   ├── Icons.jsx                 # Feather/Lucide-inspired SVG icon system
│   │   ├── MenuCard.jsx              # Dish card with dynamic rating, price & prep-time
│   │   ├── Navbar.jsx                # Navigation bar with student profile dropdown
│   │   ├── OrderSuccessOverlay.jsx   # Confetti celebration order confirmation modal
│   │   ├── SecureHandoverModal.jsx   # Vendor 4-digit pickup PIN verification dialog
│   │   ├── StatusBadge.jsx           # Pulsating order and stock availability badges
│   │   ├── StudentProfileModal.jsx   # Student details editing modal
│   │   ├── UpiModal.jsx              # Interactive demo UPI QR payment scanner
│   │   └── VendorLoginModal.jsx      # Counter staff access PIN modal
│   │
│   ├── context/
│   │   └── AppContext.jsx            # Global state (Cart, Student Profile, Canteens, Modals)
│   │
│   ├── data/
│   │   └── canteens.js               # Campus canteens configuration & prep-time calculations
│   │
│   ├── lib/
│   │   ├── auth.js                   # JWT token generation & verification helpers
│   │   └── mongodb.js                # Cached MongoDB connection utility
│   │
│   ├── models/                       # Mongoose Database Schemas
│   │   ├── Canteen.js                # Canteen schema (name, location, timings)
│   │   ├── Menu.js                   # Food item schema (price, rating, reviews array)
│   │   ├── Order.js                  # Order schema (token, items, status, OTP, rating)
│   │   └── Student.js                # Student schema (name, regNo, phone, password)
│   │
│   ├── pages/                        # Core Page Views
│   │   ├── HomePage.jsx              # Role selection portal (Student / Vendor / Queue)
│   │   ├── QueuePage.jsx             # Live queue board with sticky token bar & voice call
│   │   ├── StudentPage.jsx           # Ordering menu, categories, cart & checkout
│   │   ├── VendorPage.jsx            # Staff dashboard for order progression & stock
│   │   └── YourOrdersPage.jsx        # Order history, timeline stepper & 5-star rater
│   │
│   ├── utils/
│   │   └── canteenAudio.js           # Bell chime generator & speech synthesis
│   │
│   └── index.css                     # Global design system, animations & responsive styling
│
├── .env.local.example                # Sample environment configuration
├── jsconfig.json                     # Path alias mappings (@/*)
├── next.config.js                    # Next.js build and Turbopack configuration
├── package.json                      # Project dependencies & scripts
└── README.md                         # Project documentation
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or later installed on your machine.
- **MongoDB**: A running local MongoDB instance (`mongodb://127.0.0.1:27017/canteengo`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cloud cluster.

---

### Step 1: Clone Repository & Install Dependencies

```bash
git clone https://github.com/ankitkumar298/CanteenGo.git
cd CanteenGo
npm install
```

---

### Step 2: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Inside `.env.local`, specify your MongoDB connection string and JWT secret:

```env
# MongoDB Connection String (Local or MongoDB Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/canteengo

# JWT Authentication Secret Key
JWT_SECRET=super_secret_canteengo_jwt_key_2026_capstone

# Vendor Portal Access PIN (Default: 1234)
VENDOR_PIN=1234
```

---

### Step 3: Start Development Server

```bash
npm run dev
```

The application will start on:
👉 **`http://localhost:5000`**

Open **`http://localhost:5000`** in your browser to start ordering or managing the canteen queue!

---

### Step 4: Build for Production

```bash
npm run build
npm start
```

---

## 📡 REST API Endpoints

### 🍔 Menu APIs
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/menu` | Retrieve menu items (supports `?canteenId=...` filter; auto-seeds default dishes if empty) |
| `POST` | `/api/menu` | Add a new dish to the menu (Staff only) |
| `PUT` | `/api/menu/[id]` | Update dish pricing, availability, or category |
| `DELETE` | `/api/menu/[id]` | Remove dish from canteen menu |

### 📋 Orders APIs
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/orders` | Fetch orders list (supports filtering by `canteenId` or `status`) |
| `POST` | `/api/orders` | Place order, calculate prices server-side, allocate secure token & 4-digit PIN |
| `PUT` | `/api/orders/[id]` | Update order status, verify pickup PIN, reschedule, or **submit 1-5 star rating** |

### 🏢 Canteens & Kitchen Stats APIs
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/canteens` | List all registered campus canteens |
| `GET` | `/api/canteens/stats` | Aggregated live kitchen stats (orders ahead, busy status, wait minutes) |

### 👤 Student Authentication APIs
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/student/signup` | Register a new student account |
| `POST` | `/api/auth/student/login` | Authenticate student and issue secure JWT cookie |
| `GET` | `/api/auth/student/me` | Fetch currently authenticated student profile |
| `POST` | `/api/auth/student/logout` | Clear authentication session |

---

## 🛡️ Security & Integrity Highlights

1. **Server-Side Price Verification:** Frontend never controls total price. The backend matches item IDs against MongoDB, sums verified database prices, and calculates taxes/totals securely.
2. **Duplicate-Proof Sequential Tokens:** Automatic token generation (`T-101`, `T-102`...) with atomic MongoDB increments to guarantee zero duplicate tokens during simultaneous student orders.
3. **4-Digit Secret Pickup PIN (OTP):** High-traffic counters verify the student's unique 4-digit code in the Vendor Dashboard before marking orders as collected.
4. **Resilient MongoDB Auto-Reconnection:** MongoDB connection utility caches the Mongoose client instance across hot reloads and Next.js serverless invocations.

---

## 🤝 Contributing & Author

Developed by **[Ankit](https://github.com/ankitkumar298) ,Nitin , Avinash**.

- **GitHub Repository:** [https://github.com/ankitkumar298/CanteenGo](https://github.com/ankitkumar298/CanteenGo)
- **Contact Email:** [contact@canteengo.in](mailto:contact@canteengo.in)

Feel free to fork this project, submit pull requests, or open issues to improve university canteen operations! ⭐ If you like this project, don't forget to star the repository!
