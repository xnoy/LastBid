#!/bin/bash
set -e

echo "==> Starting PostgreSQL & Redis for BidNova..."

# 1. PostgreSQL container
if sudo docker ps -a --format '{{.Names}}' | grep -q "^bidnova-postgres$"; then
  echo "--> Starting existing bidnova-postgres container..."
  sudo docker start bidnova-postgres
else
  echo "--> Creating and starting bidnova-postgres container..."
  sudo docker run -d --name bidnova-postgres --restart unless-stopped \
    -p 5432:5432 \
    -e POSTGRES_USER=bidnova \
    -e POSTGRES_PASSWORD=bidnova \
    -e POSTGRES_DB=bidnova \
    -v bidnova-pgdata:/var/lib/postgresql/data \
    postgres:16-alpine
fi

# 2. Redis container
if sudo docker ps -a --format '{{.Names}}' | grep -q "^bidnova-redis$"; then
  echo "--> Starting existing bidnova-redis container..."
  sudo docker start bidnova-redis
else
  echo "--> Creating and starting bidnova-redis container..."
  sudo docker run -d --name bidnova-redis --restart unless-stopped \
    -p 6379:6379 \
    -v bidnova-redisdata:/data \
    redis:7-alpine redis-server --appendonly yes
fi

# 3. Wait for PostgreSQL to be fully ready
echo "--> Waiting for PostgreSQL to accept connections..."
until sudo docker exec bidnova-postgres pg_isready -U bidnova -d bidnova >/dev/null 2>&1; do
  sleep 1
done

echo ""
echo "✅ SUCCESS: Postgres (port 5432) and Redis (port 6379) are active!"
