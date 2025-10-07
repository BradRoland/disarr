const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const WizarrIntegration = require('./WizarrIntegration');
const fs = require('fs').promises;
const path = require('path');

class InviteManager {
    constructor(client, config, bot) {
        this.client = client;
        this.config = config;
        this.bot = bot;
        this.wizarr = new WizarrIntegration(config);
        this.pendingInvites = new Map(); // Store pending invite requests
        this.configPath = path.join(process.cwd(), 'config', 'pending-invites.json');
        // Load pending invites from file (async, will be called when needed)
        this.loadPendingInvites().catch(error => {
            console.error('Error loading pending invites on startup:', error);
        });
    }

    async sendApprovalRequest(inviteData) {
        try {
            // Get admin channel from AdminManager if available, otherwise fall back to config
            let adminChannelId;
            if (this.bot && this.bot.modules && this.bot.modules.adminManager) {
                adminChannelId = this.bot.modules.adminManager.getAdminChannel();
            } else {
                adminChannelId = this.config.alertChannelId || process.env.ALERT_CHANNEL_ID;
            }
            
            if (!adminChannelId) {
                throw new Error('Admin channel not configured');
            }

            const adminChannel = this.client.channels.cache.get(adminChannelId);
            if (!adminChannel) {
                throw new Error('Admin channel not found');
            }

            // Create approval embed
            const embed = new EmbedBuilder()
                .setTitle('🔔 New Invite Request')
                .setDescription(`**${inviteData.requester.name}** is requesting an invite for **${inviteData.service}**`)
                .setColor(0xffa500)
                .addFields(
                    {
                        name: '👤 Requester',
                        value: `**Name:** ${inviteData.requester.name}\n**Discord:** <@${inviteData.requester.id}>`,
                        inline: true
                    },
                    {
                        name: '🎬 Service',
                        value: `**${inviteData.service}**`,
                        inline: true
                    },
                    {
                        name: '⏰ Requested',
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: true
                    }
                )
                .setFooter({ text: 'HomeLab Discord Bot • Invite Approval' })
                .setTimestamp();

            // Create approval buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`approve_invite_${inviteData.requester.id}`)
                        .setLabel('✅ Approve')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`deny_invite_${inviteData.requester.id}`)
                        .setLabel('❌ Deny')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            const message = await adminChannel.send({
                embeds: [embed],
                components: [row]
            });

            // Store pending invite data
            this.pendingInvites.set(inviteData.requester.id, {
                ...inviteData,
                adminMessageId: message.id,
                timestamp: Date.now()
            });

            // Save to persistent storage
            await this.savePendingInvites();

            // Set up button collector for admin responses
            this.setupAdminButtonCollector(message, inviteData.requester.id);

            // Auto-cleanup after 24 hours
            setTimeout(async () => {
                this.pendingInvites.delete(inviteData.requester.id);
                await this.savePendingInvites();
            }, 24 * 60 * 60 * 1000);

        } catch (error) {
            console.error('Error sending approval request:', error);
            
            // Notify the requester of the error
            try {
                await inviteData.originalInteraction.followUp({
                    content: '❌ Unable to process your invite request at this time. Please try again later or contact an admin.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending follow-up message:', followUpError);
            }
        }
    }

