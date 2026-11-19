# SECURITY REMEDIATION PLAN & ROADMAP
**Target:** `https://nutsandnutrition.shop`  
**Host:** Ubuntu 24.04 (`vmi3189237`, IP: `95.111.242.173`)  
**Scope:** Laravel 12 Backend, React 19 Frontend, MariaDB 10.11, Docker, Nginx Reverse Proxy  
**Strategy:** Phased, zero-downtime, defensive remediation strictly verified against regression.

---

## 1. REMEDIATION OVERVIEW & PRIORITY MATRIX

| Priority | Level | Issues Addressed | Objective | Expected Execution Time |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **Immediate** | C-01, C-02, C-03, C-04 | Eliminate remote wipe, admin takeover, and payment bypass | Immediate |
| **P1** | **High** | H-01, H-02, H-03, H-04, H-05, H-06 | Eliminate stored XSS, rate limit endpoints, fix CSRF | Phase 2 |
| **P2** | **Medium** | M-01, M-02, M-03, M-04, M-05, M-06 | Security headers, server tokens, automated DB backups | Phase 3 |
| **P3** | **Hardening**| L-01, L-02, L-03 | Content Security Policy, least-privilege permissions | Phase 4 |

---

## 2. PHASE P0: IMMEDIATE CRITICAL REMEDIATION (ZERO-IMPACT DEFENSE)

### Task P0-1: Remove Unauthenticated Database Wipe Route [C-01]
- **Target File:** `laravel-react-app/routes/web.php` (Lines 319–326)
- **Action:** Delete the entire `/run-migration` route block.
- **Diff:**
  ```diff
  - Route::get('/run-migration', function () {
  -     try {
  -         \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true]);
  -         return "Database migration and seeding completed successfully! You can now go back to your website.";
  -     } catch (\Exception $e) {
  -         return "Error: " . $e->getMessage();
  -     }
  - });
  ```
- **Validation:** Send `curl -I https://nutsandnutrition.shop/run-migration` and verify it returns HTTP `404 Not Found` or falls back safely to the SPA 404 handler.

---

### Task P0-2: Remove Unauthenticated Admin Setup & Enumeration Routes [C-02, H-02, M-05]
- **Target File:** `laravel-react-app/routes/web.php` (Lines 328–376, 383–404)
- **Action:** Delete `/setup-admin`, `/check-admins`, and `/debug-vite` route blocks.
- **Diff:**
  ```diff
  - Route::get('/setup-admin', function () { ... });
  - Route::get('/check-admins', function () { ... });
  - Route::get('/debug-vite', function () { ... });
  ```
- **Validation:** Confirm requests to `/setup-admin`, `/check-admins`, and `/debug-vite` return `404 Not Found`.

---

### Task P0-3: Prevent Automatic Re-Seeding of Default Admin Credentials [C-03]
- **Target Files:**
  - `deploy_vps.sh` (Line 124)
  - `laravel-react-app/database/seeders/AdminSeeder.php` (Lines 16–29)
- **Action:**
  1. Remove automatic forced execution of `AdminSeeder` from `deploy_vps.sh`.
  2. In `AdminSeeder.php`, use `firstOrCreate` rather than `updateOrCreate`, ensuring existing administrator passwords are never overwritten during manual seed runs.
- **Diff for `deploy_vps.sh`:**
  ```diff
  - echo "👤 Ensuring Super Admin account is seeded..."
  - docker exec nutsandnutrition-app php artisan db:seed --class=AdminSeeder --force
  ```
- **Diff for `AdminSeeder.php`:**
  ```diff
  - Admin::updateOrCreate(
  + Admin::firstOrCreate(
        ['email' => 'admin@example.com'],
        [
            'name' => 'Super Admin',
  -         'password' => Hash::make('Admin@123'),
  +         'password' => Hash::make(env('DEFAULT_ADMIN_PASSWORD', 'Admin@123')),
            'role' => 'admin',
            'status' => true,
            'password_changed_at' => now(),
        ]
    );
  ```

---

### Task P0-4: Fix Payment Gateway Bypass in Order Controller [C-04]
- **Target File:** `laravel-react-app/app/Http/Controllers/Api/Customer/OrderController.php` (Line 194)
- **Action:** Enforce that initial payment status for all orders is `'pending'`. Online payments must only transition to `'paid'` after Razorpay webhook verification or signature validation.
- **Diff:**
  ```diff
    $order = Order::create([
        'order_number' => 'NN' . strtoupper(uniqid()),
        'customer_id' => $customerId,
        'payment_method' => $request->payment_method,
        'shipping_method' => 'custom',
        'currency' => 'INR',
        'status' => 'pending',
  -     'payment_status' => $request->payment_method === 'cod' ? 'pending' : 'paid',
  +     'payment_status' => 'pending',
        'subtotal' => $subtotal,
  ```
- **Validation:** Create an order with `payment_method: 'online'`. Verify in database that `payment_status` is `'pending'`.

---

## 3. PHASE P1: HIGH-PRIORITY APPLICATION HARDENING

### Task P1-1: Remove Committed SQLite Database Dump [H-01]
- **Target File:** `laravel-react-app/laravel_react`
- **Action:** Remove from git tracking and add to `.gitignore`.
- **Command:**
  ```bash
  git rm --cached laravel-react-app/laravel_react
  echo "laravel_react" >> laravel-react-app/.gitignore
  ```

