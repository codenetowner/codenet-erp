# Catalyst Server Documentation

Complete documentation for deploying Catalyst project to Google Cloud Ubuntu server.

---

## Server Information

| Property | Value |
|----------|-------|
| **Provider** | Google Cloud Platform |
| **OS** | Ubuntu |
| **IP Address** | `34.18.148.37` |
| **Domain** | `quicktech-lb.com` |
| **SSH User** | `quicktech_ai` |
| **SSH Port** | 22 |

---

## Credentials

### SSH Access
```
User: quicktech_ai
Server: 34.18.148.37
SSH Key: Stored in GitHub Secrets as SERVER_SSH_KEY
```

### PostgreSQL Database
```
Host: localhost
Port: 5432
Database: Catalyst
Username: postgres
Password: admin123
```

### JWT Authentication
```
Secret: CatalystSuperSecretKey2026ForProductionEnvironment123!
Issuer: CatalystAPI
Audience: CatalystClients
Expiration: 1440 minutes (24 hours)
```

### GitHub Repository
```
URL: https://github.com/quicktechai-ops/Catalyst-main.git
Branch: master
```

### GitHub Secrets (for Actions)
| Secret Name | Description |
|-------------|-------------|
| `SERVER_HOST` | `34.18.148.37` |
| `SERVER_USER` | `quicktech_ai` |
| `SERVER_SSH_KEY` | Private SSH key for server access |
| `GH_PAT` | GitHub Personal Access Token for git operations |

---

## Project Structure

```
Catalyst-main/
├── backend/           # .NET 9 API
├── admin/             # React Admin Dashboard (Super Admin)
├── company/           # React Company Portal
├── driver/            # React Driver App
├── salesman/          # React Salesman App
└── .github/workflows/ # GitHub Actions for auto-deploy
```

---

## Server Directory Structure

```
~/Catalyst/                              # Main project directory
├── backend/
│   ├── bin/Release/net9.0/            # Built .NET application
│   └── appsettings.Production.json    # Production config
├── admin/dist/                         # Built admin frontend
├── company/dist/                       # Built company frontend
├── driver/dist/                        # Built driver frontend
└── salesman/dist/                      # Built salesman frontend
```

---

## URLs & Endpoints

### Frontend URLs
| App | URL | Base Path |
|-----|-----|-----------|
| Company Portal | `https://quicktech-lb.com/Catalyst/` | `/Catalyst/` |
| Admin Dashboard | `https://quicktech-lb.com/Catalystadmin/` | `/Catalystadmin/` |
| Driver App | `https://quicktech-lb.com/Catalystdriver/` | `/Catalystdriver/` |
| Salesman App | `https://quicktech-lb.com/Catalystsalesman/` | `/Catalystsalesman/` |

### API Endpoints
```
Base URL: https://quicktech-lb.com/Catalystapi/api
Login: POST /Catalystapi/api/auth/login
```

---

## Configuration Files

### Backend Production Config
**File:** `backend/appsettings.Production.json`
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=Catalyst;Username=postgres;Password=admin123"
  },
  "JwtSettings": {
    "Secret": "CatalystSuperSecretKey2026ForProductionEnvironment123!",
    "Issuer": "CatalystAPI",
    "Audience": "CatalystClients",
    "ExpirationInMinutes": 1440
  }
}
```

### Frontend Vite Config (Example: company)
**File:** `company/vite.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/Catalyst/',
})
```

### Frontend API Config (Example: company)
**File:** `company/src/lib/api.ts`
```typescript
const api = axios.create({
  baseURL: 'https://quicktech-lb.com/Catalystapi/api',
})
```

---

## Systemd Service

**File:** `/etc/systemd/system/Catalyst-api.service`
```ini
[Unit]
Description=Catalyst API
After=network.target

[Service]
WorkingDirectory=/home/quicktech_ai/Catalyst/backend/bin/Release/net9.0
ExecStart=/home/quicktech_ai/.dotnet/dotnet /home/quicktech_ai/Catalyst/backend/bin/Release/net9.0/backend.dll
Restart=always
RestartSec=10
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000
User=quicktech_ai

