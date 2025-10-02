const axios = require('axios');
const fs = require('fs');
const https = require('https');
const path = require('path');

class ProxmoxIntegration {
    constructor(services) {
        this.services = services;
        this.cache = {
            data: null,
            timestamp: 0,
            ttl: 30000 // 30 seconds cache
        };
    }

    async getProxmoxStatus() {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.cache.data && (now - this.cache.timestamp) < this.cache.ttl) {
            return this.cache.data;
        }

        try {
            const status = await this.getClusterStatus();
            
            // Cache the results
            this.cache.data = status;
            this.cache.timestamp = now;

            return status;
        } catch (error) {
            console.error('Error getting Proxmox status:', error);
            return { status: 'offline', message: error.message };
        }
    }

    async getClusterStatus() {
        try {
            // Create HTTPS agent that bypasses certificate validation
            const httpsAgent = new https.Agent({
                rejectUnauthorized: false
            });

            // Get cluster status
            const clusterResponse = await axios.get(`${this.services.proxmox.url}/api2/json/cluster/status`, {
                headers: {
                    'Authorization': `PVEAPIToken=${this.services.proxmox.username}=${this.services.proxmox.password}`
                },
                httpsAgent: httpsAgent
            });

            const clusterData = clusterResponse.data.data;
            
            // Get nodes
            const nodesResponse = await axios.get(`${this.services.proxmox.url}/api2/json/nodes`, {
                headers: {
                    'Authorization': `PVEAPIToken=${this.services.proxmox.username}=${this.services.proxmox.password}`
                },
                httpsAgent: httpsAgent
            });

            const nodes = nodesResponse.data.data;
            const nodeDetails = [];

            // Get details for each node
            for (const node of nodes) {
                try {
                    const nodeStats = await this.getNodeStats(node.node);
                    nodeDetails.push({
                        name: node.node,
                        status: nodeStats.status,
                        cpu: nodeStats.cpu,
                        memory: nodeStats.memory,
                        disk: nodeStats.disk,
                        uptime: nodeStats.uptime,
                        storage: nodeStats.storage,
                        message: nodeStats.message
                    });
                } catch (error) {
                    nodeDetails.push({
                        name: node.node,
                        status: 'offline',
                        message: error.message
                    });
                }
            }

            // Get VMs
            const vms = await this.getVMs();

            // Calculate summary
            const onlineNodes = nodeDetails.filter(n => n.status === 'online').length;
            const runningVMs = vms.filter(vm => vm.status === 'running').length;

            return {
                status: 'online',
                summary: {
                    totalNodes: nodes.length,
                    onlineNodes: onlineNodes,
                    totalVMs: vms.length,
                    runningVMs: runningVMs,
                    totalContainers: 0, // Proxmox containers would need separate API call
                    runningContainers: 0
                },
                nodes: nodeDetails,
                vms: vms
            };
        } catch (error) {
            console.error('Proxmox cluster error:', error.message);
            return { status: 'offline', message: error.message };
        }
    }

    async getNodeStats(nodeName) {
        try {
            // Create HTTPS agent that bypasses certificate validation
            const httpsAgent = new https.Agent({
                rejectUnauthorized: false
            });

            // Get node status first
            const statusResponse = await axios.get(`${this.services.proxmox.url}/api2/json/nodes/${nodeName}/status`, {
                headers: {
                    'Authorization': `PVEAPIToken=${this.services.proxmox.username}=${this.services.proxmox.password}`
                },
                httpsAgent: httpsAgent
            });

            // Get node stats using the correct endpoint
            let stats = null;
            try {
                // Try the correct stats endpoint
                const statsResponse = await axios.get(`${this.services.proxmox.url}/api2/json/nodes/${nodeName}/status`, {
                    headers: {
                        'Authorization': `PVEAPIToken=${this.services.proxmox.username}=${this.services.proxmox.password}`
                    },
                    httpsAgent: httpsAgent
                });
                
                // Also get storage information
                const storageResponse = await axios.get(`${this.services.proxmox.url}/api2/json/nodes/${nodeName}/storage`, {
                    headers: {
                        'Authorization': `PVEAPIToken=${this.services.proxmox.username}=${this.services.proxmox.password}`
                    },
                    httpsAgent: httpsAgent
                });
                
                stats = {
                    ...statsResponse.data.data,
                    storage: storageResponse.data.data
                };
                
                // Debug logging removed
            } catch (error) {
                console.log(`Error getting stats for ${nodeName}:`, error.message);
                // Continue without stats data
            }

            const status = statusResponse.data.data;

            // Process storage information for ZFS pools and other storage
            let storageInfo = '';
            if (stats && stats.storage) {
                const activeStorage = stats.storage.filter(s => s.active === 1 && s.enabled === 1 && s.total > 0);
                if (activeStorage.length > 0) {
                    storageInfo = '\n**Storage:**\n';
                    activeStorage.forEach(pool => {
                        const usage = pool.used && pool.total ? ((pool.used / pool.total) * 100).toFixed(1) : 'N/A';
                        const used = pool.used ? this.formatBytes(pool.used) : 'N/A';
                        const total = pool.total ? this.formatBytes(pool.total) : 'N/A';
                        const type = pool.type === 'zfspool' ? 'ZFS' : pool.type === 'lvmthin' ? 'LVM' : pool.type.toUpperCase();
                        
                        // Generate progress bar for storage usage
                        const progressBar = usage !== 'N/A' ? this.generateStorageProgressBar(parseFloat(usage)) : 'N/A';
                        storageInfo += `  • ${pool.storage} (${type}): ${progressBar} ${usage}% (${used}/${total})\n`;
                    });
                }
            }

            return {
                status: status.status || 'online',
                cpu: stats ? {
                    usage: stats.cpu ? ((stats.cpu * 100) || 0).toFixed(1) : 'N/A',
                    cores: status.cpuinfo?.cores || stats.cpuinfo?.cores || 'Unknown'
                } : {
                    usage: 'N/A',
                    cores: status.cpuinfo?.cores || 'Unknown'
                },
                memory: stats ? {
                    usage: (stats.memory && stats.memory.used && stats.memory.total) ? ((stats.memory.used / stats.memory.total) * 100).toFixed(1) : 'N/A',
                    used: stats.memory?.used ? this.formatBytes(stats.memory.used) : 'N/A',
                    total: stats.memory?.total ? this.formatBytes(stats.memory.total) : 'N/A'
                } : {
                    usage: 'N/A',
                    used: 'N/A',
                    total: 'N/A'
                },
                disk: stats ? {
                    usage: (stats.rootfs?.used && stats.rootfs?.total) ? ((stats.rootfs.used / stats.rootfs.total) * 100).toFixed(1) : 'N/A',
                    used: stats.rootfs?.used ? this.formatBytes(stats.rootfs.used) : 'N/A',
                    total: stats.rootfs?.total ? this.formatBytes(stats.rootfs.total) : 'N/A'
                } : {
                    usage: 'N/A',
                    used: 'N/A',
                    total: 'N/A'
                },
                uptime: stats ? (stats.uptime ? this.formatUptime(stats.uptime) : 'N/A') : 'N/A',
                storage: storageInfo
            };
        } catch (error) {
            return { status: 'offline', message: error.message };
        }
    }

    async getVMs() {
        try {
            // Create HTTPS agent that bypasses certificate validation
            const httpsAgent = new https.Agent({
                rejectUnauthorized: false
            });

            const response = await axios.get(`${this.services.proxmox.url}/api2/json/cluster/resources?type=vm`, {
                headers: {
                    'Authorization': `PVEAPIToken=${this.services.proxmox.username}=${this.services.proxmox.password}`
                },
                httpsAgent: httpsAgent
            });

            return response.data.data.map(vm => ({
                id: vm.vmid,
                name: vm.name,
                status: vm.status,
                cpu: vm.maxcpu,
                memory: vm.maxmem ? this.formatBytes(vm.maxmem * 1024 * 1024) : 'N/A',
                node: vm.node
            }));
        } catch (error) {
            console.error('Error getting VMs:', error.message);
            return [];
        }
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatUptime(seconds) {
        if (!seconds) return 'Unknown';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    generateStorageProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
}

module.exports = ProxmoxIntegration;