const Docker = require('dockerode');

class DockerMonitor {
    constructor() {
        // Get Docker socket path from environment variable, default to standard path
        this.socketPath = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
        
        try {
            this.docker = new Docker({ socketPath: this.socketPath });
            this.isAvailable = true;
            console.log(`Docker client initialized with socket: ${this.socketPath}`);
        } catch (error) {
            console.error(`Failed to initialize Docker client with socket ${this.socketPath}:`, error.message);
            this.docker = null;
            this.isAvailable = false;
        }
        
        this.cache = {
            data: null,
            timestamp: 0,
            ttl: 15000 // 15 seconds cache
        };
    }

    async getContainerStatus() {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.cache.data && (now - this.cache.timestamp) < this.cache.ttl) {
            return this.cache.data;
        }

        // Check if Docker is available
        if (!this.isAvailable || !this.docker) {
            console.log('Docker monitoring not available - socket not accessible');
            return this.getErrorStats('Docker socket not accessible');
        }

        try {
            const containers = await this.docker.listContainers({ all: true });
            const containerStats = await this.getContainerStats(containers);

            const stats = {
                total: containers.length,
                running: containers.filter(c => c.State === 'running').length,
                stopped: containers.filter(c => c.State === 'exited').length,
                containers: containerStats,
                timestamp: now,
                status: 'online'
            };

            // Cache the results
            this.cache.data = stats;
            this.cache.timestamp = now;

            return stats;
        } catch (error) {
            console.error('Error getting Docker container status:', error);
            return this.getErrorStats(error.message);
        }
    }

    async getContainerStats(containers) {
        const containerStats = [];

        for (const container of containers) {
            try {
                const container = this.docker.getContainer(container.Id);
                const stats = await container.stats({ stream: false });
                
                const containerInfo = {
                    id: container.Id.substring(0, 12),
                    name: container.Names[0]?.replace('/', '') || 'unknown',
                    state: container.State,
                    status: container.Status,
                    image: container.Image,
                    created: container.Created,
                    ports: container.Ports,
                    cpu: this.calculateCPUPercent(stats),
                    memory: this.calculateMemoryUsage(stats),
                    network: this.calculateNetworkUsage(stats)
                };

                containerStats.push(containerInfo);
            } catch (error) {
                console.error(`Error getting stats for container ${container.Id}:`, error);
                containerStats.push({
                    id: container.Id.substring(0, 12),
                    name: container.Names[0]?.replace('/', '') || 'unknown',
                    state: container.State,
                    status: container.Status,
                    image: container.Image,
                    created: container.Created,
                    ports: container.Ports,
                    cpu: 0,
                    memory: { usage: 0, limit: 0, percent: 0 },
                    network: { rx: 0, tx: 0 }
                });
            }
        }

        return containerStats;
    }

    calculateCPUPercent(stats) {
        try {
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
            const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100.0;
            return Math.round(cpuPercent * 100) / 100;
        } catch (error) {
            return 0;
        }
    }

    calculateMemoryUsage(stats) {
        try {
            const usage = stats.memory_stats.usage || 0;
            const limit = stats.memory_stats.limit || 0;
            const percent = limit > 0 ? (usage / limit) * 100 : 0;
            
            return {
                usage: Math.round(usage / 1024 / 1024 * 100) / 100, // MB
                limit: Math.round(limit / 1024 / 1024 * 100) / 100, // MB
                percent: Math.round(percent * 100) / 100
            };
        } catch (error) {
            return { usage: 0, limit: 0, percent: 0 };
        }
    }

    calculateNetworkUsage(stats) {
        try {
            const networks = stats.networks || {};
            let rx = 0;
            let tx = 0;

            Object.values(networks).forEach(network => {
                rx += network.rx_bytes || 0;
                tx += network.tx_bytes || 0;
            });

            return {
                rx: Math.round(rx / 1024 / 1024 * 100) / 100, // MB
                tx: Math.round(tx / 1024 / 1024 * 100) / 100  // MB
            };
        } catch (error) {
            return { rx: 0, tx: 0 };
        }
    }

    async getContainerByName(name) {
        try {
            const containers = await this.docker.listContainers({ all: true });
            const container = containers.find(c => 
                c.Names.some(n => n.replace('/', '') === name)
            );
            
            if (!container) return null;
            
            return this.docker.getContainer(container.Id);
        } catch (error) {
            console.error(`Error finding container ${name}:`, error);
            return null;
        }
    }

    async startContainer(name) {
        try {
            const container = await this.getContainerByName(name);
            if (!container) {
                throw new Error(`Container ${name} not found`);
            }
            
            await container.start();
            return { success: true, message: `Container ${name} started successfully` };
        } catch (error) {
            console.error(`Error starting container ${name}:`, error);
            return { success: false, message: error.message };
        }
    }

    async stopContainer(name) {
        try {
            const container = await this.getContainerByName(name);
            if (!container) {
                throw new Error(`Container ${name} not found`);
            }
            
            await container.stop();
            return { success: true, message: `Container ${name} stopped successfully` };
        } catch (error) {
            console.error(`Error stopping container ${name}:`, error);
            return { success: false, message: error.message };
        }
    }

    async restartContainer(name) {
        try {
            const container = await this.getContainerByName(name);
            if (!container) {
                throw new Error(`Container ${name} not found`);
            }
            
            await container.restart();
            return { success: true, message: `Container ${name} restarted successfully` };
        } catch (error) {
            console.error(`Error restarting container ${name}:`, error);
            return { success: false, message: error.message };
        }
    }

    getErrorStats(errorMessage = 'Docker monitoring unavailable') {
        return {
            total: 0,
            running: 0,
            stopped: 0,
            containers: [],
            timestamp: Date.now(),
            status: 'offline',
            error: errorMessage
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStatusEmoji(state) {
        switch (state) {
            case 'running': return '✅';
            case 'exited': return '❌';
            case 'paused': return '⏸️';
            case 'restarting': return '🔄';
            default: return '❓';
        }
    }
}

module.exports = DockerMonitor;


