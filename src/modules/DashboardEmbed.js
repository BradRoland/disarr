const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class DashboardEmbed {
    constructor(config) {
        this.config = config;
        this.services = config.services;
    }

    createMainDashboard(data) {
        const embed = new EmbedBuilder()
            .setTitle('🖥️ HomeLab Dashboard')
            .setDescription('Real-time status overview of Brad\'s Home Server')
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({ text: 'HomeLab Discord Bot • Last updated' });

        // Server Stats
        const serverStats = this.formatServerStats(data.server, data.proxmox);
        embed.addFields({
            name: '🖥️ Server Stats',
            value: serverStats,
            inline: true
        });

        // Docker Status
        const dockerStats = this.formatDockerStats(data.docker);
        embed.addFields({
            name: '🐳 Docker Status',
            value: dockerStats,
            inline: true
        });

        // Media Activity
        const mediaStats = this.formatMediaStats(data.media);
        embed.addFields({
            name: '🎬 Media Activity',
            value: mediaStats,
            inline: true
        });

        // ARR Stack Status
        const arrStats = this.formatARRStats(data.arr);
        embed.addFields({
            name: '📡 ARR Stack',
            value: arrStats,
            inline: false
        });

        // Download Status
        const downloadStats = this.formatDownloadStats(data.downloads);
        embed.addFields({
            name: '⬇️ Downloads',
            value: downloadStats,
            inline: false
        });

        // Proxmox Status
        const proxmoxStats = this.formatProxmoxStats(data.proxmox);
        embed.addFields({
            name: '🖥️ Proxmox Cluster',
            value: proxmoxStats,
            inline: false
        });

        const components = [
            this.createQuickLinksRow(),
            this.createSecondQuickLinksRow(),
            this.createThirdQuickLinksRow(),
            this.createFourthQuickLinksRow(),
            this.createFifthQuickLinksRow()
        ].filter(row => row !== null);
        
        return {
            embeds: [embed],
            components: components.length > 0 ? components : []
        };
    }

    createServerStatsEmbed(serverData) {
        const embed = new EmbedBuilder()
            .setTitle('🖥️ Server Statistics')
            .setColor(0x0099ff)
            .setTimestamp();

        const cpuBar = this.generateProgressBar(serverData.cpu.usage, 20);
        const memBar = this.generateProgressBar(serverData.memory.usage, 20);
        const diskBar = this.generateProgressBar(serverData.disk.usage, 20);

        embed.addFields(
            {
                name: '💻 CPU Usage',
                value: `${cpuBar} **${serverData.cpu.usage}%**\n${serverData.cpu.cores} cores • ${serverData.cpu.temperature}°C`,
                inline: true
            },
            {
                name: '🧠 Memory Usage',
                value: `${memBar} **${serverData.memory.usage}%**\n${serverData.memory.used}GB / ${serverData.memory.total}GB`,
                inline: true
            },
            {
                name: '💾 Disk Usage',
                value: `${diskBar} **${serverData.disk.usage}%**\n${serverData.disk.used}TB / ${serverData.disk.total}TB`,
                inline: true
            },
            {
                name: '🌐 Network',
                value: `**Interface:** ${serverData.network.interface}\n**Download:** ${this.formatBytes(serverData.network.download)}/s\n**Upload:** ${this.formatBytes(serverData.network.upload)}/s`,
                inline: false
            }
        );

        return { embeds: [embed] };
    }

    createDockerStatusEmbed(dockerData) {
        const embed = new EmbedBuilder()
            .setTitle('🐳 Docker Container Status')
            .setColor(0x00ff00)
            .setTimestamp();

        const runningEmoji = '✅';
        const stoppedEmoji = '❌';
        const pausedEmoji = '⏸️';

        embed.addFields({
            name: '📊 Overview',
            value: `**Total:** ${dockerData.total} containers\n**Running:** ${runningEmoji} ${dockerData.running}\n**Stopped:** ${stoppedEmoji} ${dockerData.stopped}`,
            inline: true
        });

        // Show top containers by resource usage
        const topContainers = dockerData.containers
            .filter(c => c.state === 'running')
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 5);

        if (topContainers.length > 0) {
            const containerList = topContainers.map(container => {
                const statusEmoji = container.state === 'running' ? runningEmoji : 
                                  container.state === 'paused' ? pausedEmoji : stoppedEmoji;
                return `${statusEmoji} **${container.name}** - CPU: ${container.cpu}% | RAM: ${container.memory.percent}%`;
            }).join('\n');

            embed.addFields({
                name: '🔥 Top Containers (by CPU)',
                value: containerList,
                inline: false
            });
        }

        return { embeds: [embed] };
    }

    createARRStatusEmbed(arrData) {
        const embed = new EmbedBuilder()
            .setTitle('📡 ARR Stack Status')
            .setColor(0x00ff00)
            .setTimestamp();

        const services = [
            { name: 'Radarr', data: arrData.radarr, emoji: '🎬' },
            { name: 'Sonarr', data: arrData.sonarr, emoji: '📺' },
            { name: 'Lidarr', data: arrData.lidarr, emoji: '🎵' },
            { name: 'Readarr', data: arrData.readarr, emoji: '📚' },
            { name: 'Prowlarr', data: arrData.prowlarr, emoji: '🔍' }
        ];

        services.forEach(service => {
            const statusEmoji = this.getARRStatusEmoji(service.data.status);
            let statusText = `${statusEmoji} **${service.name}**`;
            
            if (service.data.status === 'online') {
                statusText += `\nVersion: ${service.data.version}`;
                if (service.data.queued !== undefined) {
                    statusText += `\nQueued: ${service.data.queued}`;
                }
                if (service.data.upcoming !== undefined) {
                    statusText += `\nUpcoming: ${service.data.upcoming}`;
                }
                if (service.data.failed !== undefined) {
                    statusText += `\nFailed: ${service.data.failed}`;
                }
                if (service.data.activeIndexers !== undefined) {
                    statusText += `\nIndexers: ${service.data.activeIndexers}/${service.data.totalIndexers}`;
                }
            } else if (service.data.status === 'error') {
                statusText += `\nError: ${service.data.message}`;
            } else {
                statusText += `\n${service.data.message}`;
            }

            embed.addFields({
                name: `${service.emoji} ${service.name}`,
                value: statusText,
                inline: true
            });
        });

        return { embeds: [embed] };
    }

    createMediaActivityEmbed(mediaData) {
        const embed = new EmbedBuilder()
            .setTitle('🎬 Media Activity')
            .setColor(0x00ff00)
            .setTimestamp();

        // Jellyfin Activity
        if (mediaData.jellyfin.status === 'online') {
            const jellyfinText = `**Active Streams:** ${mediaData.jellyfin.activeStreams}\n**Version:** ${mediaData.jellyfin.version}`;
            embed.addFields({
                name: '🎬 Jellyfin',
                value: jellyfinText,
                inline: true
            });

            if (mediaData.jellyfin.sessions.length > 0) {
                const sessionsText = mediaData.jellyfin.sessions.map(session => {
                    const title = session.series ? `${session.series} - ${session.episode}` : session.title;
                    return `**${session.user}** watching *${title}* (${session.progress}%)`;
                }).join('\n');

                embed.addFields({
                    name: '👥 Jellyfin Streams',
                    value: sessionsText,
                    inline: false
                });
            }
        } else {
            embed.addFields({
                name: '🎬 Jellyfin',
                value: `${this.getARRStatusEmoji(mediaData.jellyfin.status)} ${mediaData.jellyfin.message}`,
                inline: true
            });
        }

        // Plex Activity
        if (mediaData.plex.status === 'online') {
            const plexText = `**Active Streams:** ${mediaData.plex.activeStreams}\n**Version:** ${mediaData.plex.version}`;
            embed.addFields({
                name: '🎭 Plex',
                value: plexText,
                inline: true
            });

            if (mediaData.plex.sessions.length > 0) {
                const sessionsText = mediaData.plex.sessions.map(session => {
                    const title = session.series ? `${session.series} - ${session.episode}` : session.title;
                    return `**${session.user}** watching *${title}* (${session.progress}%)`;
                }).join('\n');

                embed.addFields({
                    name: '👥 Plex Streams',
                    value: sessionsText,
                    inline: false
                });
            }
        } else {
            embed.addFields({
                name: '🎭 Plex',
                value: `${this.getARRStatusEmoji(mediaData.plex.status)} ${mediaData.plex.message}`,
                inline: true
            });
        }

        // qBittorrent Activity
        if (mediaData.qbittorrent.status === 'online') {
            const qbitText = `**Total:** ${mediaData.qbittorrent.total} torrents\n**Downloading:** ${mediaData.qbittorrent.downloading}\n**Seeding:** ${mediaData.qbittorrent.seeding}`;
            embed.addFields({
                name: '⬇️ qBittorrent',
                value: qbitText,
                inline: true
            });

            if (mediaData.qbittorrent.activeTorrents.length > 0) {
                const torrentsText = mediaData.qbittorrent.activeTorrents.map(torrent => {
                    return `**${torrent.name.substring(0, 50)}...**\n${torrent.progress}% • ${torrent.speed}/s • ETA: ${torrent.eta}`;
                }).join('\n\n');

                embed.addFields({
                    name: '⬇️ Active Torrents',
                    value: torrentsText,
                    inline: false
                });
            }
        } else {
            embed.addFields({
                name: '⬇️ qBittorrent',
                value: `${this.getARRStatusEmoji(mediaData.qbittorrent.status)} ${mediaData.qbittorrent.message}`,
                inline: true
            });
        }

        // NZBGet Activity
        if (mediaData.nzbget.status === 'online') {
            const nzbText = `**Total:** ${mediaData.nzbget.total} nzbs\n**Downloading:** ${mediaData.nzbget.downloading}\n**Completed:** ${mediaData.nzbget.completed}`;
            embed.addFields({
                name: '📰 NZBGet',
                value: nzbText,
                inline: true
            });

            if (mediaData.nzbget.activeDownloads.length > 0) {
                const downloadsText = mediaData.nzbget.activeDownloads.map(download => {
                    return `**${download.name.substring(0, 50)}...**\n${download.progress}% • ${download.speed}/s • ETA: ${download.eta}`;
                }).join('\n\n');

                embed.addFields({
                    name: '📰 Active NZB Downloads',
                    value: downloadsText,
                    inline: false
                });
            }
        } else {
            embed.addFields({
                name: '📰 NZBGet',
                value: `${this.getARRStatusEmoji(mediaData.nzbget.status)} ${mediaData.nzbget.message}`,
                inline: true
            });
        }

        return { embeds: [embed] };
    }

    createQuickLinksEmbed() {
        // Quick links are now included in the main dashboard
        return {
            embeds: [],
            components: []
        };
    }

    createQuickLinksRow() {
        const row = new ActionRowBuilder();

        // First row of buttons - Core Media Services
        const buttons = [
            { label: 'Jellyfin', url: this.services?.jellyfin?.url },
            { label: 'Plex', url: this.services?.plex?.url },
            { label: 'Overseerr', url: this.services?.overseerr?.url },
            { label: 'Radarr', url: this.services?.radarr?.url },
            { label: 'Sonarr', url: this.services?.sonarr?.url }
        ];

        const validButtons = buttons.filter(button => button.url && button.url.trim() !== '');
        
        if (validButtons.length === 0) {
            return null; // Don't create empty rows
        }

        validButtons.forEach(button => {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel(button.label)
                    .setStyle(ButtonStyle.Link)
                    .setURL(button.url)
            );
        });

        return row;
    }

    createSecondQuickLinksRow() {
        const row = new ActionRowBuilder();

        // Second row - ARR Stack and Download Clients
        const buttons = [
            { label: 'Lidarr', url: this.services?.lidarr?.url },
            { label: 'Readarr', url: this.services?.readarr?.url },
            { label: 'Prowlarr', url: this.services?.prowlarr?.url },
            { label: 'qBittorrent', url: this.services?.qbittorrent?.url },
            { label: 'NZBGet', url: this.services?.nzbget?.url }
        ];

        const validButtons = buttons.filter(button => button.url && button.url.trim() !== '');
        
        if (validButtons.length === 0) {
            return null; // Don't create empty rows
        }

        validButtons.forEach(button => {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel(button.label)
                    .setStyle(ButtonStyle.Link)
                    .setURL(button.url)
            );
        });

        return row;
    }

    createThirdQuickLinksRow() {
        const row = new ActionRowBuilder();

        // Third row - File Management and Cloud Services
        const buttons = [
            { label: 'FileFlows', url: this.services?.fileflows?.url },
            { label: 'Nextcloud', url: this.services?.nextcloud?.url },
            { label: 'Navidrome', url: this.services?.navidrome?.url },
            { label: 'Immich', url: this.services?.immich?.url },
            { label: 'Portainer', url: this.services?.portainer?.url }
        ];

        const validButtons = buttons.filter(button => button.url && button.url.trim() !== '');
        
        if (validButtons.length === 0) {
            return null; // Don't create empty rows
        }

        validButtons.forEach(button => {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel(button.label)
                    .setStyle(ButtonStyle.Link)
                    .setURL(button.url)
            );
        });

        return row;
    }

    createFourthQuickLinksRow() {
        const row = new ActionRowBuilder();

        // Fourth row - Additional Services
        const buttons = [
            { label: 'Wizarr', url: this.services?.wizarr?.url },
            { label: 'Solver', url: this.services?.solver?.url },
            { label: 'Statpp', url: this.services?.statpp?.url },
            { label: 'Budget', url: this.services?.budget?.url },
            { label: 'Craft', url: this.services?.craft?.url }
        ];

        const validButtons = buttons.filter(button => button.url && button.url.trim() !== '');
        
        if (validButtons.length === 0) {
            return null; // Don't create empty rows
        }

        validButtons.forEach(button => {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel(button.label)
                    .setStyle(ButtonStyle.Link)
                    .setURL(button.url)
            );
        });

        return row;
    }

    createFifthQuickLinksRow() {
        const row = new ActionRowBuilder();

        // Fifth row - Additional Services
        const buttons = [
            { label: 'Chan', url: this.services?.chan?.url },
            { label: 'Baz', url: this.services?.baz?.url },
            { label: 'Front', url: this.services?.front?.url },
            { label: 'Jellystat', url: this.services?.jellystat?.url },
            { label: 'Pass', url: this.services?.pass?.url }
        ];

        const validButtons = buttons.filter(button => button.url && button.url.trim() !== '');
        
        if (validButtons.length === 0) {
            return null; // Don't create empty rows
        }

        validButtons.forEach(button => {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel(button.label)
                    .setStyle(ButtonStyle.Link)
                    .setURL(button.url)
            );
        });

        return row;
    }


    formatServerStats(serverData, proxmoxData) {
        // Use Proxmox PVE node stats as Server Stats
        if (proxmoxData && !proxmoxData.error && proxmoxData.status !== 'offline' && proxmoxData.nodes) {
            const pveNode = proxmoxData.nodes.find(node => node.name === 'pve');
            if (pveNode && pveNode.status === 'online') {
                const cpuBar = pveNode.cpu.usage !== 'N/A' ? this.generateProgressBar(parseFloat(pveNode.cpu.usage), 10) : 'N/A';
                const memBar = pveNode.memory.usage !== 'N/A' ? this.generateProgressBar(parseFloat(pveNode.memory.usage), 10) : 'N/A';
                const diskBar = pveNode.disk.usage !== 'N/A' ? this.generateProgressBar(parseFloat(pveNode.disk.usage), 10) : 'N/A';
                
                let stats = `**CPU:** ${cpuBar} ${pveNode.cpu.usage}% (${pveNode.cpu.cores} cores)\n`;
                stats += `**RAM:** ${memBar} ${pveNode.memory.usage}% (${pveNode.memory.used}/${pveNode.memory.total})\n`;
                stats += `**Disk:** ${diskBar} ${pveNode.disk.usage}% (${pveNode.disk.used}/${pveNode.disk.total})\n`;
                stats += `**Uptime:** ${pveNode.uptime}`;
                
                // Add storage information if available
                if (pveNode.storage) {
                    stats += `\n${pveNode.storage}`;
                }
                
                return stats;
            }
        }
        
        // Fallback to original server stats if PVE not available
        if (!serverData || serverData.error || serverData.status === 'offline') {
            return `❌ **Server monitoring unavailable**\n*Running locally - no server data*`;
        }
        
        const cpuBar = this.generateProgressBar(serverData.cpu?.usage || 0, 10);
        const memBar = this.generateProgressBar(serverData.memory?.usage || 0, 10);
        const diskBar = this.generateProgressBar(serverData.disk?.usage || 0, 10);

        return `**CPU:** ${cpuBar} ${serverData.cpu?.usage || 0}%\n**RAM:** ${memBar} ${serverData.memory?.usage || 0}%\n**Disk:** ${diskBar} ${serverData.disk?.usage || 0}%`;
    }

    formatDockerStats(dockerData) {
        if (!dockerData || dockerData.error || dockerData.status === 'offline') {
            return `❌ **Docker monitoring unavailable**\n*Running locally - no Docker data*`;
        }
        
        const runningEmoji = '✅';
        const stoppedEmoji = '❌';
        return `${runningEmoji} ${dockerData.running || 0}/${dockerData.total || 0} running\n${stoppedEmoji} ${dockerData.stopped || 0} stopped`;
    }

    formatMediaStats(mediaData) {
        if (!mediaData || mediaData.error || mediaData.status === 'offline') {
            return `❌ **Media monitoring unavailable**\n*Running locally - no media data*`;
        }
        
        let totalWatching = 0;
        
        if (mediaData.jellyfin?.status === 'online') {
            totalWatching += mediaData.jellyfin.activeStreams || 0;
        }
        
        if (mediaData.plex?.status === 'online') {
            totalWatching += mediaData.plex.activeStreams || 0;
        }

        const totalText = totalWatching === 1 ? 'person' : 'people';
        return `👥 **${totalWatching}** ${totalText} watching`;
    }

    formatARRStats(arrData) {
        const services = [
            { name: 'Radarr', data: arrData.radarr, emoji: '🎬' },
            { name: 'Sonarr', data: arrData.sonarr, emoji: '📺' },
            { name: 'Lidarr', data: arrData.lidarr, emoji: '🎵' },
            { name: 'Readarr', data: arrData.readarr, emoji: '📚' },
            { name: 'Prowlarr', data: arrData.prowlarr, emoji: '🔍' }
        ];

        return services.map(service => {
            const statusEmoji = this.getARRStatusEmoji(service.data.status);
            let text = `${statusEmoji} **${service.name}**`;
            
            if (service.data.status === 'online') {
                if (service.data.queued !== undefined) text += ` (${service.data.queued} queued)`;
                if (service.data.failed !== undefined && service.data.failed > 0) text += ` ⚠️${service.data.failed}`;
            }
            
            return text;
        }).join(' • ');
    }

    formatDownloadStats(downloadData) {
        if (!downloadData || downloadData.error || downloadData.status === 'offline') {
            return `❌ **Download monitoring unavailable**\n*Running locally - no download data*`;
        }

        let stats = '';
        
        // qBittorrent Status
        if (downloadData.qbittorrent?.status === 'online') {
            const qbit = downloadData.qbittorrent;
            stats += `⬇️ **qBittorrent:** ${qbit.downloading} downloading, ${qbit.seeding} seeding\n`;
            if (qbit.downloading > 0) {
                stats += `   Speed: ${qbit.speed}/s • ETA: ${qbit.eta}\n`;
                if (qbit.torrents && qbit.torrents.length > 0) {
                    stats += `   **Active:** ${qbit.torrents.slice(0, 2).map(t => `${t.name} (${t.progress}%)`).join(', ')}\n`;
                }
            }
        } else {
            stats += `❌ **qBittorrent:** ${downloadData.qbittorrent?.message || 'Offline'}\n`;
        }

        // NZBGet Status
        if (downloadData.nzbget?.status === 'online') {
            const nzb = downloadData.nzbget;
            if (nzb.downloading) {
                stats += `📰 **NZBGet:** Downloading ${nzb.remaining} remaining\n`;
                stats += `   Speed: ${nzb.speed}/s • ETA: ${nzb.eta}\n`;
            } else {
                stats += `📰 **NZBGet:** No active downloads\n`;
            }
        } else {
            stats += `❌ **NZBGet:** ${downloadData.nzbget?.message || 'Offline'}\n`;
        }

        return stats || 'No download activity';
    }

    formatProxmoxStats(proxmoxData) {
        if (!proxmoxData || proxmoxData.error || proxmoxData.status === 'offline') {
            return `❌ **Proxmox unavailable**\n*${proxmoxData?.message || 'Not configured'}*`;
        }

        let stats = '';
        
        // Cluster Summary
        const summary = proxmoxData.summary;
        stats += `🖥️ **Cluster:** ${summary.onlineNodes}/${summary.totalNodes} nodes online\n`;
        stats += `🖥️ **VMs:** ${summary.runningVMs}/${summary.totalVMs} running\n`;
        stats += `📦 **Containers:** ${summary.runningContainers}/${summary.totalContainers} running\n\n`;

        // Top VMs
        const runningVMs = proxmoxData.vms.filter(vm => vm.status === 'running').slice(0, 3);
        if (runningVMs.length > 0) {
            stats += `**Running VMs:**\n`;
            runningVMs.forEach(vm => {
                stats += `  • ${vm.name} (${vm.id}) - ${vm.cpu} CPU, ${vm.memory} RAM\n`;
            });
        }

        return stats || 'No Proxmox data available';
    }

    generateProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    getARRStatusEmoji(status) {
        switch (status) {
            case 'online': return '✅';
            case 'disabled': return '⚪';
            case 'error': return '❌';
            default: return '❓';
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

}

module.exports = DashboardEmbed;
