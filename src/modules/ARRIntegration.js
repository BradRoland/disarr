const axios = require('axios');

class ARRIntegration {
    constructor(services) {
        this.services = services;
        this.cache = {
            data: null,
            timestamp: 0,
            ttl: 30000 // 30 seconds cache
        };
    }

    async getARRStatus() {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.cache.data && (now - this.cache.timestamp) < this.cache.ttl) {
            return this.cache.data;
        }

        try {
            const [radarr, sonarr, lidarr, readarr, prowlarr] = await Promise.allSettled([
                this.getRadarrStatus(),
                this.getSonarrStatus(),
                this.getLidarrStatus(),
                this.getReadarrStatus(),
                this.getProwlarrStatus()
            ]);

            const status = {
                radarr: radarr.status === 'fulfilled' ? radarr.value : { status: 'error', message: radarr.reason?.message },
                sonarr: sonarr.status === 'fulfilled' ? sonarr.value : { status: 'error', message: sonarr.reason?.message },
                lidarr: lidarr.status === 'fulfilled' ? lidarr.value : { status: 'error', message: lidarr.reason?.message },
                readarr: readarr.status === 'fulfilled' ? readarr.value : { status: 'error', message: readarr.reason?.message },
                prowlarr: prowlarr.status === 'fulfilled' ? prowlarr.value : { status: 'error', message: prowlarr.reason?.message },
                timestamp: now
            };

            // Cache the results
            this.cache.data = status;
            this.cache.timestamp = now;

            return status;
        } catch (error) {
            console.error('Error getting ARR status:', error);
            return this.getErrorStatus();
        }
    }

    async getRadarrStatus() {
        if (!this.services.radarr?.url || !this.services.radarr?.apiKey) {
            return { status: 'disabled', message: 'Radarr not configured' };
        }

        try {
            const [systemStatus, queue, calendar] = await Promise.all([
                this.makeRequest(`${this.services.radarr.url}/api/v3/system/status`, this.services.radarr.apiKey),
                this.makeRequest(`${this.services.radarr.url}/api/v3/queue`, this.services.radarr.apiKey),
                this.makeRequest(`${this.services.radarr.url}/api/v3/calendar?start=${new Date().toISOString()}&end=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`, this.services.radarr.apiKey)
            ]);

            return {
                status: 'online',
                version: systemStatus.version,
                queued: queue.records?.length || 0,
                upcoming: calendar?.length || 0,
                failed: queue.records?.filter(item => item.status === 'failed').length || 0
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async getSonarrStatus() {
        if (!this.services.sonarr?.url || !this.services.sonarr?.apiKey) {
            return { status: 'disabled', message: 'Sonarr not configured' };
        }

        try {
            const [systemStatus, queue, calendar] = await Promise.all([
                this.makeRequest(`${this.services.sonarr.url}/api/v3/system/status`, this.services.sonarr.apiKey),
                this.makeRequest(`${this.services.sonarr.url}/api/v3/queue`, this.services.sonarr.apiKey),
                this.makeRequest(`${this.services.sonarr.url}/api/v3/calendar?start=${new Date().toISOString()}&end=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`, this.services.sonarr.apiKey)
            ]);

            return {
                status: 'online',
                version: systemStatus.version,
                queued: queue.records?.length || 0,
                upcoming: calendar?.length || 0,
                failed: queue.records?.filter(item => item.status === 'failed').length || 0
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async getLidarrStatus() {
        if (!this.services.lidarr?.url || !this.services.lidarr?.apiKey) {
            return { status: 'disabled', message: 'Lidarr not configured' };
        }

        try {
            const [systemStatus, queue, calendar] = await Promise.all([
                this.makeRequest(`${this.services.lidarr.url}/api/v1/system/status`, this.services.lidarr.apiKey),
                this.makeRequest(`${this.services.lidarr.url}/api/v1/queue`, this.services.lidarr.apiKey),
                this.makeRequest(`${this.services.lidarr.url}/api/v1/calendar?start=${new Date().toISOString()}&end=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`, this.services.lidarr.apiKey)
            ]);

            return {
                status: 'online',
                version: systemStatus.version,
                queued: queue.records?.length || 0,
                upcoming: calendar?.length || 0,
                failed: queue.records?.filter(item => item.status === 'failed').length || 0
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async getReadarrStatus() {
        if (!this.services.readarr?.url || !this.services.readarr?.apiKey) {
            return { status: 'disabled', message: 'Readarr not configured' };
        }

        try {
            const [systemStatus, queue, calendar] = await Promise.all([
                this.makeRequest(`${this.services.readarr.url}/api/v1/system/status`, this.services.readarr.apiKey),
                this.makeRequest(`${this.services.readarr.url}/api/v1/queue`, this.services.readarr.apiKey),
                this.makeRequest(`${this.services.readarr.url}/api/v1/calendar?start=${new Date().toISOString()}&end=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`, this.services.readarr.apiKey)
            ]);

            return {
                status: 'online',
                version: systemStatus.version,
                queued: queue.records?.length || 0,
                upcoming: calendar?.length || 0,
                failed: queue.records?.filter(item => item.status === 'failed').length || 0
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async getProwlarrStatus() {
        if (!this.services.prowlarr?.url || !this.services.prowlarr?.apiKey) {
            return { status: 'disabled', message: 'Prowlarr not configured' };
        }

        try {
            const [systemStatus, indexerStatus] = await Promise.all([
                this.makeRequest(`${this.services.prowlarr.url}/api/v1/system/status`, this.services.prowlarr.apiKey),
                this.makeRequest(`${this.services.prowlarr.url}/api/v1/indexer/status`, this.services.prowlarr.apiKey)
            ]);

            const activeIndexers = indexerStatus?.filter(indexer => indexer.status === 'healthy').length || 0;
            const totalIndexers = indexerStatus?.length || 0;

            return {
                status: 'online',
                version: systemStatus.version,
                activeIndexers,
                totalIndexers,
                healthy: activeIndexers === totalIndexers
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async makeRequest(url, apiKey, timeout = 5000) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'X-Api-Key': apiKey,
                    'Content-Type': 'application/json'
                },
                timeout
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Network error: Unable to reach service');
            } else {
                throw new Error(error.message);
            }
        }
    }

    getErrorStatus() {
        return {
            radarr: { status: 'error', message: 'Unable to connect' },
            sonarr: { status: 'error', message: 'Unable to connect' },
            lidarr: { status: 'error', message: 'Unable to connect' },
            readarr: { status: 'error', message: 'Unable to connect' },
            prowlarr: { status: 'error', message: 'Unable to connect' },
            timestamp: Date.now()
        };
    }

    getStatusEmoji(status) {
        switch (status) {
            case 'online': return '✅';
            case 'disabled': return '⚪';
            case 'error': return '❌';
            default: return '❓';
        }
    }

    formatQueueItem(item) {
        return {
            title: item.title || item.series?.title || 'Unknown',
            status: item.status,
            progress: item.trackedDownloadState || 'Unknown',
            size: this.formatBytes(item.size || 0),
            eta: item.estimatedCompletionTime ? new Date(item.estimatedCompletionTime).toLocaleString() : 'Unknown'
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = ARRIntegration;