[Install]
WantedBy=multi-user.target
```

### Service Commands
```bash
sudo systemctl start Catalyst-api
sudo systemctl stop Catalyst-api
sudo systemctl restart Catalyst-api
sudo systemctl status Catalyst-api
sudo journalctl -u Catalyst-api -f  # View logs
```

---

## Nginx Configuration

**File:** `/etc/nginx/sites-available/restaurant` (or similar)

```nginx
# Catalyst API
location /Catalystapi/ {
    proxy_pass http://localhost:5000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection keep-alive;
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Company Frontend
location /Catalyst/ {
    alias /home/quicktech_ai/Catalyst/company/dist/;
    try_files $uri $uri/ /Catalyst/index.html;
}

# Admin Frontend
location /Catalystadmin/ {
    alias /home/quicktech_ai/Catalyst/admin/dist/;
    try_files $uri $uri/ /Catalystadmin/index.html;
}

# Driver Frontend
location /Catalystdriver/ {
    alias /home/quicktech_ai/Catalyst/driver/dist/;
    try_files $uri $uri/ /Catalystdriver/index.html;
}

# Salesman Frontend
location /Catalystsalesman/ {
    alias /home/quicktech_ai/Catalyst/salesman/dist/;
    try_files $uri $uri/ /Catalystsalesman/index.html;
}
```

### Nginx Commands
```bash
sudo nginx -t                    # Test config
sudo systemctl reload nginx      # Reload config
sudo systemctl restart nginx     # Restart nginx
```

---

## GitHub Actions Auto-Deploy

**File:** `.github/workflows/deploy.yml`
```yaml
name: Deploy to Server

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to Server
        uses: appleboy/ssh-action@v1.0.3
        env:
          GH_PAT: ${{ secrets.GH_PAT }}
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script_stop: true
          envs: GH_PAT
          script: |
            set -e
            cd ~/Catalyst
            
            git remote set-url origin https://${GH_PAT}@github.com/quicktechai-ops/Catalyst-main.git
            git fetch origin
            git reset --hard origin/master
            
            # Rebuild backend
            cd ~/Catalyst/backend
            ~/.dotnet/dotnet build --configuration Release
            cp ~/Catalyst/backend/appsettings.Production.json ~/Catalyst/backend/bin/Release/net9.0/
            sudo systemctl restart Catalyst-api
            
            # Rebuild frontends
            cd ~/Catalyst/admin && npm install && npm run build
            cd ~/Catalyst/company && npm install && npm run build
            cd ~/Catalyst/driver && npm install && npm run build
            cd ~/Catalyst/salesman && npm install && npm run build
```

---

## Deployment Steps (Manual)

### 1. Initial Server Setup
```bash
# SSH to server
ssh quicktech_ai@34.18.148.37

# Install .NET 9
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --version 9.0.100
echo 'export PATH=$PATH:$HOME/.dotnet' >> ~/.bashrc
source ~/.bashrc

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
```

### 2. Configure PostgreSQL
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'admin123';
CREATE DATABASE Catalyst;
\q
```

### 3. Clone Repository
```bash
cd ~
git clone https://github.com/quicktechai-ops/Catalyst-main.git Catalyst
```

### 4. Build Backend
```bash
cd ~/Catalyst/backend
~/.dotnet/dotnet build --configuration Release
cp appsettings.Production.json bin/Release/net9.0/
```

### 5. Build Frontends
```bash
cd ~/Catalyst/admin && npm install && npm run build
cd ~/Catalyst/company && npm install && npm run build
cd ~/Catalyst/driver && npm install && npm run build
cd ~/Catalyst/salesman && npm install && npm run build
```

### 6. Create Systemd Service
```bash
sudo nano /etc/systemd/system/Catalyst-api.service
# (paste service config from above)
sudo systemctl daemon-reload
sudo systemctl enable Catalyst-api
sudo systemctl start Catalyst-api
```

### 7. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/restaurant
# (add location blocks from above)
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Configure Passwordless Sudo (for auto-deploy)
```bash
sudo visudo
# Add this line:
quicktech_ai ALL=(ALL) NOPASSWD: /bin/systemctl restart Catalyst-api
```

---

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
sudo journalctl -u Catalyst-api -n 50

# Common issues:
# - Wrong PostgreSQL password in appsettings.Production.json
# - Missing JWT secret
# - Port 5000 already in use
```

### Frontend 404 Errors
```bash
# Check nginx config
sudo nginx -t

# Verify dist folders exist
ls -la ~/Catalyst/company/dist/
ls -la ~/Catalyst/admin/dist/
```

### Database Connection Failed
```bash
# Test PostgreSQL
sudo -u postgres psql -c "SELECT 1"

# Check password
psql -U postgres -d Catalyst -h localhost
```

### GitHub Actions Failing
- Check `GH_PAT` secret is valid and has `repo` scope
- Check `SERVER_SSH_KEY` is the private key (starts with `-----BEGIN`)
- Check server IP and username are correct

---

## Data Migration (from Neon to Local PostgreSQL)

### Export from Neon
```bash
pg_dump "postgresql://user:pass@neon-host/Catalyst" > Catalyst_backup.sql
```

### Import to Server
```bash
scp Catalyst_backup.sql quicktech_ai@34.18.148.37:~/
ssh quicktech_ai@34.18.148.37
psql -U postgres -d Catalyst < ~/Catalyst_backup.sql
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | .NET 9, Entity Framework Core |
| Frontend | React, Vite, TailwindCSS |
| Database | PostgreSQL |
| Web Server | Nginx (reverse proxy) |
| Process Manager | systemd |
| CI/CD | GitHub Actions |
| Auth | JWT Bearer Tokens |

---

## Important Notes

1. **Production Config**: The `appsettings.Production.json` is tracked in git. After `git reset --hard`, always verify the password is `admin123`.

2. **SSL**: SSL is handled by Nginx with existing certificates for `quicktech-lb.com`.

3. **Auto-Deploy**: Any push to `master` triggers automatic deployment via GitHub Actions.

4. **Frontend Base Paths**: Each frontend has its own base path configured in `vite.config.ts` and React Router.

5. **Logout Redirect**: Each frontend redirects to its own login page (e.g., `/Catalyst/login`, `/Catalystadmin/login`).

---

*Last Updated: January 2026*
