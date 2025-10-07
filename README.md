# 🏠 HomeLab Discord Bot

A comprehensive Discord bot for monitoring and managing your HomeLab infrastructure. This bot provides real-time monitoring, automated dashboards, invite management, and system administration tools all within Discord.

![Discord Bot](https://img.shields.io/badge/Discord-Bot-7289DA?style=for-the-badge&logo=discord)
![Docker](https://img.shields.io/badge/Docker-Container-2496ED?style=for-the-badge&logo=docker)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)

## ✨ Features

### 🔍 **Monitoring & Dashboards**
- **Real-time Server Stats**: CPU, Memory, Disk, Network usage
- **Media Activity**: Jellyfin/Plex streaming sessions, download progress
- **ARR Stack Monitoring**: Radarr, Sonarr, Lidarr, Readarr, Prowlarr status
- **Docker Container Management**: View, start, stop, restart containers
- **Auto-updating Dashboard**: Live dashboard with configurable refresh intervals

### 🎫 **Invite Management**
- **Wizarr Integration**: Automated invite creation with 2-day expiration
- **Admin Approval System**: All invites require admin approval
- **Direct Invite Commands**: Admins can send invites directly to users
- **Invite Tracking**: Monitor pending and completed invites

### 🛠️ **System Administration**
- **Admin-only Commands**: Secure access control for sensitive operations
- **Channel Management**: Configure dashboard and admin notification channels
- **Service Link Management**: Interactive menu to enable/disable service links
- **Live Updates**: Real-time system monitoring with configurable intervals

### 🔗 **Service Integration**
- **Media Servers**: Jellyfin, Plex monitoring and quick access
- **Download Clients**: qBittorrent, NZBGet activity tracking
- **Request Management**: Overseerr integration
- **File Management**: Nextcloud, FileFlows, Navidrome, Immich
- **Virtualization**: Proxmox VE monitoring
- **Additional Services**: 20+ HomeLab services supported

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Discord Bot Token
- Discord Server with Administrator permissions

### 1. Clone the Repository
```bash
git clone https://github.com/BradRoland/disarr.git
cd disarr
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Deploy with Docker
```bash
docker-compose up -d
```

### 4. Set Up Discord Bot
1. Create a Discord application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a bot and copy the token
3. Invite the bot to your server with Administrator permissions
4. Update the `.env` file with your bot token and server ID

## 📋 Configuration

### Required Environment Variables

#### Discord Configuration
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_server_id
```

#### Core Services
```env
# Media Servers
JELLYFIN_URL=http://jellyfin.yourdomain.com
JELLYFIN_API_KEY=your_jellyfin_api_key
PLEX_URL=http://plex.yourdomain.com
PLEX_TOKEN=your_plex_token

# Download Clients
QBITTORRENT_URL=http://qbittorrent.yourdomain.com:8080
QBITTORRENT_USERNAME=your_username
QBITTORRENT_PASSWORD=your_password
NZBGET_URL=http://nzbget.yourdomain.com:6789
NZBGET_USERNAME=your_username
NZBGET_PASSWORD=your_password
```

#### ARR Stack
```env
RADARR_URL=http://radarr.yourdomain.com
RADARR_API_KEY=your_radarr_api_key
SONARR_URL=http://sonarr.yourdomain.com
SONARR_API_KEY=your_sonarr_api_key
PROWLARR_URL=http://prowlarr.yourdomain.com:9696
PROWLARR_API_KEY=your_prowlarr_api_key
```

#### Invite Management
```env
WIZARR_URL=http://wizarr.yourdomain.com
WIZARR_API_KEY=your_wizarr_api_key
```

### Optional Services
See `.env.example` for a complete list of supported services including:
- Lidarr, Readarr
- Overseerr
- Nextcloud, FileFlows
- Navidrome, Immich
- Proxmox VE
- And many more...

## 🎮 Bot Commands

### Public Commands
- `/invite` - Request access to media services
- `/arr` - Check ARR stack status
- `/media` - View current media activity
- `/server` - Display server statistics
- `/links` - Show quick access links

### Admin Commands
- `/admin` - Configure admin notification channel
- `/dashboard` - Manage auto-posting dashboard
- `/invitegive` - Send invite directly to user
- `/invitemanage` - Manage pending invites
- `/docker` - Docker container management
- `/live` - Start live dashboard updates
- `/stop` - Stop live dashboard updates

## 🏗️ Architecture

### Core Modules
- **ServerMonitor**: System resource monitoring
- **MediaDashboard**: Media activity tracking
- **DockerMonitor**: Container management
- **WizarrIntegration**: Invite system
- **AdminManager**: Admin channel management
- **InviteManager**: Invite request handling

### Data Storage
- **Persistent Configuration**: JSON files in `config/` directory
- **Dashboard Settings**: Channel and service preferences
- **Admin Settings**: Notification channel configuration
- **Invite Tracking**: Pending request management

## 🔧 Advanced Configuration

### Custom Docker Socket Path
If your Docker socket is in a non-standard location:
```env
DOCKER_SOCKET_PATH=/custom/path/to/docker.sock
```

### Dashboard Customization
Use the interactive `/dashboard links` command to:
- Enable/disable specific service links
- Configure auto-posting channel
- Set refresh intervals

### Admin Channel Setup
Configure where admin notifications are sent:
```bash
/admin set #admin-channel
```

## 🐳 Docker Deployment

### Standard Deployment
```bash
docker-compose up -d
```

### Production Deployment
```bash
# Use production docker-compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Health Checks
The container includes health checks to ensure the bot is running properly:
```bash
docker ps  # Check container status
docker logs disarr  # View logs
```

## 🔒 Security Features

### Admin Permission System
- All administrative commands require Administrator permissions
- Slash command visibility restricted to admins
- Runtime permission validation

### Secure Configuration
- Environment variable-based configuration
- No hardcoded credentials
- Docker socket access with proper permissions

## 📊 Monitoring & Logs

### Log Files
- Application logs: `./logs/`
- Docker logs: `docker logs disarr`

### Health Monitoring
- Automatic health checks
- Rich presence status updates
- Error logging and recovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Setup
```bash
npm install
npm run dev  # Development mode with auto-reload
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

#### Bot Not Responding
- Check Discord token and permissions
- Verify bot is invited to server
- Check container logs for errors

#### Docker Monitoring Not Working
- Ensure Docker socket path is correct
- Check container has proper permissions
- Verify Docker daemon is running

#### Invite System Issues
- Verify Wizarr API key and URL
- Check admin channel configuration
- Ensure Wizarr service is accessible

### Getting Help
- Check the [Issues](https://github.com/BradRoland/disarr/issues) page
- Review the [Wiki](https://github.com/BradRoland/disarr/wiki)
- Join our [Discord Server](https://discord.gg/your-invite) for community support

## 🙏 Acknowledgments

- Discord.js community for the excellent library
- HomeLab community for inspiration and feedback
- All contributors who help improve this project

---

**Made with ❤️ for the HomeLab community**