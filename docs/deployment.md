# Deployment

CitySieve runs on a Hostinger KVM 1 VPS (1 vCPU, 4 GB RAM, 50 GB NVMe) at **citysieve.com**.

## Stack

| Layer | Technology |
|-------|-----------|
| App runtime | Docker (Next.js standalone server) |
| Reverse proxy | Nginx |
| SSL | Let's Encrypt (DNS-01 via certbot --manual) |
| Database | SQLite persisted in a Docker named volume (`citysieve_data`) |
| CI/CD | GitHub Actions — push to `master` → SSH deploy |

## Server details

- **OS**: Ubuntu 22.04 LTS
- **VPS**: Hostinger KVM 1
- **App directory**: `~/citysieve`
- **Docker volume**: `citysieve_data` → mounted at `/app/data` inside the container
- **Database file**: `/app/data/prod.db` (inside the volume)
- **Nginx config**: `/etc/nginx/sites-available/citysieve.conf`
- **SSL cert**: `/etc/letsencrypt/live/citysieve.com/`

## Deployment files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: deps → builder → runner (node:20-alpine) |
| `.dockerignore` | Excludes node_modules, .next, .env files, dev.db, docs |
| `docker-compose.yml` | App service on `127.0.0.1:3000`, named volume for SQLite |
| `nginx/citysieve.conf` | Reverse proxy HTTP→3000, acme-challenge passthrough |
| `.env.production.example` | Template for production secrets (never commit `.env.production`) |
| `.github/workflows/deploy.yml` | GitHub Actions CD pipeline |

## Environment variables (production)

Stored in `~/citysieve/.env.production` on the server (never committed to git):

```
DATABASE_URL=file:/app/data/prod.db
AUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://citysieve.com
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXT_PUBLIC_BMAC_USERNAME=alike
NEXT_PUBLIC_AWIN_ID=                    # optional — Awin publisher ID for Rightmove/Zoopla affiliate links
NEXT_PUBLIC_SPONSORED_URL=              # optional — sponsored slot in area modal
NEXT_PUBLIC_SPONSORED_LABEL=            # optional
NEXT_PUBLIC_SPONSORED_TEXT=             # optional
NEXT_PUBLIC_ADSENSE_PUB_ID=             # optional — ca-pub-XXXXXXXXXXXXXXXXX; activates AdSense display ads
NEXT_PUBLIC_ADSENSE_SLOT_INLINE=        # optional — slot ID for inline banner (results page, every 3rd card)
NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD=   # optional — slot ID for leaderboard (landing page)
NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE=     # optional — slot ID for rectangle (results page + area modal)
```

> **Important — build-time env vars**: `NEXT_PUBLIC_*` variables are inlined
> into the JavaScript bundle by Next.js at compile time (during
> `docker compose build`). They are **not** read from the container's runtime
> environment. Docker Compose resolves `${VAR}` interpolation in
> `docker-compose.yml` from a file named `.env` in the project root, so a
> symlink is required on the VPS:
>
> ```bash
> ln -s .env.production ~/citysieve/.env
> ```
>
> Without this symlink, all `NEXT_PUBLIC_*` build args will be empty and
> features like the Buy Me a Coffee button will be missing in production.

## GitHub Actions secrets

Set in https://github.com/alikellaway/citysieve/settings/secrets/actions:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Private SSH key for the VPS |
| `VPS_PORT` | `22` |

## Deploy loop

Every push to `master` triggers `.github/workflows/deploy.yml`:

1. SSH into VPS
2. `git pull origin master`
3. `docker compose build --no-cache`
4. `docker compose run --rm app npx prisma migrate deploy`
5. `docker compose up -d`

Monitor runs at: https://github.com/alikellaway/citysieve/actions

## First-time server setup (run once)

```bash
# Install Nginx + Certbot
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

# Clone repo
git clone https://github.com/alikellaway/citysieve.git ~/citysieve

# Create production env file
cp ~/citysieve/.env.production.example ~/citysieve/.env.production
nano ~/citysieve/.env.production   # fill in real values

# Symlink .env -> .env.production so Docker Compose can interpolate
# NEXT_PUBLIC_* build args from the same file used for runtime env vars.
# (Next.js bakes NEXT_PUBLIC_* into the JS bundle at build time, so they
# must be present during `docker compose build`, not just at container start.)
ln -s .env.production ~/citysieve/.env

# First build + migrate + start
cd ~/citysieve
docker compose build
docker compose run --rm app npx prisma migrate deploy
docker compose up -d

# Wire up Nginx
sudo cp ~/citysieve/nginx/citysieve.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/citysieve.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## SSL certificate

Let's Encrypt cert obtained via DNS-01 challenge (required because Hostinger's
network injects extra IPs that break HTTP-01 validation):

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d citysieve.com -d www.citysieve.com
sudo certbot install --cert-name citysieve.com --nginx
```

**Note**: `--manual` certs do not auto-renew. Renew before expiry (check with
`sudo certbot certificates`). Cert expires 90 days from issue. To renew, repeat
the certbot commands above and add the new TXT record to GoDaddy DNS.

## Useful server commands

```bash
# Check app status
docker compose ps
docker compose logs -f

# Restart app
docker compose restart

# Manual deploy (same as CI/CD)
cd ~/citysieve
git pull origin master
docker compose build --no-cache
docker compose run --rm app npx prisma migrate deploy
docker compose up -d

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check SSL cert expiry
sudo certbot certificates
```

## DNS (GoDaddy)

| Type | Name | Value |
|------|------|-------|
| A | `@` | VPS IP |
| CNAME | `www` | `citysieve.com` |

## Google OAuth

Authorised redirect URIs in Google Cloud Console:
- `https://citysieve.com/api/auth/callback/google`

Authorised JavaScript origins:
- `https://citysieve.com`
