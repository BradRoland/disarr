const axios = require('axios');

class DownloadMonitor {
    constructor(services) {
        this.services = services;
        this.cache = {
            qbittorrent: null,
            nzbget: null,
            timestamp: 0,
            ttl: 10000 // 10 seconds cache
        };
    }

    async getDownloadStatus() {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.cache.qbittorrent && this.cache.nzbget && (now - this.cache.timestamp) < this.cache.ttl) {
            return {
                qbittorrent: this.cache.qbittorrent,
                nzbget: this.cache.nzbget
            };
        }

        try {
            const [qbittorrent, nzbget] = await Promise.allSettled([
                this.getQBittorrentStatus(),
                this.getNZBGetStatus()
            ]);

            const status = {
                qbittorrent: qbittorrent.status === 'fulfilled' ? qbittorrent.value : { status: 'offline', message: 'qBittorrent unavailable' },
                nzbget: nzbget.status === 'fulfilled' ? nzbget.value : { status: 'offline', message: 'NZBGet unavailable' }
            };

            // Cache the results
            this.cache.qbittorrent = status.qbittorrent;
            this.cache.nzbget = status.nzbget;
            this.cache.timestamp = now;

            return status;
        } catch (error) {
            console.error('Error getting download status:', error);
            return {
                qbittorrent: { status: 'error', message: 'Failed to connect' },
                nzbget: { status: 'error', message: 'Failed to connect' }
            };
        }
    }

    async getQBittorrentStatus() {
        try {
            const qbitConfig = this.services.qbittorrent;
            if (!qbitConfig || !qbitConfig.url || !qbitConfig.username || !qbitConfig.password) {
                return { status: 'offline', message: 'qBittorrent not configured' };
            }

            // Clean up the URL and use internal IP for API calls
            let apiUrl = qbitConfig.url;
            if (apiUrl.includes('brads-lab.com')) {
                apiUrl = 'http://192.168.12.114:8080';
            } else if (apiUrl.includes('/ab.com')) {
                apiUrl = apiUrl.replace('/ab.com', '');
            }

            // Login to qBittorrent
            const loginResponse = await axios.post(`${apiUrl}/api/v2/auth/login`, 
                `username=${qbitConfig.username}&password=${qbitConfig.password}`,
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            if (loginResponse.data !== 'Ok.') {
                return { status: 'offline', message: 'Authentication failed' };
            }

            const cookies = loginResponse.headers['set-cookie'];
            const cookieHeader = cookies ? cookies.join('; ') : '';

            // Get torrents
            const torrentsResponse = await axios.get(`${apiUrl}/api/v2/torrents/info`, {
                headers: { 'Cookie': cookieHeader }
            });

            const torrents = torrentsResponse.data;
            const downloading = torrents.filter(t => t.state === 'downloading');
            const seeding = torrents.filter(t => t.state === 'stalledDL' || t.state === 'uploading');
            const paused = torrents.filter(t => t.state === 'pausedDL' || t.state === 'pausedUP');

            // Calculate total download speed and ETA
            let totalSpeed = 0;
            let totalSize = 0;
            let totalDownloaded = 0;
            let eta = 0;

            downloading.forEach(torrent => {
                totalSpeed += torrent.dlspeed || 0;
                totalSize += torrent.size || 0;
                totalDownloaded += torrent.completed || 0;
            });

            if (totalSpeed > 0 && totalSize > totalDownloaded) {
                const remaining = totalSize - totalDownloaded;
                eta = Math.round(remaining / totalSpeed);
            }

            return {
                status: 'online',
                total: torrents.length,
                downloading: downloading.length,
                seeding: seeding.length,
                paused: paused.length,
                speed: this.formatBytes(totalSpeed),
                eta: this.formatTime(eta),
                torrents: downloading.slice(0, 5).map(t => ({
                    name: t.name,
                    size: this.formatBytes(t.size),
                    progress: Math.round((t.completed / t.size) * 100),
                    speed: this.formatBytes(t.dlspeed || 0),
                    eta: this.formatTime(t.eta || 0)
                }))
            };
        } catch (error) {
            console.error('qBittorrent error:', error.message);
            return { status: 'offline', message: error.message };
        }
    }

    async getNZBGetStatus() {
        try {
            const nzbConfig = this.services.nzbget;
            if (!nzbConfig || !nzbConfig.url || !nzbConfig.username || !nzbConfig.password) {
                return { status: 'offline', message: 'NZBGet not configured' };
            }

            // Clean up the URL and use internal IP for API calls
            let apiUrl = nzbConfig.url;
            if (apiUrl.includes('brads-lab.com')) {
                apiUrl = 'http://192.168.12.114:6789';
            }
            // Ensure URL doesn't end with extra slashes
            apiUrl = apiUrl.replace(/\/+$/, '');

            // Get NZBGet status using the correct API endpoint
            const response = await axios.post(`${apiUrl}/jsonrpc`, {
                method: 'status',
                params: []
            }, {
                auth: {
                    username: nzbConfig.username,
                    password: nzbConfig.password
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const status = response.data.result;
            const downloading = status.RemainingSizeMB > 0;
            
            // Calculate ETA for everything to be finished
            let eta = 0;
            if (downloading && status.DownloadRate > 0) {
                const remainingBytes = status.RemainingSizeMB * 1024 * 1024;
                const downloadRateBytes = status.DownloadRate * 1024;
                eta = Math.round(remainingBytes / downloadRateBytes);
            }

            return {
                status: 'online',
                downloading: downloading,
                remaining: this.formatBytes(status.RemainingSizeMB * 1024 * 1024),
                downloaded: this.formatBytes(status.DownloadedSizeMB * 1024 * 1024),
                speed: this.formatBytes(status.DownloadRate * 1024),
                eta: this.formatTime(eta)
            };
        } catch (error) {
            console.error('NZBGet error:', error.message);
            return { status: 'offline', message: error.message };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatTime(seconds) {
        if (seconds === 0) return 'Unknown';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

module.exports = DownloadMonitor;

