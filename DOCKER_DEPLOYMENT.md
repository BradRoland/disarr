# Docker Deployment Guide

This guide will help you deploy the HomeLab Discord Bot using Docker on your home server.

## Prerequisites

- Docker and Docker Compose installed on your home server
- A Discord bot token and application ID
- Access to your home server's Docker socket (for container monitoring)

## Quick Start

### 1. Prepare Your Environment

1. Copy your `.env` file to your home server in the project directory
2. Make sure your `.env` file contains all required variables:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_discord_server_id_here

# Dashboard Configuration
DASHBOARD_CHANNEL_ID=your_dashboard_channel_id
ALERT_CHANNEL_ID=your_alert_channel_id
REFRESH_INTERVAL=30000

# Service URLs and API Keys
RADARR_URL=http://radarr:7878
RADARR_API_KEY=your_radarr_api_key
# ... add other services as needed
```

### 2. Create the Homelab Network

If you don't already have a homelab network, create it:

```bash
docker network create homelab
```

### 3. Deploy the Bot

```bash
# Build and start the bot
docker-compose up -d

# View logs
docker-compose logs -f homelab-discord-bot

# Check status
docker-compose ps
```

### 4. Verify Deployment

1. Check that the bot appears online in your Discord server
2. Test the `/dashboard` command
3. Test the `/links` command
4. Check the logs for any errors

## Management Commands

```bash
# Stop the bot
docker-compose down

# Restart the bot
docker-compose restart

# Update the bot (after pulling new code)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# View logs
docker-compose logs -f

# Access the container shell
docker-compose exec homelab-discord-bot sh
```

## Configuration

### Environment Variables

The bot uses environment variables for configuration. You can:

1. **Comment out services**: Add `#` at the beginning of any service line in `.env` to disable it
2. **Update service URLs**: Change the URLs to match your actual service endpoints
3. **Add new services**: Add new environment variables and update the code

### Volume Mounts

- `./config:/app/config:ro` - Read-only access to config files
- `./logs:/app/logs` - Persistent log storage
- `/var/run/docker.sock:/var/run/docker.sock:ro` - Docker socket for container monitoring

## Troubleshooting

### Common Issues

1. **Bot not appearing online**:
   - Check Discord token is correct
   - Verify bot has proper permissions in Discord
   - Check logs for authentication errors

2. **Docker socket errors**:
   - Ensure Docker socket is accessible
   - Check file permissions on `/var/run/docker.sock`

3. **Service connection errors**:
   - Verify service URLs are correct
   - Check if services are accessible from the container
   - Ensure API keys are valid

### Logs

```bash
# View all logs
docker-compose logs

# View only error logs
docker-compose logs | grep -i error

# Follow logs in real-time
docker-compose logs -f
```

### Health Check

The container includes a health check that verifies the bot process is running:

```bash
# Check container health
docker inspect homelab-discord-bot | grep -A 10 "Health"
```

## Security Notes

- The bot runs as a non-root user inside the container
- Docker socket is mounted read-only
- Environment variables should be kept secure
- Consider using Docker secrets for sensitive data in production

## Updates

To update the bot:

1. Pull the latest code
2. Rebuild the container: `docker-compose build --no-cache`
3. Restart: `docker-compose up -d`

## Monitoring

The bot provides rich presence updates showing:
- Server resource usage (CPU, RAM, Disk)
- Active media streams
- Container status

Check your Discord server to see the bot's status in the member list.

