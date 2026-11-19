# LOAD BALANCING, CAPACITY & TRAFFIC DISTRIBUTION REPORT
**Target System:** `https://nutsandnutrition.shop`  
**Host Server:** Ubuntu 24.04 LTS (Host: `vmi3189237`, IP: `95.111.242.173`)  
**Evaluated By:** Infrastructure & Cloud Performance Engineering  
**Date:** November 19, 2026  

---

## 1. EXECUTIVE SUMMARY & CURRENT STATUS

> **DIRECT FINDING: NO ACTIVE LOAD BALANCING EXISTS**  
> Currently, `https://nutsandnutrition.shop` operates on a **Single-Node Reverse Proxy architecture** with **zero load balancing**. All incoming traffic hits a single public IP address, passes through a single Host Nginx reverse proxy, and is forwarded directly to a **single Docker container** (`nutsandnutrition-app:8098`).

### Architecture Comparison
```
[ CURRENT: SINGLE POINT OF FAILURE ]
Internet Traffic ──► Host Nginx (Port 443) ──► Single Container (8098) ──► Single MariaDB (3307)
                                              (If this restarts: 502 Bad Gateway)

[ RECOMMENDED: LOCAL CONTAINER LOAD BALANCING (Nginx Upstream) ]
Internet Traffic ──► Host Nginx ──┬──► Container Replicas #1 (8098) ──┐
                                  └──► Container Replicas #2 (8099) ──┴──► MariaDB (3307)
                                  (Auto failover + Zero downtime deploys)
```

---

## 2. DETAILED INFRASTRUCTURE INSPECTION

### 2.1 Layer-by-Layer Traffic Path
1. **DNS Layer:**
   - Single A Record pointing to `95.111.242.173`.
   - **Load Balancing:** None. No Geo-DNS, no DNS round-robin.
2. **CDN / Edge Layer:**
   - No Edge CDN (such as Cloudflare) is active in front of the origin IP.
   - Every single asset request (HTML, CSS, JS, images, font files) travels across international networks directly to the Contabo VPS in Germany (`vmi3189237`).
3. **Host Reverse Proxy Layer:**
   - Configured at `/etc/nginx/sites-available/nutsandnutrition.shop.conf`.
   - Uses a direct 1:1 `proxy_pass http://127.0.0.1:8098;` without any `upstream` group or load-balancing algorithm (`least_conn`, `round_robin`, `ip_hash`).
4. **Application Container Layer:**
   - Single Docker container `nutsandnutrition-app`.
   - Supervised PHP-FPM process pool running with `pm.max_children = 16`.
5. **Database Layer:**
   - Single MariaDB container `nutsandnutrition-db` on loopback `127.0.0.1:3307`.

---

## 3. CAPACITY, CONCURRENCY & BOTTLENECK ANALYSIS

### 3.1 Maximum Concurrency Limits
| Component | Metric / Limit | Real-World Impact |
| :--- | :--- | :--- |
| **PHP-FPM Worker Pool** | `max_children = 16` | At most **16 concurrent dynamic PHP requests** (database queries, auth checks, checkout) can execute at the exact same millisecond. If 40 customers submit orders simultaneously, 24 requests will be queued or receive timeout errors. |
| **Host Process Redundancy** | 1 App Container | If the container restarts or reloads during a deployment, all users experience **502 Bad Gateway**. |
| **Server Resource Contention** | 8 Concurrent Docker Projects | The host `vmi3189237` currently runs: `nutsandnutrition`, `knotelle`, `admafia`, `convoza`, `emperor-nexus`, `talknex`, `aviatorguide`, and `rockyblog`. CPU and RAM are shared across 8 stacks. |

### 3.2 Live Latency & Response Benchmark
Live HTTP/TLS timing benchmarks from external measurement:
```
- DNS Resolution:         0.118s
- TCP Connection:         0.245s
- TLS Handshake (SSL):    0.936s
- Time To First Byte:     1.408s
- Total Response Time:    1.408s
- HTTP Status:            200 OK
```
*Note: Because the origin VPS is located in Europe, Indian and Asian visitors face ~1.4s TTFB without a CDN edge layer.*

---

## 4. LOAD BALANCING IMPLEMENTATION ROADMAP

### Level 1: Edge CDN Load Balancing (Cloudflare) — *Recommended (Free & Immediate)*
**Impact:** Absorbs 70% to 85% of traffic before it reaches your VPS.
- **How it works:** Set Cloudflare nameservers on your domain registrar.
- **Benefits:**
  - Static assets (images, CSS, JS, fonts) are cached in Indian edge data centers (Mumbai, Delhi, Bangalore, Chennai), cutting load times from ~1.4s to <100ms.
  - Automatic Layer 7 DDoS mitigation and automated rate buffering.
  - Free SSL and automated traffic caching.

---

### Level 2: Local Container Load Balancing (Nginx Upstream Cluster)
**Impact:** Eliminates 502 Bad Gateway downtime during deployments and doubles dynamic request throughput.
- **How it works:**
  1. Update `docker-compose.yml` to run two application instances:
     - `nutsandnutrition-app-1` on port `8098`
     - `nutsandnutrition-app-2` on port `8099`
  2. Configure Host Nginx with an `upstream` pool:
     ```nginx
     upstream nuts_app_cluster {
         least_conn;
         server 127.0.0.1:8098 max_fails=3 fail_timeout=10s;
         server 127.0.0.1:8099 max_fails=3 fail_timeout=10s;
     }

     server {
         ...
         location / {
             proxy_pass http://nuts_app_cluster;
             ...
         }
     }
     ```
  3. **Result:** If one container crashes or is being rebuilt, Host Nginx automatically routes 100% of traffic to the healthy container with zero downtime.

---

### Level 3: Multi-Server High-Availability Cluster (Enterprise Scale)
**For when traffic exceeds 100,000+ daily visitors:**
1. A dedicated external Load Balancer (HAProxy or Cloud Load Balancer) in front.
2. Two or more independent VPS worker nodes.
3. Centralized external MariaDB cluster and shared Redis session store.
