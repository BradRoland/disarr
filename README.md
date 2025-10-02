# HomeLab Discord Bot

A comprehensive Discord bot for monitoring and managing your HomeLab infrastructure. Features real-time server stats, Docker container monitoring, ARR stack integration, media activity tracking, and quick access links to all hosted services.

## 🚀 Features

- **📊 Real-time Dashboard**: Comprehensive embed showing server stats, container status, and media activity
- **🖥️ Server Monitoring**: CPU, RAM, disk usage, and network statistics with progress bars
- **🐳 Docker Management**: Container status monitoring and basic control (start/stop/restart)
- **📡 ARR Stack Integration**: Radarr, Sonarr, Lidarr, Readarr, and Prowlarr status and queue monitoring
- **🎬 Media Activity**: Jellyfin/Plex streaming activity and qBittorrent/NZBGet download monitoring
- **🔗 Quick Links**: One-click access to all hosted services via Discord buttons
- **🎯 Rich Presence**: Dynamic bot status showing current activity
- **⚡ Auto-refresh**: Configurable periodic updates and caching

## 🛠️ Tech Stack

- **Node.js** with Discord.js v14
- **Docker** for containerization
- **System Information** for host metrics
- **Dockerode** for container management
- **Axios** for API communications

## 📋 Prerequisites

- Node.js 18+ or Docker
- Discord Bot Token
- Access to Docker socket (for container monitoring)
- API keys for services you want to monitor

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd homelab-discord-bot
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_discord_server_id_here

# Service URLs and API Keys
RADARR_URL=http://radarr:7878
RADARR_API_KEY=your_radarr_api_key
# ... configure other services
```

### 3. Docker Deployment (Recommended)

```bash
# Build and run with docker-compose
docker-compose up -d

# Or build manually
docker build -t homelab-discord-bot .
docker run -d --name homelab-discord-bot \
  --env-file .env \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v ./config:/app/config:ro \
  homelab-discord-bot
```

### 4. Local Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Or start normally
npm start
```

## 📖 Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/dashboard` | Show main dashboard with all stats | `/dashboard visibility:public` |
| `/server` | Display detailed server statistics | `/server type:all` |
| `/docker` | Docker container status and management | `/docker action:status` |
| `/arr` | ARR stack status and activity | `/arr service:all` |
| `/media` | Current media activity and downloads | `/media type:all` |
| `/links` | Quick access links to all services | `/links` |

## ⚙️ Configuration

### Service Configuration

Edit `config/services.json` to customize service links and descriptions:

```json
{
  "jellyfin": {
    "name": "Jellyfin",
    "url": "http://jellyfin:8096",
    "icon": "🎬",
    "description": "Media server"
  }
}
```

### Monitoring Configuration

Configure critical containers and alert thresholds in `config/config.json`:

```json
{
  "monitoring": {
    "criticalContainers": ["jellyfin", "radarr", "sonarr"],
    "alertThresholds": {
      "cpu": 90,
      "memory": 95,
      "disk": 95
    }
  }
}
```

## 🔧 API Integration

### Supported Services

- **Radarr** - Movie collection management
- **Sonarr** - TV show collection management  
- **Lidarr** - Music collection management
- **Readarr** - Book collection management
- **Prowlarr** - Indexer management
- **Jellyfin** - Media streaming
- **Plex** - Media streaming
- **qBittorrent** - BitTorrent client
- **NZBGet** - Usenet downloader
- **Overseerr** - Media requests

### Adding New Services

1. Add service configuration to `config/services.json`
2. Update environment variables in `.env`
3. Add API integration in the appropriate module
4. Update dashboard embed to include the service

## 🐳 Docker Configuration

The bot runs in a Docker container with the following setup:

- **Base Image**: Node.js 18 Alpine
- **Docker Socket**: Mounted for container monitoring
- **Config Volume**: Read-only mount for configuration
- **Logs Volume**: For persistent logging
- **Health Check**: Built-in health monitoring

### Docker Compose

```yaml
version: '3.8'
services:
  homelab-discord-bot:
    build: .
    container_name: homelab-discord-bot
    restart: unless-stopped
    env_file: .env
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./config:/app/config:ro
    networks:
      - homelab
```

## 🔒 Security

- API keys stored in environment variables
- Docker socket mounted read-only
- Non-root user in container
- Input validation and error handling
- Rate limiting on API calls

## 📊 Monitoring

The bot provides comprehensive monitoring:

- **Server Metrics**: CPU, RAM, disk, network usage
- **Container Health**: Running/stopped status, resource usage
- **Service Status**: API connectivity and response times
- **Media Activity**: Active streams and downloads
- **Queue Monitoring**: ARR stack download queues

## 🚨 Alerts

Configure alerts for:
- Critical container failures
- High resource usage (CPU/RAM/disk)
- Service connectivity issues
- Failed downloads in ARR stack

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the logs: `docker logs homelab-discord-bot`
2. Verify configuration in `.env` and `config/`
3. Ensure all required services are accessible
4. Check Discord bot permissions

## 🔄 Updates

The bot supports:
- Hot reloading in development
- Graceful shutdown handling
- Automatic restart on failure
- Configuration updates without restart

---

**Made with ❤️ for HomeLab enthusiasts**