    setupAdminButtonCollector(message, requesterId) {
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 24 * 60 * 60 * 1000, // 24 hours
            max: 1
        });

        collector.on('collect', async (interaction) => {
            const inviteData = this.pendingInvites.get(requesterId);
            if (!inviteData) {
                return await interaction.reply({
                    content: '❌ This invite request has expired or been processed already.',
                    ephemeral: true
                });
            }

            const isApproved = interaction.customId.startsWith('approve_invite_');
            
            if (isApproved) {
                await this.handleApproval(interaction, inviteData);
            } else {
                await this.handleDenial(interaction, inviteData);
            }

            // Remove from pending invites
            this.pendingInvites.delete(requesterId);
            await this.savePendingInvites();
        });

        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                // Auto-cleanup expired requests
                this.pendingInvites.delete(requesterId);
                await this.savePendingInvites();
            }
        });
    }

    async handleApproval(interaction, inviteData) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Check if Wizarr is configured
            if (!this.wizarr.isConfigured()) {
                return await interaction.editReply({
                    content: '❌ Wizarr integration is not configured. Please contact the bot administrator.',
                    ephemeral: true
                });
            }

            // Create invite via Wizarr API
            const inviteResult = await this.wizarr.createInvite({
                name: inviteData.requester.name,
                service: inviteData.service
            });

            if (!inviteResult.success) {
                return await interaction.editReply({
                    content: `❌ Failed to create invite: ${inviteResult.error}`,
                    ephemeral: true
                });
            }

            // Update admin message
            const approvedEmbed = new EmbedBuilder()
                .setTitle('✅ Invite Approved & Created')
                .setDescription(`**${inviteData.requester.name}** has been approved for **${inviteData.service}**`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '🎫 Invite Details',
                        value: `**URL:** [Click here](${inviteResult.inviteUrl})`,
                        inline: false
                    },
                    {
                        name: '👤 Approved by',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: '⏰ Approved at',
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: true
                    }
                )
                .setFooter({ text: 'HomeLab Discord Bot • Invite Approved' })
                .setTimestamp();

            await interaction.message.edit({
                embeds: [approvedEmbed],
                components: []
            });

            await interaction.editReply({
                content: '✅ Invite approved and created successfully!',
                ephemeral: true
            });

            // Notify the requester
            await this.notifyRequester(inviteData, inviteResult, true);

        } catch (error) {
            console.error('Error handling approval:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the approval. Please try again.',
                ephemeral: true
            });
        }
    }

    async handleDenial(interaction, inviteData) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Update admin message
            const deniedEmbed = new EmbedBuilder()
                .setTitle('❌ Invite Denied')
                .setDescription(`**${inviteData.requester.name}** was denied access to **${inviteData.service}**`)
                .setColor(0xff0000)
                .addFields(
                    {
                        name: '👤 Denied by',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: '⏰ Denied at',
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: true
                    }
                )
                .setFooter({ text: 'HomeLab Discord Bot • Invite Denied' })
                .setTimestamp();

            await interaction.message.edit({
                embeds: [deniedEmbed],
                components: []
            });

            await interaction.editReply({
                content: '❌ Invite denied.',
                ephemeral: true
            });

            // Notify the requester
            await this.notifyRequester(inviteData, null, false);

        } catch (error) {
            console.error('Error handling denial:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the denial. Please try again.',
                ephemeral: true
            });
        }
    }

    async notifyRequester(inviteData, inviteResult, approved) {
        try {
            // Get the user from the Discord client
            const user = await this.client.users.fetch(inviteData.requester.id);
            
            if (approved && inviteResult) {
                const successEmbed = new EmbedBuilder()
                    .setTitle('🎉 Invite Approved!')
                    .setDescription(`Your request for **${inviteData.service}** access has been approved!`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '🎫 Your Invite',
                            value: `**URL:** [Click here to accept](${inviteResult.inviteUrl})`,
                            inline: false
                        },
                        {
                            name: '📧 Instructions',
                            value: '1. Click the link above\n2. Enter your details\n3. Start enjoying your media!',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'HomeLab Discord Bot • Welcome!' })
                    .setTimestamp();

                try {
                    await user.send({ embeds: [successEmbed] });
                    console.log(`Successfully sent approval DM to ${inviteData.requester.name}`);
                } catch (dmError) {
                    console.error(`Failed to send DM to ${inviteData.requester.name}:`, dmError);
                    // Could fall back to sending in a channel or logging the invite URL for admin to share
                }
            } else {
                const deniedEmbed = new EmbedBuilder()
                    .setTitle('❌ Invite Request Denied')
                    .setDescription(`Your request for **${inviteData.service}** access has been denied.`)
                    .setColor(0xff0000)
                    .addFields(
                        {
                            name: '💬 Need Help?',
                            value: 'If you believe this was an error, please contact an administrator.',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'HomeLab Discord Bot • Request Denied' })
                    .setTimestamp();

                try {
                    await user.send({ embeds: [deniedEmbed] });
                    console.log(`Successfully sent denial DM to ${inviteData.requester.name}`);
                } catch (dmError) {
                    console.error(`Failed to send DM to ${inviteData.requester.name}:`, dmError);
                }
            }
        } catch (error) {
            console.error('Error notifying requester:', error);
        }
    }

    async getPendingInvites() {
        // Ensure pending invites are loaded
        await this.ensurePendingInvitesLoaded();
        return Array.from(this.pendingInvites.values());
    }

    async ensurePendingInvitesLoaded() {
        // If pendingInvites is empty and we haven't loaded yet, try to load
        if (this.pendingInvites.size === 0) {
            try {
                await this.loadPendingInvites();
            } catch (error) {
                console.error('Error ensuring pending invites are loaded:', error);
            }
        }
    }

    async cleanupExpiredInvites() {
        const now = Date.now();
        const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours

        for (const [requesterId, inviteData] of this.pendingInvites.entries()) {
            if (now - inviteData.timestamp > expiredThreshold) {
                this.pendingInvites.delete(requesterId);
            }
        }
        
        // Save after cleanup
        await this.savePendingInvites();
    }

    // =========================================================================
    // Persistent Storage Methods
    // =========================================================================

    async loadPendingInvites() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            const invites = JSON.parse(data);
            
            // Convert back to Map
            this.pendingInvites = new Map();
            for (const [key, value] of Object.entries(invites)) {
                this.pendingInvites.set(key, value);
            }
            
            console.log(`Loaded ${this.pendingInvites.size} pending invites from storage`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading pending invites:', error);
            }
            // File doesn't exist yet, start with empty Map
            this.pendingInvites = new Map();
        }
    }

    async savePendingInvites() {
        try {
            // Ensure config directory exists
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });
            
            // Convert Map to object for JSON serialization
            const invites = Object.fromEntries(this.pendingInvites);
            
            await fs.writeFile(this.configPath, JSON.stringify(invites, null, 2));
            console.log(`Saved ${this.pendingInvites.size} pending invites to storage`);
        } catch (error) {
            console.error('Error saving pending invites:', error);
        }
    }
}

module.exports = InviteManager;


