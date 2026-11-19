# MASTER SECURITY & FUNCTIONAL TEST PLAN
**Target:** `https://nutsandnutrition.shop`  
**Host:** Ubuntu 24.04 (`vmi3189237`, IP: `95.111.242.173`)  
**Scope:** Automated & Manual Verification of Security Remediations and Core E-Commerce Features  

---

## 1. TEST OBJECTIVES & STRATEGY
The test plan validates two critical dimensions:
1. **Defensive Verification:** Confirming all identified vulnerabilities (C-01 to C-04, H-01 to H-06, M-01 to M-06) have been completely eliminated and cannot be accessed or exploited.
2. **Functional Non-Regression:** Ensuring all business logic (browsing catalog, adding to cart, checkout redirect, guest sessions, order placement) continues to function seamlessly with zero disruptions.

---

## 2. DEFENSIVE SECURITY TEST CASES

### Test Suite TC-01: Public Exposure & Route Access Control

#### TC-01.1: Database Wipe Route Neutralization [C-01]
- **Target URL:** `GET https://nutsandnutrition.shop/run-migration`
- **Execution Command:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://nutsandnutrition.shop/run-migration
  ```
- **Expected Outcome:** `404` (Not Found) or client-side 404 SPA fallback.
- **Fail Condition:** Any response returning HTTP 200 with text `"Database migration and seeding completed successfully!"`.

#### TC-01.2: Admin Credential Setup Route Neutralization [C-02]
- **Target URL:** `GET https://nutsandnutrition.shop/setup-admin`
- **Execution Command:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://nutsandnutrition.shop/setup-admin
  ```
- **Expected Outcome:** `404` (Not Found).
- **Fail Condition:** HTTP 200 with JSON payload containing `"accounts": [...]` and plaintext passwords.

#### TC-01.3: Admin Directory Enumeration Neutralization [H-02]
- **Target URL:** `GET https://nutsandnutrition.shop/check-admins`
- **Execution Command:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://nutsandnutrition.shop/check-admins
  ```
- **Expected Outcome:** `404` (Not Found).
- **Fail Condition:** HTTP 200 returning administrator records.

#### TC-01.4: Server Debug Path Neutralization [M-05]
- **Target URL:** `GET https://nutsandnutrition.shop/debug-vite`
- **Execution Command:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://nutsandnutrition.shop/debug-vite
  ```
- **Expected Outcome:** `404` (Not Found).
- **Fail Condition:** HTTP 200 returning internal host file paths.

---

### Test Suite TC-02: Business Logic & Financial Integrity

#### TC-02.1: Payment Gateway Bypass Prevention [C-04]
- **Target API:** `POST https://nutsandnutrition.shop/api/customer/orders`
- **Payload:**
  ```json
  {
    "payment_method": "online",
    "shipping_address": {
      "name": "Security Test",
      "phone": "9999999999",
      "address_line1": "Test Address",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "items": [
      { "product_id": 1, "variant_id": 1, "quantity": 1 }
    ]
  }
  ```
- **Execution Method:** Submit authenticated/guest order request with uncaptured online payment.
- **Expected Outcome:** Server responds with order status `'pending'` and payment status `'pending'`.
- **Fail Condition:** Order is created with `'payment_status': 'paid'`.

---

### Test Suite TC-03: Rate Limiting & Abuse Resistance

#### TC-03.1: Customer Authentication Throttling [H-05]
- **Target API:** `POST https://nutsandnutrition.shop/api/customer/login`
- **Execution Command:** Send 10 consecutive rapid login attempts within 5 seconds.
- **Expected Outcome:** Attempts 1–5 process normally; attempts 6–10 return HTTP `429 Too Many Requests`.
- **Fail Condition:** All 10 requests process without rate limiting.

#### TC-03.2: Contact Us Form Spam Throttling [H-05]
- **Target API:** `POST https://nutsandnutrition.shop/api/customer/contact`
- **Execution Command:** Send 5 rapid submissions within 10 seconds.
- **Expected Outcome:** Requests exceeding 3 per minute receive HTTP `429 Too Many Requests`.

---

### Test Suite TC-04: Cross-Site Scripting (XSS) Sanitization

#### TC-04.1: Product Description HTML Sanitization [H-03]
- **Input Payload (Injected via DB or Admin):** `<img src=x onerror=alert(document.cookie)><b>Rich Text</b>`
- **Target View:** Product detail page in browser.
- **Expected Outcome:** The `<b>Rich Text</b>` styling renders safely; the `<img onerror=...>` script tag is sanitized and removed by DOMPurify. No JavaScript alert executes.

#### TC-04.2: User Name Admin View Sanitization [H-04]
- **Input Payload:** Register account with name `<svg onload=alert(1)>`.
- **Target View:** Admin panel user list (`/admin/users`).
- **Expected Outcome:** The string is safely escaped as literal text. No script executes in admin session.

---

### Test Suite TC-05: HTTP Headers & SSL/TLS Configuration

#### TC-05.1: Security Header Audit [M-01]
- **Target:** `https://nutsandnutrition.shop/`
- **Execution Command:**
  ```bash
  curl -s -I https://nutsandnutrition.shop/
  ```
- **Verification Criteria:**
  - `X-Frame-Options: SAMEORIGIN` is present.
  - `X-Content-Type-Options: nosniff` is present.
  - `Strict-Transport-Security` is present.
  - `Referrer-Policy: strict-origin-when-cross-origin` is present.

#### TC-05.2: Server Version Masking [M-02]
- **Execution Command:**
  ```bash
  curl -s -I https://nutsandnutrition.shop/ | grep -i "Server"
  ```
- **Expected Outcome:** Header outputs `Server: nginx` (without OS or version details like `nginx/1.24.0 (Ubuntu)`).

---

## 3. REGRESSION & FUNCTIONALITY TEST SUITE

| ID | Functional Area | Verification Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **FR-01** | **Homepage & SPA Loading** | Open `https://nutsandnutrition.shop/` in browser | HTTP 200, hero banner, featured products, and navbar render cleanly |
| **FR-02** | **Timed Welcome Modal** | Stay on homepage for 15 seconds as guest | Discount modal appears with `WELCOME10` code; suppressed on close |
| **FR-03** | **Cart Management** | Add item to cart from product page | Item added to CartDrawer; count increments; total calculates properly |
| **FR-04** | **Checkout Auth Gate** | Click Checkout without active session | Redirects to `/login?redirect=/checkout` with warning notice |
| **FR-05** | **Auth Toggle** | Switch to Register and back to Login | Parameter `?redirect=/checkout` is preserved across transitions |
| **FR-06** | **Post-Login Redirection**| Complete login from checkout gate | User is immediately returned to `/checkout` with cart items intact |
| **FR-07** | **COD Order Placement** | Complete checkout selecting COD | Order created with status `pending`, payment `pending`, redirected to confirmation |
| **FR-08** | **Admin Dashboard Login** | Authenticate at `/admin/login` with valid credentials | Admin dashboard loads with CSRF validation active |
