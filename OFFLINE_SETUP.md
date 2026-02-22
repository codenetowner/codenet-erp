# Catalyst Offline Setup Guide

This guide explains how to set up and run Catalyst (CashVan) system in **offline mode** for environments without internet connectivity.

## Prerequisites

1. **PostgreSQL** - Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)
   - During installation, remember your PostgreSQL password
   - Ensure PostgreSQL `bin` folder is added to your PATH

2. **.NET 8 SDK** - Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0)

3. **Node.js** (v18+) - Download from [nodejs.org](https://nodejs.org/)

## Quick Setup

### 1. Initial Offline Setup

Run the setup wizard to configure the local database:

```batch
setup-offline.bat
```

This will:
- Create a local PostgreSQL database (`cashvan_local`)
- Apply the database schema
- Configure all portals to use the local backend

### 2. Start in Offline Mode

```batch
start-offline.bat
```

### 3. Start in Online Mode (when internet is available)

```batch
start-online.bat
```

## Switching Between Modes

Use the mode switcher to toggle between offline and online:

```batch
switch-mode.bat
```

## Manual Configuration

### Backend Configuration

The backend uses different configuration files based on the environment:

| File | Environment | Usage |
|------|-------------|-------|
| `appsettings.json` | Development | Uses cloud database |
| `appsettings.Local.json` | Local | Uses local PostgreSQL |
| `appsettings.Production.json` | Production | Production settings |

### Portal Configuration

Each portal uses `.env.local` for offline mode:

| Portal | Config File | API URL |
|--------|-------------|---------|
| Admin | `admin/.env.local` | `http://localhost:5227/api` |
| Company | `company/.env.local` | `http://localhost:5227/api` |
| Driver | `driver/.env.local` | `http://localhost:5227/api` |
| Salesman | `salesman/.env.local` | `http://localhost:5227/api` |
| Delivery | `delivery-portal/.env.local` | `http://localhost:5227/api` |

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Backend API | 5227 | http://localhost:5227 |
| Company Portal | 3000 | http://localhost:3000 |
| Driver Portal | 3002 | http://localhost:3002 |
| Salesman Portal | 5175 | http://localhost:5175 |
| Admin Portal | 5176 | http://localhost:5176 |
| Delivery Portal | 8083 | http://localhost:8083 |

## Database Management

### Backup Local Database

```batch
pg_dump -h localhost -U postgres -d cashvan_local > backup.sql
```

### Restore Database

```batch
psql -h localhost -U postgres -d cashvan_local < backup.sql
```

### Reset Database

To reset and apply fresh schema:

```batch
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS cashvan_local;"
psql -h localhost -U postgres -c "CREATE DATABASE cashvan_local;"
psql -h localhost -U postgres -d cashvan_local -f cashvan_schema.sql
```

## Troubleshooting

### PostgreSQL Not Found
- Ensure PostgreSQL is installed
- Add `C:\Program Files\PostgreSQL\{version}\bin` to your system PATH
- Restart command prompt after PATH changes

### Database Connection Failed
- Check PostgreSQL service is running: `services.msc` > PostgreSQL
- Verify password in `backend/appsettings.Local.json`

### Portal Not Connecting to Backend
- Ensure backend is running first (wait 5 seconds)
- Check `.env.local` files exist in each portal folder
- Verify `VITE_API_URL=http://localhost:5227/api`

### CORS Errors
- The backend is configured to allow all origins in local mode
- If issues persist, restart the backend

## Data Synchronization (Future)

For syncing data between offline and online modes:

1. Export data from local database
2. Connect to online mode
3. Import data to cloud database

*Note: Automatic sync feature may be added in future updates.*
