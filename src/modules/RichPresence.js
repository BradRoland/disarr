const { ActivityType } = require('discord.js');

class RichPresence {
    constructor(client) {
        this.client = client;
        this.lastActivity = null;
    }

    generateActivity(serverStats, dockerStats, mediaStats) {
        const activities = [];

        // Server status
        if (serverStats.cpu.usage > 80) {
            activities.push(`CPU: ${serverStats.cpu.usage}%`);
        } else if (serverStats.memory.usage > 85) {
            activities.push(`RAM: ${serverStats.memory.usage}%`);
        } else if (serverStats.disk.usage > 90) {
            activities.push(`Disk: ${serverStats.disk.usage}%`);
        }

        // Docker status
        if (dockerStats.running > 0) {
            activities.push(`${dockerStats.running}/${dockerStats.total} containers`);
        }

        // Media activity
        if (mediaStats.jellyfin.status === 'online' && mediaStats.jellyfin.activeStreams > 0) {
            activities.push(`${mediaStats.jellyfin.activeStreams} Jellyfin streams`);
        }

        if (mediaStats.plex.status === 'online' && mediaStats.plex.activeStreams > 0) {
            activities.push(`${mediaStats.plex.activeStreams} Plex streams`);
        }

        if (mediaStats.qbittorrent.status === 'online' && mediaStats.qbittorrent.downloading > 0) {
            activities.push(`${mediaStats.qbittorrent.downloading} torrents`);
        }

        if (mediaStats.nzbget.status === 'online' && mediaStats.nzbget.downloading > 0) {
            activities.push(`${mediaStats.nzbget.downloading} nzbs`);
        }

        // Default activity if nothing specific
        if (activities.length === 0) {
            activities.push('Monitoring HomeLab');
        }

        const activityText = activities.join(' | ');

        // Only update if the activity has changed
        if (activityText !== this.lastActivity) {
            this.lastActivity = activityText;
            return {
                text: activityText,
                type: ActivityType.Watching
            };
        }

        return null; // No change needed
    }

    async updateActivity(activity) {
        if (activity) {
            try {
                await this.client.user.setActivity(activity.text, { type: activity.type });
                console.log(`🔄 Rich Presence updated: ${activity.text}`);
            } catch (error) {
                console.error('Error updating rich presence:', error);
            }
        }
    }

    async setCustomActivity(text, type = ActivityType.Watching) {
        try {
            await this.client.user.setActivity(text, { type });
            this.lastActivity = text;
            console.log(`🔄 Custom activity set: ${text}`);
        } catch (error) {
            console.error('Error setting custom activity:', error);
        }
    }

    async clearActivity() {
        try {
            await this.client.user.setActivity(null);
            this.lastActivity = null;
            console.log('🔄 Activity cleared');
        } catch (error) {
            console.error('Error clearing activity:', error);
        }
    }

    getStatusEmoji(status) {
        switch (status) {
            case 'online': return '🟢';
            case 'idle': return '🟡';
            case 'dnd': return '🔴';
            case 'offline': return '⚫';
            default: return '❓';
        }
    }

    formatUptime(uptime) {
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    generateServerStatus(serverStats) {
        const status = [];
        
        if (serverStats.cpu.usage > 90) {
            status.push('🔥 High CPU');
        } else if (serverStats.cpu.usage > 70) {
            status.push('⚠️ CPU');
        }

        if (serverStats.memory.usage > 95) {
            status.push('🔥 High RAM');
        } else if (serverStats.memory.usage > 80) {
            status.push('⚠️ RAM');
        }

        if (serverStats.disk.usage > 95) {
            status.push('🔥 High Disk');
        } else if (serverStats.disk.usage > 85) {
            status.push('⚠️ Disk');
        }

        return status.length > 0 ? status.join(' ') : '✅ All Good';
    }

    generateMediaStatus(mediaStats) {
        const status = [];

        if (mediaStats.jellyfin.status === 'online' && mediaStats.jellyfin.activeStreams > 0) {
            status.push(`🎬 ${mediaStats.jellyfin.activeStreams} streams`);
        }

        if (mediaStats.qbittorrent.status === 'online' && mediaStats.qbittorrent.downloading > 0) {
            status.push(`⬇️ ${mediaStats.qbittorrent.downloading} downloads`);
        }

        return status.length > 0 ? status.join(' | ') : '📺 No Activity';
    }

    generateDockerStatus(dockerStats) {
        const total = dockerStats.total;
        const running = dockerStats.running;
        const stopped = dockerStats.stopped;

        if (stopped > 0) {
            return `🐳 ${running}/${total} containers (${stopped} stopped)`;
        } else {
            return `🐳 ${running}/${total} containers`;
        }
    }
}

module.exports = RichPresence;
