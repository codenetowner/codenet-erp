# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/company

# Copy frontend package files
COPY company/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY company/ ./
RUN npm run build

# Stage 2: Build Backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
WORKDIR /src

# Copy csproj and restore dependencies
COPY backend/*.csproj ./
RUN dotnet restore

# Copy backend source and build
COPY backend/ ./
RUN dotnet publish -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Copy backend published output
COPY --from=backend-build /app/publish .

# Copy frontend build to wwwroot
COPY --from=frontend-build /app/company/dist ./wwwroot

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Run the application
ENTRYPOINT ["dotnet", "CashVan.API.dll"]
