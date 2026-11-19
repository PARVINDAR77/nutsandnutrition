# MASTER SECURITY LOGGING, MONITORING & INCIDENT RESPONSE PLAN
**Target:** `https://nutsandnutrition.shop`  
**Host:** Ubuntu 24.04 (`vmi3189237`, IP: `95.111.242.173`)  
**Scope:** Host Nginx, Container PHP-FPM, Laravel Application Logs, MariaDB Slow & Audit Logs  

---

## 1. MONITORING & OBSERVABILITY OBJECTIVES
To ensure that threats are detected in real-time, prevented before damage occurs, and investigated with forensically sound audit trails, the following monitoring architecture is established:

```
[ Ingress Traffic ]
       │
       ▼
 [ Host Nginx: /var/log/nginx/access.log & error.log ]
       │
       ▼
 [ Container Nginx: /var/log/nginx/access.log ]
       │
       ▼
 [ Laravel Monolog: storage/logs/laravel.log & security.log ]
       │
       ▼
 [ MariaDB: /var/log/mysql/error.log ]
```

---

## 2. STRUCTURED SECURITY LOGGING STANDARDS

### 2.1 Critical Security Events to Log
The application must record structured JSON log entries for all significant security events:

1. **Authentication Events:**
   - Successful login (user ID, role, IP address, user agent, timestamp).
   - Failed login attempt (attempted email/username, source IP, failure reason).
   - Password reset requests and completions.
   - Logout events and session revocations.
2. **Access Control & Authorization Failures:**
   - Unauthorized attempts to access administrative endpoints (`403 Forbidden`).
   - Attempts to access non-existent administrative or debug URLs (potential scans).
   - CSRF token validation failures.
3. **Transaction & Financial Events:**
   - Order creation attempts, payment initialization, gateway callbacks.
   - Razorpay signature verification failures (flagged as High Alert).
   - Coupon usage and repeated discount attempts.
4. **Input & Rate Limiting Violations:**
   - HTTP 429 Too Many Requests triggers on auth endpoints.
   - Malformed payloads or validation failures exceeding normal thresholds.

### 2.2 Security Log Format Standard
All application security events must follow this structured JSON schema in `storage/logs/security.log`:
```json
{
  "timestamp": "2026-11-19T14:45:00+05:30",
  "level": "WARNING",
  "channel": "security",
  "event_type": "AUTH_FAILED_RATE_LIMIT",
  "ip_address": "203.0.113.195",
  "user_agent": "Mozilla/5.0 ...",
  "target_endpoint": "/api/customer/login",
  "context": {
    "attempted_user": "test@example.com",
    "attempts_count": 6
  }
}
```

---

## 3. THREAT DETECTION & ALERTING THRESHOLDS

| Threat Category | Indicator / Trigger | Threshold | Alert Severity | Immediate Action |
| :--- | :--- | :--- | :--- | :--- |
| **Credential Stuffing** | Consecutive HTTP 401/429 on `/login` | > 10 attempts in 60s from single IP | **HIGH** | Temporarily block IP via UFW / Fail2ban |
| **Route Probing / Scanning** | 404 responses for `/run-migration`, `/setup-admin`, `/wp-admin`, `/.env` | > 5 scan hits in 30s | **HIGH** | Log IP address to threat radar |
| **Payment Signature Tamper** | Razorpay signature validation failure | 1 occurrence | **CRITICAL** | Reject order immediately, flag transaction |
| **Admin Privilege Abuse** | Admin password change or profile update | 1 occurrence | **MEDIUM** | Send security email confirmation to admin |
| **5xx Server Spike** | HTTP 500 / 502 error rates | > 2% of total traffic over 5m | **HIGH** | DevSecOps team alert, inspect container logs |

---

## 4. INCIDENT RESPONSE RUNBOOKS

### Runbook IR-01: Response to Suspicious Admin Access
1. **Identification:** An unexpected administrative login occurs from an unrecognized geographic IP or device.
2. **Containment:**
   - Immediately terminate all active sessions:
     ```bash
     docker exec nutsandnutrition-app php artisan auth:clear-resets
     ```
   - Invalidate the compromised admin password:
     ```bash
     docker exec -i nutsandnutrition-db mysql -u nuts_user -p'NutsNutrition_Secure2026' nuts_nutrition -e "UPDATE admins SET status=0 WHERE email='compromised@example.com';"
     ```
3. **Eradication:**
   - Inspect administrative action audit trails in database (`order_status_history`, catalog modifications).
   - Verify no new administrative users were created:
     ```bash
     docker exec -i nutsandnutrition-db mysql -u nuts_user -p'NutsNutrition_Secure2026' nuts_nutrition -e "SELECT id, name, email, role, created_at FROM admins;"
     ```
4. **Recovery:**
   - Restore legitimate administrator account with a cryptographically strong, unique password.
   - Re-enable account and verify multi-factor authentication (if applicable).

---

### Runbook IR-02: Response to Database Corruption or Accidental Wipe
1. **Identification:** Store returns empty product listings, missing customer records, or 500 error indicating missing tables.
2. **Containment:**
   - Immediately set application to maintenance mode:
     ```bash
     docker exec nutsandnutrition-app php artisan down --secret="emergency-restore-token"
     ```
3. **Restoration:**
   - Identify latest verified daily backup file:
     ```bash
     LATEST_BACKUP=$(ls -t /home/ubuntu/nutsandnutrition_backups/nuts_db_*.sql.gz | head -n 1)
     ```
   - Restore database from compressed dump:
     ```bash
     gunzip < "${LATEST_BACKUP}" | docker exec -i nutsandnutrition-db mysql -u nuts_user -p'NutsNutrition_Secure2026' nuts_nutrition
     ```
   - Verify integrity:
     ```bash
     docker exec -i nutsandnutrition-db mysql -u nuts_user -p'NutsNutrition_Secure2026' nuts_nutrition -e "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM orders;"
     ```
4. **Recovery:**
   - Bring application back online:
     ```bash
     docker exec nutsandnutrition-app php artisan up
     ```

---

## 5. AUTOMATED LOG ROTATION & DISK HYGIENE

To prevent server disk exhaustion from Docker and Nginx logs:

1. **Host Nginx Logrotate (`/etc/logrotate.d/nginx`):**
   ```
   /var/log/nginx/*.log {
       daily
       missingok
       rotate 14
       compress
       delaycompress
       notifempty
       create 0640 www-data adm
       sharedscripts
       postrotate
           if [ -f /var/run/nginx.pid ]; then
               kill -USR1 `cat /var/run/nginx.pid`
           fi
       endscript
   }
   ```
2. **Docker Container Log Limits (`docker-compose.yml`):**
   Enforce log max-size and max-file retention on all services to prevent runaway logs:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "50m"
       max-file: "5"
   ```
