const { Client, GatewayIntentBits, Collection, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
const WizarrIntegration = require('./modules/WizarrIntegration');
const AdminManager = require('./modules/AdminManager');
const InviteManager = require('./modules/InviteManager');

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
            dashboardChannelId: null, // Will be set dynamically via /dashboard command
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
        if (shouldIncludeService(process.env.WIZARR_URL, process.env.WIZARR_API_KEY)) {
            services.wizarr = { url: process.env.WIZARR_URL, apiKey: process.env.WIZARR_API_KEY };
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
        this.client.once('ready', async () => {
            console.log(`🤖 HomeLab Discord Bot is online as ${this.client.user.tag}!`);
            this.setupSlashCommands();
            this.startPeriodicUpdates();
            
            // Restore button collectors for existing pending invites after bot is ready
            if (this.modules.inviteManager) {
                setTimeout(async () => {
                    await this.modules.inviteManager.restoreButtonCollectors();
                }, 2000); // Wait 2 seconds for everything to be fully ready
            }
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isChatInputCommand()) {
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
            } else if (interaction.isButton()) {
                await this.handleButtonInteraction(interaction);
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
            try {
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    this.commands.set(command.data.name, command);
                    console.log(`✅ Loaded command: ${command.data.name}`);
                } else {
                    console.log(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`❌ Error loading command ${file}:`, error.message);
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
        // Dashboard channel will be loaded from saved config file if it exists
        this.modules.downloadMonitor = new DownloadMonitor(this.config.services);
        this.modules.proxmoxIntegration = new ProxmoxIntegration(this.config.services);
        this.modules.dashboardEmbed = new DashboardEmbed(this.config);
        this.modules.richPresence = new RichPresence(this.client);
        this.modules.wizarrIntegration = new WizarrIntegration({
            wizarr: this.config.services.wizarr
        });
        
        // Debug Wizarr configuration
        console.log('Wizarr configuration:', {
            isConfigured: this.modules.wizarrIntegration.isConfigured(),
            baseUrl: this.modules.wizarrIntegration.baseUrl,
            hasApiKey: !!this.modules.wizarrIntegration.apiKey
        });
        this.modules.adminManager = new AdminManager();
        this.modules.inviteManager = new InviteManager(this.client, this.config, this);
    }

    async handleButtonInteraction(interaction) {
        try {
            const customId = interaction.customId;
            
            if (customId.startsWith('dashboard_links_') || customId.startsWith('dashboard_service_')) {
                await this.handleDashboardButtonInteraction(interaction);
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            await interaction.reply({
                content: 'There was an error processing this request.',
                ephemeral: true
            });
        }
    }

    async handleDashboardButtonInteraction(interaction) {
        try {
            console.log('Dashboard button interaction received:', interaction.customId);
            const customId = interaction.customId;
            
            if (!this.modules.mediaDashboard) {
                console.log('MediaDashboard module not available');
                return await interaction.reply({
                    content: '❌ Dashboard module not available.',
                    ephemeral: true
                });
            }

            // Defer the interaction to give us time to process
            await interaction.deferUpdate();
            console.log('Interaction deferred successfully');

            console.log('Processing button click:', customId);

            // Process the button click first
            if (customId === 'dashboard_links_all') {
                console.log('Setting all services enabled');
                this.modules.mediaDashboard.setEnabledServices('all');
            } else if (customId === 'dashboard_links_none') {
                console.log('Setting all services disabled');
                this.modules.mediaDashboard.setEnabledServices([]);
            } else if (customId === 'dashboard_links_reset') {
                console.log('Resetting to default (all enabled)');
                this.modules.mediaDashboard.setEnabledServices('all');
            } else if (customId.startsWith('dashboard_service_')) {
                const service = customId.replace('dashboard_service_', '');
                const enabledServices = this.modules.mediaDashboard.getEnabledServices();
                
                console.log('Toggling service:', service, 'Current enabled services:', enabledServices);
                
                let isEnabled = false;
                if (enabledServices === 'all') {
                    isEnabled = true;
                } else if (Array.isArray(enabledServices)) {
                    isEnabled = enabledServices.includes(service);
                }
                
                if (isEnabled) {
                    console.log('Removing service:', service);
                    this.modules.mediaDashboard.removeService(service);
                } else {
                    console.log('Adding service:', service);
                    this.modules.mediaDashboard.addService(service);
                }
            }

            console.log('Refreshing dashboard menu...');
            // Now update the menu with the new state
            await this.refreshDashboardMenu(interaction);

            // Update the dashboard immediately if it's currently posted
            try {
                if (this.lastDashboardMessageId) {
                    console.log('Updating main dashboard message...');
                    await this.updateDashboardMessage();
                }
            } catch (error) {
                console.error('Error updating dashboard after button interaction:', error);
            }

            console.log('Dashboard button interaction completed successfully');

        } catch (error) {
            console.error('Error handling dashboard button interaction:', error);
            console.error('Error stack:', error.stack);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({
                        content: 'There was an error processing this request.',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: 'There was an error processing this request.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error sending error reply:', replyError);
            }
        }
    }

    async refreshDashboardMenu(interaction) {
        try {
            console.log('Refreshing dashboard menu...');
            const enabledServices = this.modules.mediaDashboard.getEnabledServices();
            console.log('Current enabled services:', enabledServices);
            const allServices = [
                { name: 'Jellyfin', value: 'jellyfin', emoji: '🎬' },
                { name: 'Plex', value: 'plex', emoji: '🎭' },
                { name: 'Radarr', value: 'radarr', emoji: '🎬' },
                { name: 'Sonarr', value: 'sonarr', emoji: '📺' },
                { name: 'Lidarr', value: 'lidarr', emoji: '🎵' },
                { name: 'Prowlarr', value: 'prowlarr', emoji: '🔍' },
                { name: 'qBittorrent', value: 'qbittorrent', emoji: '⬇️' },
                { name: 'NZBGet', value: 'nzbget', emoji: '📥' },
                { name: 'Overseerr', value: 'overseerr', emoji: '🎯' },
                { name: 'Nextcloud', value: 'nextcloud', emoji: '☁️' },
                { name: 'FileFlows', value: 'fileflows', emoji: '🔄' },
                { name: 'Navidrome', value: 'navidrome', emoji: '🎶' },
                { name: 'Immich', value: 'immich', emoji: '📸' },
                { name: 'Proxmox', value: 'proxmox', emoji: '🖥️' },
                { name: 'Jellystat', value: 'jellystat', emoji: '📊' },
                { name: 'N8N', value: 'n8n', emoji: '⚡' },
                { name: 'PlexStat', value: 'plexstat', emoji: '📈' },
                { name: 'AG', value: 'ag', emoji: '🔧' }
            ];

            // Create service selection embed
            const embed = new EmbedBuilder()
                .setTitle('🔧 Dashboard Service Links Configuration')
                .setDescription('Select which services you want to show on the dashboard links.\n\n**Current Status:**')
                .setColor(0x0099ff)
                .setTimestamp();

            // Add current status
            if (enabledServices === 'all') {
                embed.addFields({ name: '📋 Enabled Services', value: 'All Services', inline: false });
            } else if (Array.isArray(enabledServices) && enabledServices.length > 0) {
                const serviceList = enabledServices.map(service => {
                    const serviceInfo = allServices.find(s => s.value === service);
                    return serviceInfo ? `${serviceInfo.emoji} ${serviceInfo.name}` : `• ${service}`;
                }).join('\n');
                embed.addFields({ name: '📋 Enabled Services', value: serviceList, inline: false });
            } else {
                embed.addFields({ name: '📋 Enabled Services', value: 'No Services', inline: false });
            }

            // Create action buttons
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('dashboard_links_all')
                        .setLabel('✅ Enable All')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('dashboard_links_none')
                        .setLabel('❌ Disable All')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('dashboard_links_reset')
                        .setLabel('🔄 Reset to Default')
                        .setStyle(ButtonStyle.Secondary)
                );

            // Create service selection buttons (first 5 services)
            const serviceRow1 = new ActionRowBuilder();
            allServices.slice(0, 5).forEach(service => {
                let isEnabled = false;
                if (enabledServices === 'all') {
                    isEnabled = true;
                } else if (Array.isArray(enabledServices)) {
                    isEnabled = enabledServices.includes(service.value);
                }
                
                console.log(`Service ${service.name}: enabled=${isEnabled}, enabledServices=${JSON.stringify(enabledServices)}`);
                
                serviceRow1.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`dashboard_service_${service.value}`)
                        .setLabel(`${isEnabled ? '✅' : '❌'} ${service.name}`)
                        .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                );
            });

            // Create service selection buttons (next 5 services)
            const serviceRow2 = new ActionRowBuilder();
            allServices.slice(5, 10).forEach(service => {
                let isEnabled = false;
                if (enabledServices === 'all') {
                    isEnabled = true;
                } else if (Array.isArray(enabledServices)) {
                    isEnabled = enabledServices.includes(service.value);
                }
                
                serviceRow2.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`dashboard_service_${service.value}`)
                        .setLabel(`${isEnabled ? '✅' : '❌'} ${service.name}`)
                        .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                );
            });

            // Create service selection buttons (next 5 services)
            const serviceRow3 = new ActionRowBuilder();
            allServices.slice(10, 15).forEach(service => {
                let isEnabled = false;
                if (enabledServices === 'all') {
                    isEnabled = true;
                } else if (Array.isArray(enabledServices)) {
                    isEnabled = enabledServices.includes(service.value);
                }
                
                serviceRow3.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`dashboard_service_${service.value}`)
                        .setLabel(`${isEnabled ? '✅' : '❌'} ${service.name}`)
                        .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                );
            });

            // Create service selection buttons (remaining services)
            const serviceRow4 = new ActionRowBuilder();
            allServices.slice(15).forEach(service => {
                let isEnabled = false;
                if (enabledServices === 'all') {
                    isEnabled = true;
                } else if (Array.isArray(enabledServices)) {
                    isEnabled = enabledServices.includes(service.value);
                }
                
                serviceRow4.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`dashboard_service_${service.value}`)
                        .setLabel(`${isEnabled ? '✅' : '❌'} ${service.name}`)
                        .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
                );
            });

            const components = [actionRow, serviceRow1, serviceRow2, serviceRow3, serviceRow4].filter(row => row.components.length > 0);

            // Since we deferred the interaction, we should always use editReply
            await interaction.editReply({ 
                embeds: [embed], 
                components: components
            });

        } catch (error) {
            console.error('Error refreshing dashboard menu:', error);
        }
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

    async autoPostDashboard(immediate = false) {
        const postDashboard = async () => {
            try {
                // Check if a dashboard channel has been set via the /dashboard command
                const dashboardChannelId = this.modules.mediaDashboard.getDashboardChannel();
                if (!dashboardChannelId) {
                    console.log('No dashboard channel set via /dashboard command, skipping auto-post');
                    return;
                }

                const channel = this.client.channels.cache.get(dashboardChannelId);
                if (!channel) {
                    console.log('Dashboard channel not found, skipping auto-post');
                    return;
                }

                const dashboardData = await this.getDashboardData();
                const enabledServices = this.modules.mediaDashboard.getEnabledServices();
                const mainDashboardData = this.modules.dashboardEmbed.createMainDashboard(dashboardData, enabledServices);

                const message = await channel.send({ 
                    embeds: mainDashboardData.embeds,
                    components: mainDashboardData.components
                });

                // Store the message ID for auto-updates
                this.lastDashboardMessageId = message.id;
                console.log(`✅ Auto-posted dashboard to ${channel.name}, will update every 10 seconds`);
            } catch (error) {
                console.error('Error auto-posting dashboard:', error);
            }
        };

        if (immediate) {
            // Post immediately (called from dashboard command)
            await postDashboard();
        } else {
            // Wait a bit for the bot to be fully ready (called on startup)
            setTimeout(postDashboard, 5000);
        }
    }

    async updateDashboardMessage() {
        if (!this.lastDashboardMessageId) return; // No dashboard message to update yet

        try {
            // Check if a dashboard channel has been set via the /dashboard command
            const dashboardChannelId = this.modules.mediaDashboard.getDashboardChannel();
            if (!dashboardChannelId) {
                // No channel set, reset the message ID
                this.lastDashboardMessageId = null;
                return;
            }

            const channel = this.client.channels.cache.get(dashboardChannelId);
            if (!channel) return;

            const message = await channel.messages.fetch(this.lastDashboardMessageId);
            if (!message) {
                // Message was deleted, reset the ID so we can create a new one
                this.lastDashboardMessageId = null;
                return;
            }

            const dashboardData = await this.getDashboardData();
            const enabledServices = this.modules.mediaDashboard.getEnabledServices();
            const mainDashboardData = this.modules.dashboardEmbed.createMainDashboard(dashboardData, enabledServices);

            await message.edit({ 
                embeds: mainDashboardData.embeds,
                components: mainDashboardData.components
            });
        } catch (error) {
            console.error('Error updating dashboard message:', error);
            // If the message doesn't exist, reset the ID
            if (error.code === 10008) { // Unknown Message
                this.lastDashboardMessageId = null;
            }
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
