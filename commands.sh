# ==================== DEV ======================
### client 
docker build -f Dockerfile.dev -t milosfaktor/client .
docker run -e CI=true  milosfaktor/client:latest npm test

### server 
docker build -f Dockerfile.dev -t milosfaktor/server .

### worker
docker build -f Dockerfile.dev -t milosfaktor/worker .

### docker compose
docker compose -f docker-compose-dev.yml up --build

# removing volumes from docker compose
docker compose -f docker-compose-dev.yml down -v

# ================================================

# ==================== PROD ======================


