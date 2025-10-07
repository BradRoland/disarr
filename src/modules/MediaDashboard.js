const axios = require('axios');

class MediaDashboard {
    constructor(services) {
        this.services = services;
        this.cache = {
            data: null,
            timestamp: 0,
            ttl: 20000 // 20 seconds cache
        };
        this.dashboardChannelId = null;
        this.enabledServices = 'all'; // Default to showing all services
        
        // Load saved dashboard config on startup
        this.loadDashboardConfig();
    }

    setDashboardChannel(channelId) {
        this.dashboardChannelId = channelId;
        if (channelId) {
            process.env.DASHBOARD_CHANNEL_ID = channelId;
            // Save to a persistent file for server reboots
            this.saveDashboardConfig(channelId);
        } else {
            // Clear the environment variable when removing the channel
            process.env.DASHBOARD_CHANNEL_ID = '';
            // Remove the persistent file
            this.saveDashboardConfig(null);
        }
    }

    saveDashboardConfig(channelId) {
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(process.cwd(), 'config', 'dashboard.json');
            
            const config = {
                dashboardChannelId: channelId,
                enabledServices: this.enabledServices,
                lastUpdated: new Date().toISOString()
            };
            
            if (channelId) {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log(`Dashboard channel saved to config: ${channelId}`);
            } else {
                // Remove the config file if channel is cleared
                if (fs.existsSync(configPath)) {
                    fs.unlinkSync(configPath);
                    console.log('Dashboard channel config removed');
                }
            }
        } catch (error) {
            console.error('Error saving dashboard config:', error);
        }
    }

    loadDashboardConfig() {
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(process.cwd(), 'config', 'dashboard.json');
            
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.dashboardChannelId) {
                    this.dashboardChannelId = config.dashboardChannelId;
                    process.env.DASHBOARD_CHANNEL_ID = config.dashboardChannelId;
                    this.enabledServices = config.enabledServices || 'all';
                    console.log(`Dashboard channel loaded from config: ${config.dashboardChannelId}, enabled services: ${JSON.stringify(this.enabledServices)}`);
                    return config.dashboardChannelId;
                }
            }
        } catch (error) {
            console.error('Error loading dashboard config:', error);
        }
        return null;
    }

    getDashboardChannel() {
        return this.dashboardChannelId || process.env.DASHBOARD_CHANNEL_ID;
    }

    setEnabledServices(services) {
        this.enabledServices = services;
        // Always save the enabled services, even if no dashboard channel is set
        this.saveEnabledServices();
    }

    saveEnabledServices() {
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(process.cwd(), 'config', 'dashboard.json');
            
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            
            config.enabledServices = this.enabledServices;
            config.lastUpdated = new Date().toISOString();
            
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`Enabled services saved: ${JSON.stringify(this.enabledServices)}`);
        } catch (error) {
            console.error('Error saving enabled services:', error);
        }
    }

    getEnabledServices() {
        if (this.enabledServices === 'all') {
            return 'all';
        }
        return Array.isArray(this.enabledServices) ? this.enabledServices : [];
    }

    addService(service) {
        if (this.enabledServices === 'all') {
            // If showing all, this shouldn't happen since all services are already enabled
            // But if it does, just return false since the service is already enabled
            return false;
        }
        
        if (!Array.isArray(this.enabledServices)) {
            this.enabledServices = [];
        }
        
        if (!this.enabledServices.includes(service)) {
            this.enabledServices.push(service);
            this.saveEnabledServices();
            return true;
        }
        return false;
    }

    removeService(service) {
        if (this.enabledServices === 'all') {
            // If showing all, convert to array without this service
            const allServices = ['jellyfin', 'plex', 'radarr', 'sonarr', 'lidarr', 'prowlarr', 'qbittorrent', 'nzbget', 'overseerr', 'nextcloud', 'fileflows', 'navidrome', 'immich', 'proxmox', 'jellystat', 'n8n', 'plexstat', 'ag'];
            this.enabledServices = allServices.filter(s => s !== service);
            this.saveEnabledServices();
            return true;
        }
        
        if (Array.isArray(this.enabledServices) && this.enabledServices.includes(service)) {
            this.enabledServices = this.enabledServices.filter(s => s !== service);
            this.saveEnabledServices();
            return true;
        }
        return false;
    }

    async getCurrentActivity() {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.cache.data && (now - this.cache.timestamp) < this.cache.ttl) {
            return this.cache.data;
        }

        try {
            const [jellyfin, plex, qbittorrent, nzbget] = await Promise.allSettled([
                this.getJellyfinActivity(),
                this.getPlexActivity(),
                this.getQBittorrentActivity(),
                this.getNZBGetActivity()
            ]);

            const activity = {
                jellyfin: jellyfin.status === 'fulfilled' ? jellyfin.value : { status: 'error', message: jellyfin.reason?.message },
                plex: plex.status === 'fulfilled' ? plex.value : { status: 'error', message: plex.reason?.message },
                qbittorrent: qbittorrent.status === 'fulfilled' ? qbittorrent.value : { status: 'error', message: qbittorrent.reason?.message },
                nzbget: nzbget.status === 'fulfilled' ? nzbget.value : { status: 'error', message: nzbget.reason?.message },
                timestamp: now
            };

            // Cache the results
            this.cache.data = activity;
            this.cache.timestamp = now;

            return activity;
        } catch (error) {
            console.error('Error getting media activity:', error);
            return this.getErrorActivity();
        }
    }

    async getJellyfinActivity() {
        if (!this.services.jellyfin?.url || !this.services.jellyfin?.apiKey) {
            console.log('Jellyfin not configured - URL:', this.services.jellyfin?.url, 'API Key:', this.services.jellyfin?.apiKey ? 'Present' : 'Missing');
            return { status: 'disabled', message: 'Jellyfin not configured' };
        }

        try {
            console.log('Attempting to connect to Jellyfin at:', this.services.jellyfin.url);
            const [sessions, systemInfo] = await Promise.all([
                this.makeJellyfinRequest('/Sessions'),
                this.makeJellyfinRequest('/System/Info')
            ]);

            console.log('Jellyfin sessions received:', sessions.length);
            console.log('Jellyfin system info:', systemInfo.Version);
            console.log('Jellyfin sessions data:', JSON.stringify(sessions, null, 2));

            const activeSessions = sessions.filter(session => {
                const hasNowPlaying = session.NowPlayingItem;
                const hasPlayState = session.PlayState;
                const isNotPaused = !session.PlayState?.IsPaused;
                
                console.log('Session check:', {
                    userName: session.UserName,
                    hasNowPlaying: !!hasNowPlaying,
                    hasPlayState: !!hasPlayState,
                    isNotPaused: isNotPaused,
                    playState: session.PlayState
                });
                
                return hasNowPlaying && hasPlayState && isNotPaused;
            });

            console.log('Active Jellyfin sessions:', activeSessions.length);

            return {
                status: 'online',
                version: systemInfo.Version,
                activeStreams: activeSessions.length,
                sessions: activeSessions.map(session => ({
                    user: session.UserName,
                    title: session.NowPlayingItem.Name,
                    series: session.NowPlayingItem.SeriesName,
                    season: session.NowPlayingItem.SeasonName,
                    episode: session.NowPlayingItem.EpisodeTitle,
                    progress: Math.round(session.PlayState.PositionTicks / session.NowPlayingItem.RunTimeTicks * 100),
                    device: session.DeviceName,
                    client: session.Client
                }))
            };
        } catch (error) {
            console.log('Jellyfin error:', error.message);
            return { status: 'error', message: error.message };
        }
    }

    async getPlexActivity() {
        if (!this.services.plex?.url || !this.services.plex?.token) {
            return { status: 'disabled', message: 'Plex not configured' };
        }

        try {
            const [sessions, serverInfo] = await Promise.all([
                this.makePlexRequest('/status/sessions'),
                this.makePlexRequest('/')
            ]);

            const activeSessions = sessions.MediaContainer.Metadata || [];

            return {
                status: 'online',
                version: serverInfo.MediaContainer.version,
                activeStreams: activeSessions.length,
                sessions: activeSessions.map(session => ({
                    user: session.User.title,
                    title: session.title,
                    series: session.grandparentTitle,
                    season: session.parentTitle,
                    episode: session.title,
                    progress: Math.round((session.viewOffset / session.duration) * 100),
                    device: session.Player.device,
                    client: session.Player.product
                }))
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async getQBittorrentActivity() {
        if (!this.services.qbittorrent?.url || !this.services.qbittorrent?.username || !this.services.qbittorrent?.password) {
            return { status: 'disabled', message: 'qBittorrent not configured' };
        }

        try {
            // First, authenticate
            const authResponse = await axios.post(`${this.services.qbittorrent.url}/api/v2/auth/login`, 
                `username=${this.services.qbittorrent.username}&password=${this.services.qbittorrent.password}`,
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            if (authResponse.data !== 'Ok.') {
                throw new Error('Authentication failed');
            }

            const cookies = authResponse.headers['set-cookie'];

            // Get torrent list
            const torrentsResponse = await axios.get(`${this.services.qbittorrent.url}/api/v2/torrents/info`, {
                headers: { 'Cookie': cookies.join('; ') }
            });

            const torrents = torrentsResponse.data;
            const downloading = torrents.filter(t => t.state === 'downloading');
            const seeding = torrents.filter(t => t.state === 'stalledUP' || t.state === 'uploading');
            const paused = torrents.filter(t => t.state === 'pausedDL' || t.state === 'pausedUP');

            return {
                status: 'online',
                total: torrents.length,
                downloading: downloading.length,
                seeding: seeding.length,
                paused: paused.length,
                activeTorrents: downloading.map(torrent => ({
                    name: torrent.name,
                    progress: Math.round(torrent.progress * 100),
                    speed: this.formatBytes(torrent.dlspeed),
                    eta: this.formatETA(torrent.eta),
                    size: this.formatBytes(torrent.size),
                    downloaded: this.formatBytes(torrent.downloaded),
                    state: torrent.state
                }))
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async getNZBGetActivity() {
        if (!this.services.nzbget?.url || !this.services.nzbget?.username || !this.services.nzbget?.password) {
            return { status: 'disabled', message: 'NZBGet not configured' };
        }

        try {
            // Clean up the URL and use internal IP for API calls
            let apiUrl = this.services.nzbget.url;
            if (apiUrl.includes('brads-lab.com')) {
                apiUrl = 'http://192.168.12.114:6789';
            }
            // Ensure URL doesn't end with extra slashes
            apiUrl = apiUrl.replace(/\/+$/, '');

            // Get download list using POST method with proper authentication
            const downloadsResponse = await axios.post(`${apiUrl}/jsonrpc`, {
                method: 'listgroups',
                params: []
            }, {
                auth: {
                    username: this.services.nzbget.username,
                    password: this.services.nzbget.password
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const downloads = downloadsResponse.data.result || [];
            const downloading = downloads.filter(d => d.Status === 'DOWNLOADING');
            const paused = downloads.filter(d => d.Status === 'PAUSED');
            const completed = downloads.filter(d => d.Status === 'SUCCESS');

            return {
                status: 'online',
                total: downloads.length,
                downloading: downloading.length,
                paused: paused.length,
                completed: completed.length,
                activeDownloads: downloading.map(download => ({
                    name: download.NZBName,
                    progress: Math.round((download.DownloadedSizeMB / download.FileSizeMB) * 100),
                    speed: this.formatBytes(download.DownloadRate),
                    eta: this.formatETA(download.RemainingSizeMB / download.DownloadRate),
                    size: this.formatBytes(download.FileSizeMB * 1024 * 1024),
                    downloaded: this.formatBytes(download.DownloadedSizeMB * 1024 * 1024),
                    status: download.Status
                }))
            };
        } catch (error) {
            console.error('NZBGet activity error:', error.message);
            return { status: 'error', message: error.message };
        }
    }

    async makeJellyfinRequest(endpoint) {
        try {
            const response = await axios.get(`${this.services.jellyfin.url}${endpoint}`, {
                headers: {
                    'X-Emby-Token': this.services.jellyfin.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Network error: Unable to reach Jellyfin');
            } else {
                throw new Error(error.message);
            }
        }
    }

    async makePlexRequest(endpoint) {
        try {
            const response = await axios.get(`${this.services.plex.url}${endpoint}`, {
                headers: {
                    'X-Plex-Token': this.services.plex.token,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Network error: Unable to reach Plex');
            } else {
                throw new Error(error.message);
            }
        }
    }

    getErrorActivity() {
        return {
            jellyfin: { status: 'error', message: 'Unable to connect' },
            plex: { status: 'error', message: 'Unable to connect' },
            qbittorrent: { status: 'error', message: 'Unable to connect' },
            nzbget: { status: 'error', message: 'Unable to connect' },
            timestamp: Date.now()
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatETA(seconds) {
        if (seconds === 8640000) return '∞'; // qBittorrent's infinite ETA
        if (seconds <= 0) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    getStatusEmoji(status) {
        switch (status) {
            case 'online': return '✅';
            case 'disabled': return '⚪';
            case 'error': return '❌';
            default: return '❓';
        }
    }

    getStateEmoji(state) {
        switch (state) {
            case 'downloading': return '⬇️';
            case 'uploading': return '⬆️';
            case 'stalledUP': return '⏸️';
            case 'pausedDL': return '⏸️';
            case 'pausedUP': return '⏸️';
            case 'queuedDL': return '⏳';
            case 'queuedUP': return '⏳';
            default: return '❓';
        }
    }

    async updateDashboard(channel) {
        try {
            const activity = await this.getCurrentActivity();
            const { EmbedBuilder } = require('discord.js');
            
            const embed = new EmbedBuilder()
                .setTitle('📊 HomeLab Dashboard')
                .setDescription('Real-time status of your HomeLab services')
                .setColor(0x0099ff)
                .setTimestamp();

            // Jellyfin Status
            const jellyfinEmoji = this.getStatusEmoji(activity.jellyfin.status);
            let jellyfinText = `${jellyfinEmoji} **Jellyfin** - ${activity.jellyfin.status.toUpperCase()}`;
            if (activity.jellyfin.status === 'online') {
                jellyfinText += `\n   Version: ${activity.jellyfin.version}`;
                jellyfinText += `\n   Active Streams: ${activity.jellyfin.activeStreams}`;
                if (activity.jellyfin.sessions && activity.jellyfin.sessions.length > 0) {
                    jellyfinText += '\n   **Current Streams:**';
                    activity.jellyfin.sessions.forEach(session => {
                        const title = session.series ? `${session.series} - ${session.episode}` : session.title;
                        jellyfinText += `\n   • ${session.user}: ${title} (${session.progress}%)`;
                    });
                }
            } else if (activity.jellyfin.message) {
                jellyfinText += `\n   ${activity.jellyfin.message}`;
            }

            // Plex Status
            const plexEmoji = this.getStatusEmoji(activity.plex.status);
            let plexText = `${plexEmoji} **Plex** - ${activity.plex.status.toUpperCase()}`;
            if (activity.plex.status === 'online') {
                plexText += `\n   Version: ${activity.plex.version}`;
                plexText += `\n   Active Streams: ${activity.plex.activeStreams}`;
                if (activity.plex.sessions && activity.plex.sessions.length > 0) {
                    plexText += '\n   **Current Streams:**';
                    activity.plex.sessions.forEach(session => {
                        const title = session.series ? `${session.series} - ${session.episode}` : session.title;
                        plexText += `\n   • ${session.user}: ${title} (${session.progress}%)`;
                    });
                }
            } else if (activity.plex.message) {
                plexText += `\n   ${activity.plex.message}`;
            }

            // qBittorrent Status
            const qbitEmoji = this.getStatusEmoji(activity.qbittorrent.status);
            let qbitText = `${qbitEmoji} **qBittorrent** - ${activity.qbittorrent.status.toUpperCase()}`;
            if (activity.qbittorrent.status === 'online') {
                qbitText += `\n   Total: ${activity.qbittorrent.total} | Downloading: ${activity.qbittorrent.downloading} | Seeding: ${activity.qbittorrent.seeding}`;
                if (activity.qbittorrent.activeTorrents && activity.qbittorrent.activeTorrents.length > 0) {
                    qbitText += '\n   **Active Downloads:**';
                    activity.qbittorrent.activeTorrents.slice(0, 3).forEach(torrent => {
                        qbitText += `\n   • ${torrent.name} (${torrent.progress}%) - ${torrent.speed}/s`;
                    });
                    if (activity.qbittorrent.activeTorrents.length > 3) {
                        qbitText += `\n   ... and ${activity.qbittorrent.activeTorrents.length - 3} more`;
                    }
                }
            } else if (activity.qbittorrent.message) {
                qbitText += `\n   ${activity.qbittorrent.message}`;
            }

            // NZBGet Status
            const nzbEmoji = this.getStatusEmoji(activity.nzbget.status);
            let nzbText = `${nzbEmoji} **NZBGet** - ${activity.nzbget.status.toUpperCase()}`;
            if (activity.nzbget.status === 'online') {
                nzbText += `\n   Total: ${activity.nzbget.total} | Downloading: ${activity.nzbget.downloading} | Completed: ${activity.nzbget.completed}`;
                if (activity.nzbget.activeDownloads && activity.nzbget.activeDownloads.length > 0) {
                    nzbText += '\n   **Active Downloads:**';
                    activity.nzbget.activeDownloads.slice(0, 3).forEach(download => {
                        nzbText += `\n   • ${download.name} (${download.progress}%) - ${download.speed}/s`;
                    });
                    if (activity.nzbget.activeDownloads.length > 3) {
                        nzbText += `\n   ... and ${activity.nzbget.activeDownloads.length - 3} more`;
                    }
                }
            } else if (activity.nzbget.message) {
                nzbText += `\n   ${activity.nzbget.message}`;
            }

            embed.addFields(
                { name: '🎬 Media Servers', value: jellyfinText + '\n\n' + plexText, inline: false },
                { name: '⬇️ Download Clients', value: qbitText + '\n\n' + nzbText, inline: false }
            );

            embed.setFooter({ text: 'HomeLab Discord Bot • Dashboard' });

            await channel.send({ embeds: [embed] });
            return true;
        } catch (error) {
            console.error('Error updating dashboard:', error);
            return false;
        }
    }
}

module.exports = MediaDashboard;
