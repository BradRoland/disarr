const fs = require('fs');
const path = require('path');

class AdminManager {
    constructor() {
        this.adminChannelId = null;
        
        // Load saved admin config on startup
        this.loadAdminConfig();
    }

    setAdminChannel(channelId) {
        this.adminChannelId = channelId;
        if (channelId) {
            process.env.ALERT_CHANNEL_ID = channelId;
            // Save to a persistent file for server reboots
            this.saveAdminConfig(channelId);
        } else {
            // Clear the environment variable when removing the channel
            process.env.ALERT_CHANNEL_ID = '';
            // Remove the persistent file
            this.saveAdminConfig(null);
        }
    }

    saveAdminConfig(channelId) {
        try {
            const configPath = path.join(process.cwd(), 'config', 'admin.json');
            
            const config = {
                adminChannelId: channelId,
                lastUpdated: new Date().toISOString()
            };
            
            if (channelId) {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log(`Admin channel saved to config: ${channelId}`);
            } else {
                // Remove the config file if channel is cleared
                if (fs.existsSync(configPath)) {
                    fs.unlinkSync(configPath);
                    console.log('Admin channel config removed');
                }
            }
        } catch (error) {
            console.error('Error saving admin config:', error);
        }
    }

    loadAdminConfig() {
        try {
            const configPath = path.join(process.cwd(), 'config', 'admin.json');
            
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.adminChannelId) {
                    this.adminChannelId = config.adminChannelId;
                    process.env.ALERT_CHANNEL_ID = config.adminChannelId;
                    console.log(`Admin channel loaded from config: ${config.adminChannelId}`);
                    return config.adminChannelId;
                }
            }
        } catch (error) {
            console.error('Error loading admin config:', error);
        }
        return null;
    }

    getAdminChannel() {
        return this.adminChannelId || process.env.ALERT_CHANNEL_ID;
    }

    async sendAdminNotification(client, title, description, fields = [], color = 0xffa500) {
        try {
            const adminChannelId = this.getAdminChannel();
            if (!adminChannelId) {
                console.log('No admin channel set, skipping notification');
                return false;
            }

            const channel = client.channels.cache.get(adminChannelId);
            if (!channel) {
                console.log('Admin channel not found, skipping notification');
                return false;
            }

            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();

            if (fields.length > 0) {
                embed.addFields(fields);
            }

            await channel.send({ embeds: [embed] });
            return true;
        } catch (error) {
            console.error('Error sending admin notification:', error);
            return false;
        }
    }

    async sendInviteRequest(client, requester, service, name, message) {
        const fields = [
            { name: 'Name', value: name, inline: true },
            { name: 'Service', value: service, inline: true },
            { name: 'Requested At', value: new Date().toLocaleString(), inline: true },
            { name: 'Message', value: message, inline: false }
        ];

        return await this.sendAdminNotification(
            client,
            '🔔 New Invite Request',
            `**${requester.username}** is requesting an invite for **${service}**`,
            fields,
            0xffa500
        );
    }

    async sendInviteApproved(client, requester, service, approvedBy) {
        const fields = [
            { name: 'User', value: requester.username, inline: true },
            { name: 'Service', value: service, inline: true },
            { name: 'Approved By', value: approvedBy.username, inline: true },
            { name: 'Approved At', value: new Date().toLocaleString(), inline: true }
        ];

        return await this.sendAdminNotification(
            client,
            '✅ Invite Approved',
            `**${requester.username}**'s request for **${service}** has been approved`,
            fields,
            0x00ff00
        );
    }

    async sendInviteDenied(client, requester, service, deniedBy) {
        const fields = [
            { name: 'User', value: requester.username, inline: true },
            { name: 'Service', value: service, inline: true },
            { name: 'Denied By', value: deniedBy.username, inline: true },
            { name: 'Denied At', value: new Date().toLocaleString(), inline: true }
        ];

        return await this.sendAdminNotification(
            client,
            '❌ Invite Denied',
            `**${requester.username}**'s request for **${service}** has been denied`,
            fields,
            0xff0000
        );
    }

    async sendSystemAlert(client, title, description, severity = 'warning') {
        const colors = {
            info: 0x0099ff,
            warning: 0xffa500,
            error: 0xff0000,
            success: 0x00ff00
        };

        return await this.sendAdminNotification(
            client,
            title,
            description,
            [],
            colors[severity] || colors.warning
        );
    }
}

module.exports = AdminManager;

