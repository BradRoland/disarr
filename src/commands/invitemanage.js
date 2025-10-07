const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invitemanage')
        .setDescription('Manage pending invite requests (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all pending invite requests')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Clean up expired invite requests')
        ),

    async execute(interaction, bot) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '❌ You need Administrator permissions to use this command.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'list') {
                await this.handleListPending(interaction, bot);
            } else if (subcommand === 'cleanup') {
                await this.handleCleanup(interaction, bot);
            }

        } catch (error) {
            console.error('Error in invitemanage command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the command. Please try again later.',
                ephemeral: true
            });
        }
    },

    async handleListPending(interaction, bot) {
        const pendingInvites = await bot.modules.inviteManager.getPendingInvites();

        if (pendingInvites.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📋 Pending Invite Requests')
                .setDescription('No pending invite requests found.')
                .setColor(0x0099ff)
                .setFooter({ text: 'HomeLab Discord Bot • Invite Management' })
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Pending Invite Requests')
            .setDescription(`Found **${pendingInvites.length}** pending invite request(s)`)
            .setColor(0xffa500)
            .setFooter({ text: 'HomeLab Discord Bot • Invite Management' })
            .setTimestamp();

        pendingInvites.forEach((invite, index) => {
            const timeAgo = Math.floor((Date.now() - invite.timestamp) / 1000);
            embed.addFields({
                name: `${index + 1}. ${invite.requester.name}`,
                value: `**Service:** ${invite.service}\n**Discord:** <@${invite.requester.id}>\n**Requested:** <t:${Math.floor(invite.timestamp / 1000)}:R>`,
                inline: true
            });
        });

        await interaction.editReply({ embeds: [embed] });
    },

    async handleCleanup(interaction, bot) {
        const beforeCount = (await bot.modules.inviteManager.getPendingInvites()).length;
        
        await bot.modules.inviteManager.cleanupExpiredInvites();
        
        const afterCount = (await bot.modules.inviteManager.getPendingInvites()).length;
        const cleanedCount = beforeCount - afterCount;

        const embed = new EmbedBuilder()
            .setTitle('🧹 Invite Cleanup Complete')
            .setDescription(`Cleaned up **${cleanedCount}** expired invite request(s)`)
            .setColor(0x00ff00)
            .addFields(
                {
                    name: '📊 Results',
                    value: `**Before:** ${beforeCount} pending\n**After:** ${afterCount} pending\n**Cleaned:** ${cleanedCount} expired`,
                    inline: false
                }
            )
            .setFooter({ text: 'HomeLab Discord Bot • Cleanup Complete' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};