---

### Task P1-2: Re-Enable CSRF Protection on Administrative Login [H-06]
- **Target File:** `laravel-react-app/bootstrap/app.php` (Lines 24–26)
- **Action:** Remove the `admin/login` exemption from `$middleware->validateCsrfTokens()`.
- **Diff:**
  ```diff
  - $middleware->validateCsrfTokens(except: [
  -     'admin/login',
  - ]);
  + $middleware->validateCsrfTokens(except: []);
  ```
- **Validation:** Ensure the admin login blade view (`resources/views/admin/auth/login.blade.php`) submits `@csrf` and authenticates successfully.

---

### Task P1-3: Implement Rate Limiting Throttles on Auth & Public APIs [H-05]
- **Target Files:**
  - `laravel-react-app/routes/web.php`
  - `laravel-react-app/routes/customer_api.php`
  - `laravel-react-app/routes/admin_api.php`
- **Action:** Attach `throttle` middleware:
  - Admin login: `throttle:5,1` (Max 5 attempts/minute)
  - Customer login & registration: `throttle:5,1`
  - Customer contact form: `throttle:3,1` (Max 3 messages/minute)
  - Public catalogue queries: `throttle:60,1` (Max 60 requests/minute)
- **Diff (`customer_api.php`):**
  ```diff
  - Route::post('/login', [AuthController::class, 'login']);
  - Route::post('/register', [AuthController::class, 'register']);
  + Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
  + Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
  + Route::post('/contact', [ContactController::class, 'store'])->middleware('throttle:3,1');
  ```

---

### Task P1-4: Sanitize Product Description to Prevent Stored XSS [H-03]
- **Target File:** `laravel-react-app/resources/js/pages/ProductDetails.jsx` (Line 232)
- **Action:** Install and integrate `dompurify` in the frontend build, sanitizing HTML before rendering.
- **Diff:**
  ```diff
  + import DOMPurify from 'dompurify';
  ...
    <div 
      style={{ fontSize: '1.1rem', marginBottom: '2rem', color: 'var(--secondary-text)' }}
  -   dangerouslySetInnerHTML={{ __html: product.description }}
  +   dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description || '') }}
    />
  ```

---

### Task P1-5: Neutralize Stored XSS in Admin Blade Views [H-04]
- **Target Files:**
  - `laravel-react-app/resources/views/admin/users/index.blade.php`
  - `laravel-react-app/resources/views/admin/orders/index.blade.php`
- **Action:** Replace innerHTML concatenations with textContent or sanitized DOM nodes.

---

## 4. PHASE P2: INFRASTRUCTURE & BACKUP HARDENING

### Task P2-1: Configure HTTP Security Headers & Hide Server Tokens [M-01, M-02]
- **Target Files:**
  - `docker/nginx.conf`
  - `deploy_vps.sh` (Host Nginx configuration template)
- **Action:** Add standard security headers and `server_tokens off;`.
- **Nginx Configuration Additions:**
  ```nginx
  server_tokens off;

  # Security Headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  ```

---

### Task P2-2: Restrict File Upload MIME Types in Media Management [M-03]
- **Target File:** `laravel-react-app/app/Http/Requests/Api/Admin/MediaRequest.php` (Line 35)
- **Action:** Remove `svg` from accepted mime types to prevent stored SVG-based XSS attacks.
- **Diff:**
  ```diff
  - 'mimes:jpg,jpeg,png,gif,webp,svg,ico',
  + 'mimes:jpg,jpeg,png,gif,webp,ico',
  ```

---

### Task P2-3: Implement Automated Daily MariaDB Backup Script [M-04]
- **Target Script:** `/home/ubuntu/nutsandnutrition/backup_db.sh`
- **Action:** Create an automated, rotating daily backup script scheduled via cron.
- **Script Implementation:**
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  BACKUP_DIR="/home/ubuntu/nutsandnutrition_backups"
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  mkdir -p "${BACKUP_DIR}"

  echo "📦 Creating compressed database backup..."
  docker exec nutsandnutrition-db mysqldump -u nuts_user -p'NutsNutrition_Secure2026' nuts_nutrition | gzip > "${BACKUP_DIR}/nuts_db_${TIMESTAMP}.sql.gz"

  # Retain last 30 daily backups
  find "${BACKUP_DIR}" -type f -name "nuts_db_*.sql.gz" -mtime +30 -delete
  echo "✅ Backup completed: ${BACKUP_DIR}/nuts_db_${TIMESTAMP}.sql.gz"
  ```
- **Cron Schedule:** `0 2 * * * /home/ubuntu/nutsandnutrition/backup_db.sh > /dev/null 2>&1` (Every morning at 02:00 AM).

---

### Task P2-4: Apply Secure Permissions on Storage and Bootstrap [M-06]
- **Target File:** `deploy_vps.sh`
- **Action:** Replace `chmod -R 777` with secure ownership `www-data:www-data` and permissions (`775` directories, `664` files).

---

## 5. ROLLBACK & DEPLOYMENT VERIFICATION
1. Prior to applying remediations, a full Git commit checkpoint is created.
2. In the event of a build failure or regression, `git revert <commit-id>` restores the exact previous state.
3. Every step in this plan will be verified against the test cases defined in `SECURITY_TEST_PLAN.md`.
