const axios = require('axios');

class MediaDashboard {
    constructor(services) {
        this.services = services;
        this.cache = {
            data: null,
            timestamp: 0,
            ttl: 20000 // 20 seconds cache
        };
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
            // First, authenticate
            const authResponse = await axios.get(`${this.services.nzbget.url}/jsonrpc`, {
                params: {
                    method: 'login',
                    params: [this.services.nzbget.username, this.services.nzbget.password]
                }
            });

            if (!authResponse.data.result) {
                throw new Error('Authentication failed');
            }

            // Get download list
            const downloadsResponse = await axios.get(`${this.services.nzbget.url}/jsonrpc`, {
                params: {
                    method: 'listgroups'
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
}

module.exports = MediaDashboard;
