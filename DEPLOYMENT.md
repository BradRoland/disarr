# 🚀 Deployment Guide

This guide covers different deployment scenarios for the HomeLab Discord Bot, from simple Docker deployments to advanced production setups.

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Docker Deployment](#-docker-deployment)
- [Production Deployment](#-production-deployment)
- [Development Setup](#-development-setup)
- [Troubleshooting](#-troubleshooting)
- [Security Considerations](#-security-considerations)

## ⚡ Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Discord Bot Token
- Discord Server with Administrator permissions

### 1. Clone and Configure
```bash
git clone https://github.com/BradRoland/disarr.git
cd disarr
cp .env.example .env
```

### 2. Basic Configuration
Edit `.env` with your Discord bot credentials:
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_server_id_here
```

### 3. Deploy
```bash
docker-compose up -d
```

### 4. Verify
```bash
docker logs disarr
```

## 🐳 Docker Deployment

### Standard Deployment

The standard deployment uses the provided `docker-compose.yml`:

```bash
# Start the bot
docker-compose up -d

# View logs
docker logs disarr

# Stop the bot
docker-compose down
```

### Custom Configuration

#### Custom Docker Socket Path
If your Docker socket is in a non-standard location:

```env
# In your .env file
DOCKER_SOCKET_PATH=/custom/path/to/docker.sock
```

#### Custom Ports
If you need to expose additional ports:

```yaml
# In docker-compose.yml
ports:
  - "3000:3000"  # Example: expose port 3000
```

### Volume Management

#### Using Named Volumes
For better portability, use named volumes:

```yaml
# In docker-compose.yml
volumes:
  bot-config:
    driver: local
  bot-logs:
    driver: local

services:
  disarr:
    volumes:
      - bot-config:/app/config
      - bot-logs:/app/logs
```

#### Backup Configuration
```bash
# Backup configuration
docker run --rm -v disarr_config:/data -v $(pwd):/backup alpine tar czf /backup/config-backup.tar.gz -C /data .

# Restore configuration
docker run --rm -v disarr_config:/data -v $(pwd):/backup alpine tar xzf /backup/config-backup.tar.gz -C /data
```

## 🏭 Production Deployment

### High Availability Setup

#### Using Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml homelab-bot
```

#### Using Kubernetes
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: disarr
spec:
  replicas: 1
  selector:
    matchLabels:
      app: disarr
  template:
    metadata:
      labels:
        app: disarr
    spec:
      containers:
      - name: bot
        image: BradRoland/discordbotproject-disarr:latest
        env:
        - name: DISCORD_TOKEN
          valueFrom:
            secretKeyRef:
              name: discord-secrets
              key: token
        volumeMounts:
        - name: config
          mountPath: /app/config
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: config
        persistentVolumeClaim:
          claimName: bot-config-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: bot-logs-pvc
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  disarr:
    image: BradRoland/discordbotproject-disarr:latest
    container_name: disarr
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      # ... other environment variables
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:rw
      - bot-config:/app/config
      - bot-logs:/app/logs
    user: "0:0"
    privileged: true
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "pgrep", "-f", "node.*src/index.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  bot-config:
    driver: local
  bot-logs:
    driver: local

networks:
  default:
    driver: bridge
```

### Environment-Specific Configurations

#### Development Environment
```env
NODE_ENV=development
REFRESH_INTERVAL=10000
LOG_LEVEL=debug
```

#### Staging Environment
```env
NODE_ENV=staging
REFRESH_INTERVAL=20000
LOG_LEVEL=info
```

#### Production Environment
```env
NODE_ENV=production
REFRESH_INTERVAL=30000
LOG_LEVEL=warn
```

## 🛠️ Development Setup

### Local Development

#### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (optional, for testing)

#### Setup
```bash
# Clone repository
git clone https://github.com/BradRoland/disarr.git
cd disarr

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure environment
# Edit .env with your settings

# Start in development mode
npm run dev
```

#### Development Scripts
```bash
# Start with auto-reload
npm run dev

# Start production build
npm start

# Run tests
npm test

# Lint code
npm run lint

# Build Docker image
npm run docker:build
```

### Testing with Docker

#### Build Test Image
```bash
# Build development image
docker build -t disarr:dev .

# Run with development configuration
docker run -d \
  --name disarr-dev \
  --env-file .env.dev \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  disarr:dev
```

#### Debug Mode
```bash
# Run with debug logging
docker run -it \
  --name disarr-debug \
  --env-file .env \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  disarr:latest
```

## 🔧 Troubleshooting

### Common Issues

#### Bot Not Responding
```bash
# Check container status
docker ps

# View logs
docker logs disarr

# Check Discord token
docker exec disarr env | grep DISCORD_TOKEN
```

#### Docker Monitoring Not Working
```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# Test Docker access
docker exec disarr ls -la /var/run/docker.sock

# Check container permissions
docker exec disarr id
```

#### Service Connection Issues
```bash
# Test service connectivity
docker exec disarr curl -I http://jellyfin.yourdomain.com

# Check DNS resolution
docker exec disarr nslookup jellyfin.yourdomain.com

# Verify API keys
docker exec disarr env | grep API_KEY
```

### Log Analysis

#### Enable Debug Logging
```env
# In .env file
NODE_ENV=development
LOG_LEVEL=debug
```

#### Log Rotation
```yaml
# In docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

#### Centralized Logging
```yaml
# Using ELK Stack
logging:
  driver: "gelf"
  options:
    gelf-address: "udp://logstash:12201"
    tag: "disarr"
```

### Performance Optimization

#### Resource Limits
```yaml
# In docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

#### Health Checks
```yaml
# In docker-compose.yml
healthcheck:
  test: ["CMD", "pgrep", "-f", "node.*src/index.js"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## 🔒 Security Considerations

### Container Security

#### Non-Root User (Development)
```dockerfile
# In Dockerfile
RUN adduser -D -s /bin/sh botuser
USER botuser
```

#### Read-Only Filesystem
```yaml
# In docker-compose.yml
read_only: true
tmpfs:
  - /tmp
  - /app/logs
```

#### Security Scanning
```bash
# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image BradRoland/discordbotproject-disarr:latest
```

### Network Security

#### Internal Networks
```yaml
# In docker-compose.yml
networks:
  internal:
    driver: bridge
    internal: true
  external:
    driver: bridge

services:
  disarr:
    networks:
      - internal
      - external
```

#### Firewall Rules
```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 2376/tcp   # Docker API (if exposed)
```

### Secrets Management

#### Using Docker Secrets
```yaml
# In docker-compose.yml
secrets:
  discord_token:
    file: ./secrets/discord_token.txt
  api_keys:
    file: ./secrets/api_keys.txt

services:
  disarr:
    secrets:
      - discord_token
      - api_keys
```

#### Using External Secret Managers
```yaml
# With HashiCorp Vault
environment:
  - VAULT_ADDR=https://vault.yourdomain.com
  - VAULT_TOKEN=${VAULT_TOKEN}
```

### Backup and Recovery

#### Configuration Backup
```bash
#!/bin/bash
# backup-config.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/homelab-bot"

mkdir -p $BACKUP_DIR

# Backup configuration
docker run --rm \
  -v disarr_config:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/config-$DATE.tar.gz -C /data .

# Backup logs
docker run --rm \
  -v disarr_logs:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/logs-$DATE.tar.gz -C /data .

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

#### Disaster Recovery
```bash
#!/bin/bash
# restore-config.sh
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.tar.gz>"
  exit 1
fi

# Stop bot
docker-compose down

# Restore configuration
docker run --rm \
  -v disarr_config:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/$BACKUP_FILE -C /data

# Start bot
docker-compose up -d
```

## 📊 Monitoring and Alerting

### Health Monitoring
```yaml
# In docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Metrics Collection
```yaml
# With Prometheus
environment:
  - METRICS_ENABLED=true
  - METRICS_PORT=9090

ports:
  - "9090:9090"
```

### Alerting
```yaml
# With AlertManager
labels:
  - "alert.rules=bot-down"
  - "alert.severity=critical"
```

---

For additional help, visit our [GitHub Issues](https://github.com/BradRoland/disarr/issues) or [Discord Community](https://discord.gg/your-invite).
