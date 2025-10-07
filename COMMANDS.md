# 🤖 Bot Commands Documentation

Complete reference for all HomeLab Discord Bot commands, including usage examples and permission requirements.

## 📋 Table of Contents

- [Public Commands](#-public-commands)
- [Admin Commands](#-admin-commands)
- [Command Examples](#-command-examples)
- [Permission Requirements](#-permission-requirements)
- [Error Handling](#-error-handling)

## 👥 Public Commands

These commands are available to all users in the Discord server.

### `/invite` - Request Media Access

Request access to your HomeLab media services through Wizarr.

**Usage:**
```
/invite name:<your_name> message:<optional_message>
```

**Parameters:**
- `name` (required): Your display name
- `message` (optional): Reason for requesting access

**Example:**
```
/invite name:John Doe message:I'd like access to watch movies with my family
```

**Process:**
1. Bot sends request to admin channel
2. Admin approves/denies the request
3. If approved, you receive a DM with Wizarr invite link
4. Invite expires in 2 days

---

### `/arr` - ARR Stack Status

Check the status and activity of your ARR (Automated Media Management) services.

**Usage:**
```
/arr service:<service_name>
```

**Parameters:**
- `service` (optional): Specific service to check
  - `all` - All services (default)
  - `radarr` - Movie management
  - `sonarr` - TV show management
  - `lidarr` - Music management
  - `readarr` - Book management
  - `prowlarr` - Indexer management

**Examples:**
```
/arr
/arr service:radarr
/arr service:sonarr
```

**Response includes:**
- Service status (Online/Offline)
- Active downloads
- Queue status
- Indexer health (Prowlarr)

---

### `/media` - Media Activity

View current media streaming and download activity.

**Usage:**
```
/media type:<activity_type>
```

**Parameters:**
- `type` (optional): Type of activity to display
  - `all` - All activity (default)
  - `jellyfin` - Jellyfin streaming sessions
  - `plex` - Plex streaming sessions
  - `qbittorrent` - qBittorrent downloads
  - `nzbget` - NZBGet downloads

**Examples:**
```
/media
/media type:jellyfin
/media type:qbittorrent
```

**Response includes:**
- Active streaming sessions
- Download progress
- User information
- Bandwidth usage

---

### `/server` - Server Statistics

Display detailed server resource usage and statistics.

**Usage:**
```
/server type:<stat_type>
```

**Parameters:**
- `type` (optional): Type of statistics to display
  - `all` - All statistics (default)
  - `cpu` - CPU usage only
  - `memory` - Memory usage only
  - `disk` - Disk usage only
  - `network` - Network usage only

**Examples:**
```
/server
/server type:cpu
/server type:memory
```

**Response includes:**
- CPU usage percentage
- Memory usage (used/total/percentage)
- Disk usage by mount point
- Network I/O statistics
- System uptime

---

### `/links` - Quick Access Links

Display quick access links to all configured HomeLab services.

**Usage:**
```
/links
```

**Response includes:**
- Organized service links
- Service status indicators
- Direct access buttons
- Service descriptions

## 🔐 Admin Commands

These commands require Administrator permissions and are only visible to server administrators.

### `/admin` - Admin Channel Management

Configure the admin notification channel for system alerts and invite requests.

**Subcommands:**

#### `/admin set` - Set Admin Channel
```
/admin set channel:#admin-channel
```

#### `/admin remove` - Remove Admin Channel
```
/admin remove
```

#### `/admin status` - Check Current Configuration
```
/admin status
```

#### `/admin test` - Send Test Notification
```
/admin test
```

**Examples:**
```
/admin set channel:#admin-alerts
/admin status
/admin test
```

---

### `/dashboard` - Dashboard Management

Configure and manage the auto-posting media dashboard.

**Subcommands:**

#### `/dashboard set` - Set Dashboard Channel
```
/dashboard set channel:#dashboard
```

#### `/dashboard remove` - Remove Dashboard Channel
```
/dashboard remove
```

#### `/dashboard status` - Check Current Configuration
```
/dashboard status
```

#### `/dashboard test` - Send Test Dashboard
```
/dashboard test
```

#### `/dashboard links` - Configure Service Links
```
/dashboard links
```

**Examples:**
```
/dashboard set channel:#media-dashboard
/dashboard links
/dashboard status
```

**Interactive Dashboard Features:**
- Enable/disable individual service links
- "Enable All" / "Disable All" buttons
- Real-time visual feedback
- Persistent configuration

---

### `/invitegive` - Direct Invite

Send a Wizarr invite directly to a specified user (bypasses approval process).

**Usage:**
```
/invitegive user:@username service:<service> name:<display_name>
```

**Parameters:**
- `user` (required): Discord user to send invite to
- `service` (required): Service to create invite for
  - `plex` - Plex server access
  - `jellyfin` - Jellyfin server access
- `name` (required): Display name for the invite

**Examples:**
```
/invitegive user:@john_doe service:plex name:John Doe
/invitegive user:@jane_smith service:jellyfin name:Jane Smith
```

**Process:**
1. Creates Wizarr invite immediately
2. Sends DM to specified user
3. Invite expires in 2 days

---

### `/invitemanage` - Invite Management

Manage pending invite requests and clean up expired invites.

**Subcommands:**

#### `/invitemanage list` - List Pending Invites
```
/invitemanage list
```

#### `/invitemanage cleanup` - Clean Expired Invites
```
/invitemanage cleanup
```

**Examples:**
```
/invitemanage list
/invitemanage cleanup
```

**Response includes:**
- List of pending requests
- Request timestamps
- Requester information
- Service requested

---

### `/docker` - Docker Container Management

Manage Docker containers on your HomeLab server.

**Usage:**
```
/docker action:<action> container:<container_name>
```

**Parameters:**
- `action` (optional): Action to perform
  - `status` - Show container status (default)
  - `start` - Start a container
  - `stop` - Stop a container
  - `restart` - Restart a container
- `container` (required for start/stop/restart): Container name

**Examples:**
```
/docker
/docker action:status
/docker action:start container:jellyfin
/docker action:stop container:radarr
/docker action:restart container:sonarr
```

**Response includes:**
- Container status (Running/Stopped)
- Resource usage (CPU, Memory)
- Container health
- Port mappings

---

### `/live` - Live Dashboard Updates

Start live dashboard updates in the current channel.

**Usage:**
```
/live
```

**Features:**
- Real-time updates every 30 seconds
- Shows current system status
- Displays active media sessions
- Updates automatically

**Note:** Only one live dashboard can run at a time.

---

### `/stop` - Stop Live Updates

Stop the currently running live dashboard updates.

**Usage:**
```
/stop
```

**Response:**
- Confirms live updates have been stopped
- Clears the update interval

## 💡 Command Examples

### Basic Usage Examples

#### Check System Status
```
/server
/media
/arr
```

#### Request Access
```
/invite name:Alice Johnson message:New family member needs access
```

#### Admin Setup
```
/admin set channel:#admin-alerts
/dashboard set channel:#media-dashboard
/dashboard links
```

#### Container Management
```
/docker
/docker action:restart container:jellyfin
```

### Advanced Usage Examples

#### Monitor Specific Services
```
/arr service:radarr
/media type:jellyfin
/server type:cpu
```

#### Direct Invite Management
```
/invitegive user:@new_user service:plex name:New User
/invitemanage list
/invitemanage cleanup
```

#### Live Monitoring
```
/live
# ... wait for updates ...
/stop
```

## 🔒 Permission Requirements

### Public Commands
- **Required:** None (available to all users)
- **Commands:** `/invite`, `/arr`, `/media`, `/server`, `/links`

### Admin Commands
- **Required:** Administrator permission
- **Commands:** All commands starting with `/admin`, `/dashboard`, `/invitegive`, `/invitemanage`, `/docker`, `/live`, `/stop`

### Permission Verification
The bot automatically checks permissions for admin commands:
- Slash command visibility is restricted to administrators
- Runtime permission validation prevents unauthorized access
- Clear error messages for permission denials

## ⚠️ Error Handling

### Common Error Messages

#### Permission Denied
```
❌ You need Administrator permissions to use this command.
```

#### Service Unavailable
```
❌ Service is currently unavailable. Please try again later.
```

#### Invalid Parameters
```
❌ Invalid parameter. Please check the command syntax.
```

#### Configuration Missing
```
❌ Service not configured. Please contact an administrator.
```

### Troubleshooting

#### Bot Not Responding
1. Check if bot is online in Discord
2. Verify bot has proper permissions
3. Check container logs: `docker logs disarr`

#### Commands Not Appearing
1. Ensure bot has been invited with proper permissions
2. Try refreshing Discord client
3. Check if commands are admin-only

#### Service Connection Issues
1. Verify service URLs in configuration
2. Check API keys are correct
3. Ensure services are accessible from bot container

## 📊 Response Formats

### Embed Messages
Most commands use rich embed messages with:
- Color-coded status indicators
- Organized information sections
- Interactive buttons (where applicable)
- Timestamps and metadata

### Status Indicators
- ✅ Online/Active
- ❌ Offline/Inactive
- ⚠️ Warning/Partial
- 🔄 Loading/Processing
- 📊 Statistics/Data

### Interactive Elements
- **Buttons:** For dashboard configuration
- **Dropdowns:** For service selection
- **Reactions:** For quick responses

---

For additional help or to report issues, visit our [GitHub Issues](https://github.com/BradRoland/disarr/issues) or join our [Discord Community](https://discord.gg/your-invite).
