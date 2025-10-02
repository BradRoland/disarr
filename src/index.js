const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import modules
const ServerMonitor = require('./modules/ServerMonitor');
const DockerMonitor = require('./modules/DockerMonitor');
const ARRIntegration = require('./modules/ARRIntegration');
const MediaDashboard = require('./modules/MediaDashboard');
const DashboardEmbed = require('./modules/DashboardEmbed');
const RichPresence = require('./modules/RichPresence');
const DownloadMonitor = require('./modules/DownloadMonitor');
const ProxmoxIntegration = require('./modules/ProxmoxIntegration');

class HomeLabBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.commands = new Collection();
        this.modules = {};
        this.config = this.loadConfig();
        this.lastDashboardMessageId = null;
        this.lastRichPresence = null;
        this.currentRichPresenceIndex = 0;
        
        this.setupEventHandlers();
        this.loadCommands();
        this.initializeModules();
        this.autoPostDashboard();
    }

    loadConfig() {
        // Always use .env configuration instead of config.json
        return {
            refreshInterval: parseInt(process.env.REFRESH_INTERVAL) || 30000,
            dashboardChannelId: process.env.DASHBOARD_CHANNEL_ID,
            alertChannelId: process.env.ALERT_CHANNEL_ID,
            services: this.loadServicesConfig()
        };
    }

    loadServicesConfig() {
        // Helper function to check if a service should be included
        const shouldIncludeService = (url, ...otherRequiredFields) => {
            // Check if URL exists and is not empty/undefined
            if (!url || url.trim() === '') return false;
            
            // For services that require additional fields, check if they exist
            for (const field of otherRequiredFields) {
                if (field === undefined || field === null || field.trim() === '') {
                    return false;
                }
            }
            
            return true;
        };

        // Always use .env URLs as they are the real service URLs
        const services = {};
        
        // Core ARR Services
        if (shouldIncludeService(process.env.RADARR_URL, process.env.RADARR_API_KEY)) {
            services.radarr = { url: process.env.RADARR_URL, apiKey: process.env.RADARR_API_KEY };
        }
        if (shouldIncludeService(process.env.SONARR_URL, process.env.SONARR_API_KEY)) {
            services.sonarr = { url: process.env.SONARR_URL, apiKey: process.env.SONARR_API_KEY };
        }
        if (shouldIncludeService(process.env.LIDARR_URL, process.env.LIDARR_API_KEY)) {
            services.lidarr = { url: process.env.LIDARR_URL, apiKey: process.env.LIDARR_API_KEY };
        }
        if (shouldIncludeService(process.env.READARR_URL, process.env.READARR_API_KEY)) {
            services.readarr = { url: process.env.READARR_URL, apiKey: process.env.READARR_API_KEY };
        }
        if (shouldIncludeService(process.env.PROWLARR_URL, process.env.PROWLARR_API_KEY)) {
            services.prowlarr = { url: process.env.PROWLARR_URL, apiKey: process.env.PROWLARR_API_KEY };
        }
        
        // Media Services
        if (shouldIncludeService(process.env.JELLYFIN_URL, process.env.JELLYFIN_API_KEY)) {
            services.jellyfin = { url: process.env.JELLYFIN_URL, apiKey: process.env.JELLYFIN_API_KEY };
        }
        if (shouldIncludeService(process.env.PLEX_URL, process.env.PLEX_TOKEN)) {
            services.plex = { url: process.env.PLEX_URL, token: process.env.PLEX_TOKEN };
        }
        
        // Download Clients
        if (shouldIncludeService(process.env.QBITTORRENT_URL, process.env.QBITTORRENT_USERNAME, process.env.QBITTORRENT_PASSWORD)) {
            services.qbittorrent = { 
                url: process.env.QBITTORRENT_URL, 
                username: process.env.QBITTORRENT_USERNAME,
                password: process.env.QBITTORRENT_PASSWORD 
            };
        }
        if (shouldIncludeService(process.env.NZBGET_URL, process.env.NZBGET_USERNAME, process.env.NZBGET_PASSWORD)) {
            services.nzbget = { 
                url: process.env.NZBGET_URL, 
                username: process.env.NZBGET_USERNAME,
                password: process.env.NZBGET_PASSWORD 
            };
        }
        
        // Request Management
        if (shouldIncludeService(process.env.OVERSEERR_URL, process.env.OVERSEERR_API_KEY)) {
            services.overseerr = { url: process.env.OVERSEERR_URL, apiKey: process.env.OVERSEERR_API_KEY };
        }
        
        // File Management and Cloud Services
        if (shouldIncludeService(process.env.NEXTCLOUD_URL)) {
            services.nextcloud = { url: process.env.NEXTCLOUD_URL };
        }
        if (shouldIncludeService(process.env.FILEFLOWS_URL)) {
            services.fileflows = { url: process.env.FILEFLOWS_URL };
        }
        if (shouldIncludeService(process.env.NAVIDROME_URL)) {
            services.navidrome = { url: process.env.NAVIDROME_URL };
        }
        if (shouldIncludeService(process.env.IMMICH_URL)) {
            services.immich = { url: process.env.IMMICH_URL };
        }
        
        // Infrastructure
        if (shouldIncludeService(process.env.PROXMOX_URL, process.env.PROXMOX_USERNAME, process.env.PROXMOX_PASSWORD)) {
            services.proxmox = { 
                url: process.env.PROXMOX_URL, 
                username: process.env.PROXMOX_USERNAME,
                password: process.env.PROXMOX_PASSWORD,
                realm: process.env.PROXMOX_REALM || 'pve'
            };
        }
        if (shouldIncludeService(process.env.PORTAINER_URL)) {
            services.portainer = { url: process.env.PORTAINER_URL };
        }
        
        // Additional services from published application routes
        if (shouldIncludeService(process.env.WIZARR_URL)) {
            services.wizarr = { url: process.env.WIZARR_URL };
        }
        if (shouldIncludeService(process.env.SOLVER_URL)) {
            services.solver = { url: process.env.SOLVER_URL };
        }
        if (shouldIncludeService(process.env.STATPP_URL)) {
            services.statpp = { url: process.env.STATPP_URL };
        }
        if (shouldIncludeService(process.env.BUDGET_URL)) {
            services.budget = { url: process.env.BUDGET_URL };
        }
        if (shouldIncludeService(process.env.CRAFT_URL)) {
            services.craft = { url: process.env.CRAFT_URL };
        }
        if (shouldIncludeService(process.env.CHAN_URL)) {
            services.chan = { url: process.env.CHAN_URL };
        }
        if (shouldIncludeService(process.env.BAZ_URL)) {
            services.baz = { url: process.env.BAZ_URL };
        }
        if (shouldIncludeService(process.env.FRONT_URL)) {
            services.front = { url: process.env.FRONT_URL };
        }
        if (shouldIncludeService(process.env.JELLYSTAT_URL)) {
            services.jellystat = { url: process.env.JELLYSTAT_URL };
        }
        if (shouldIncludeService(process.env.PASS_URL)) {
            services.pass = { url: process.env.PASS_URL };
        }
        if (shouldIncludeService(process.env.N8N_URL)) {
            services.n8n = { url: process.env.N8N_URL };
        }
        if (shouldIncludeService(process.env.PLEXSTAT_URL)) {
            services.plexstat = { url: process.env.PLEXSTAT_URL };
        }
        if (shouldIncludeService(process.env.AG_URL)) {
            services.ag = { url: process.env.AG_URL };
        }
        
        return services;
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`🤖 HomeLab Discord Bot is online as ${this.client.user.tag}!`);
            this.setupSlashCommands();
            this.startPeriodicUpdates();
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, this);
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}:`, error);
                await interaction.reply({ 
                    content: 'There was an error while executing this command!', 
                    ephemeral: true 
                });
            }
        });

        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
        });
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                this.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        }
    }

    async setupSlashCommands() {
        const commands = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
        
        try {
            console.log('🔄 Registering slash commands...');
            await this.client.application.commands.set(commands);
            console.log('✅ Slash commands registered successfully!');
        } catch (error) {
            console.error('❌ Error registering slash commands:', error);
        }
    }

    initializeModules() {
        this.modules.serverMonitor = new ServerMonitor();
        this.modules.dockerMonitor = new DockerMonitor();
        this.modules.arrIntegration = new ARRIntegration(this.config.services);
        this.modules.mediaDashboard = new MediaDashboard(this.config.services);
        this.modules.downloadMonitor = new DownloadMonitor(this.config.services);
        this.modules.proxmoxIntegration = new ProxmoxIntegration(this.config.services);
        this.modules.dashboardEmbed = new DashboardEmbed(this.config);
        this.modules.richPresence = new RichPresence(this.client);
    }

    startPeriodicUpdates() {
        setInterval(async () => {
            try {
                await this.updateRichPresence();
            } catch (error) {
                console.error('Error updating rich presence:', error);
            }
        }, this.config.refreshInterval);

        // Auto-update dashboard every 10 seconds
        setInterval(async () => {
            try {
                await this.updateDashboardMessage();
            } catch (error) {
                console.error('Error updating dashboard message:', error);
            }
        }, 10000); // 10 seconds
    }

    async updateRichPresence() {
        try {
            const dashboardData = await this.getDashboardData();
            
            // Get total people watching
            let totalWatching = 0;
            if (dashboardData.media?.jellyfin?.status === 'online') {
                totalWatching += dashboardData.media.jellyfin.activeStreams || 0;
            }
            if (dashboardData.media?.plex?.status === 'online') {
                totalWatching += dashboardData.media.plex.activeStreams || 0;
            }

            // Get server stats for rotation
            let serverStats = [];
            
            // Try to get Proxmox PVE node stats first
            if (dashboardData.proxmox?.status === 'online' && dashboardData.proxmox.nodes) {
                const pveNode = dashboardData.proxmox.nodes.find(node => node.name === 'pve');
                if (pveNode && pveNode.status === 'online') {
                    if (pveNode.cpu?.usage !== 'N/A') {
                        serverStats.push(`CPU: ${pveNode.cpu.usage}%`);
                    }
                    if (pveNode.memory?.usage !== 'N/A') {
                        serverStats.push(`RAM: ${pveNode.memory.usage}%`);
                    }
                    if (pveNode.disk?.usage !== 'N/A') {
                        serverStats.push(`Disk: ${pveNode.disk.usage}%`);
                    }
                }
            }
            
            // Fallback to generic server stats if Proxmox not available
            if (serverStats.length === 0 && dashboardData.server?.status === 'online') {
                if (dashboardData.server.cpu?.usage !== undefined) {
                    serverStats.push(`CPU: ${dashboardData.server.cpu.usage}%`);
                }
                if (dashboardData.server.memory?.usage !== undefined) {
                    serverStats.push(`RAM: ${dashboardData.server.memory.usage}%`);
                }
                if (dashboardData.server.disk?.usage !== undefined) {
                    serverStats.push(`Disk: ${dashboardData.server.disk.usage}%`);
                }
            }

            // Build activity text
            const activities = [];
            
            // Always include people watching if there are any
            if (totalWatching > 0) {
                activities.push(`👥 ${totalWatching} watching`);
            }
            
            // Add rotating server stat
            if (serverStats.length > 0) {
                const currentStat = serverStats[this.currentRichPresenceIndex % serverStats.length];
                activities.push(currentStat);
                
                // Move to next stat for next update
                this.currentRichPresenceIndex = (this.currentRichPresenceIndex + 1) % serverStats.length;
            }

            // Default if nothing specific
            if (activities.length === 0) {
                activities.push('🏠 Monitoring HomeLab');
            }

            const activityText = activities.join(' | ');
            
            // Only update if different from last activity
            if (activityText !== this.lastRichPresence) {
                this.client.user.setActivity(activityText, { type: ActivityType.Watching });
                this.lastRichPresence = activityText;
                console.log(`🔄 Rich Presence: ${activityText}`);
            }
        } catch (error) {
            console.error('Error updating rich presence:', error);
        }
    }

    async autoPostDashboard() {
        // Wait a bit for the bot to be fully ready
        setTimeout(async () => {
            try {
                const channel = this.client.channels.cache.get(this.config.dashboardChannelId);
                if (!channel) {
                    console.log('Dashboard channel not found, skipping auto-post');
                    return;
                }

                const dashboardData = await this.getDashboardData();
                const mainDashboardData = this.modules.dashboardEmbed.createMainDashboard(dashboardData);
                const quickLinksData = this.modules.dashboardEmbed.createQuickLinksEmbed(dashboardData);

                const message = await channel.send({ 
                    embeds: [...mainDashboardData.embeds, ...quickLinksData.embeds],
                    components: [...mainDashboardData.components, ...quickLinksData.components]
                });

                // Store the message ID for auto-updates
                this.lastDashboardMessageId = message.id;
                console.log('✅ Auto-posted dashboard to channel, will update every 10 seconds');
            } catch (error) {
                console.error('Error auto-posting dashboard:', error);
            }
        }, 5000); // Wait 5 seconds after bot starts
    }

    async updateDashboardMessage() {
        if (!this.lastDashboardMessageId) return; // No dashboard message to update yet

        try {
            const channel = this.client.channels.cache.get(this.config.dashboardChannelId);
            if (!channel) return;

            const message = await channel.messages.fetch(this.lastDashboardMessageId);
            if (!message) return;

            const dashboardData = await this.getDashboardData();
            const mainDashboardData = this.modules.dashboardEmbed.createMainDashboard(dashboardData);
            const quickLinksData = this.modules.dashboardEmbed.createQuickLinksEmbed(dashboardData);

            await message.edit({ 
                embeds: [...mainDashboardData.embeds, ...quickLinksData.embeds],
                components: [...mainDashboardData.components, ...quickLinksData.components]
            });
        } catch (error) {
            console.error('Error updating dashboard message:', error);
        }
    }

    async getDashboardData() {
        try {
            const [serverStats, dockerStats, arrStats, mediaStats, downloadStats, proxmoxStats] = await Promise.allSettled([
                this.modules.serverMonitor.getStats().catch(err => ({ error: err.message, status: 'offline' })),
                this.modules.dockerMonitor.getContainerStatus().catch(err => ({ error: err.message, status: 'offline' })),
                this.modules.arrIntegration.getARRStatus().catch(err => ({ error: err.message, status: 'offline' })),
                this.modules.mediaDashboard.getCurrentActivity().catch(err => ({ error: err.message, status: 'offline' })),
                this.modules.downloadMonitor.getDownloadStatus().catch(err => ({ error: err.message, status: 'offline' })),
                this.modules.proxmoxIntegration.getProxmoxStatus().catch(err => ({ error: err.message, status: 'offline' }))
            ]);

            return {
                server: serverStats.status === 'fulfilled' ? serverStats.value : { error: 'Server monitoring unavailable', status: 'offline' },
                docker: dockerStats.status === 'fulfilled' ? dockerStats.value : { error: 'Docker monitoring unavailable', status: 'offline' },
                arr: arrStats.status === 'fulfilled' ? arrStats.value : { error: 'ARR integration unavailable', status: 'offline' },
                media: mediaStats.status === 'fulfilled' ? mediaStats.value : { error: 'Media monitoring unavailable', status: 'offline' },
                downloads: downloadStats.status === 'fulfilled' ? downloadStats.value : { error: 'Download monitoring unavailable', status: 'offline' },
                proxmox: proxmoxStats.status === 'fulfilled' ? proxmoxStats.value : { error: 'Proxmox integration unavailable', status: 'offline' }
            };
        } catch (error) {
            console.error('Error gathering dashboard data:', error);
            throw error;
        }
    }

    async start() {
        try {
            await this.client.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            console.error('Failed to start bot:', error);
            process.exit(1);
        }
    }
}

// Start the bot
const bot = new HomeLabBot();
bot.start();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down HomeLab Discord Bot...');
    bot.client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down HomeLab Discord Bot...');
    bot.client.destroy();
    process.exit(0);
});

module.exports = HomeLabBot;
