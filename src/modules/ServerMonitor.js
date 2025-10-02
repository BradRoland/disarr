const si = require('systeminformation');

class ServerMonitor {
    constructor() {
        this.cache = {
            data: null,
            timestamp: 0,
            ttl: 10000 // 10 seconds cache
        };
    }

    async getStats() {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.cache.data && (now - this.cache.timestamp) < this.cache.ttl) {
            return this.cache.data;
        }

        try {
            const [cpu, memory, disk, network] = await Promise.all([
                this.getCPUStats(),
                this.getMemoryStats(),
                this.getDiskStats(),
                this.getNetworkStats()
            ]);

            const stats = {
                cpu,
                memory,
                disk,
                network,
                timestamp: now
            };

            // Cache the results
            this.cache.data = stats;
            this.cache.timestamp = now;

            return stats;
        } catch (error) {
            console.error('Error getting server stats:', error);
            return this.getErrorStats();
        }
    }

    async getCPUStats() {
        try {
            const cpuData = await si.currentLoad();
            return {
                usage: Math.round(cpuData.currentLoad),
                cores: cpuData.cpus.length,
                temperature: await this.getCPUTemperature()
            };
        } catch (error) {
            console.error('Error getting CPU stats:', error);
            return { usage: 0, cores: 0, temperature: 0 };
        }
    }

    async getCPUTemperature() {
        try {
            const tempData = await si.cpuTemperature();
            return Math.round(tempData.main || 0);
        } catch (error) {
            return 0;
        }
    }

    async getMemoryStats() {
        try {
            const memData = await si.mem();
            const totalGB = Math.round(memData.total / 1024 / 1024 / 1024 * 100) / 100;
            const usedGB = Math.round(memData.used / 1024 / 1024 / 1024 * 100) / 100;
            const freeGB = Math.round(memData.free / 1024 / 1024 / 1024 * 100) / 100;
            const usagePercent = Math.round((memData.used / memData.total) * 100);

            return {
                total: totalGB,
                used: usedGB,
                free: freeGB,
                usage: usagePercent
            };
        } catch (error) {
            console.error('Error getting memory stats:', error);
            return { total: 0, used: 0, free: 0, usage: 0 };
        }
    }

    async getDiskStats() {
        try {
            const diskData = await si.fsSize();
            const rootDisk = diskData.find(disk => disk.mount === '/') || diskData[0];
            
            if (!rootDisk) {
                return { total: 0, used: 0, free: 0, usage: 0 };
            }

            const totalGB = Math.round(rootDisk.size / 1024 / 1024 / 1024 * 100) / 100;
            const usedGB = Math.round(rootDisk.used / 1024 / 1024 / 1024 * 100) / 100;
            const freeGB = Math.round(rootDisk.available / 1024 / 1024 / 1024 * 100) / 100;
            const usagePercent = Math.round((rootDisk.used / rootDisk.size) * 100);

            return {
                total: totalGB,
                used: usedGB,
                free: freeGB,
                usage: usagePercent,
                mount: rootDisk.mount
            };
        } catch (error) {
            console.error('Error getting disk stats:', error);
            return { total: 0, used: 0, free: 0, usage: 0, mount: '/' };
        }
    }

    async getNetworkStats() {
        try {
            const networkData = await si.networkStats();
            const primaryInterface = networkData[0] || {};

            return {
                interface: primaryInterface.iface || 'unknown',
                download: Math.round(primaryInterface.rx_sec || 0),
                upload: Math.round(primaryInterface.tx_sec || 0),
                totalDownload: Math.round(primaryInterface.rx_bytes || 0),
                totalUpload: Math.round(primaryInterface.tx_bytes || 0)
            };
        } catch (error) {
            console.error('Error getting network stats:', error);
            return { interface: 'unknown', download: 0, upload: 0, totalDownload: 0, totalUpload: 0 };
        }
    }

    getErrorStats() {
        return {
            cpu: { usage: 0, cores: 0, temperature: 0 },
            memory: { total: 0, used: 0, free: 0, usage: 0 },
            disk: { total: 0, used: 0, free: 0, usage: 0, mount: '/' },
            network: { interface: 'unknown', download: 0, upload: 0, totalDownload: 0, totalUpload: 0 },
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

    formatSpeed(bytesPerSecond) {
        return this.formatBytes(bytesPerSecond) + '/s';
    }

    generateProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
}

module.exports = ServerMonitor;


