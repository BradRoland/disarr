const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Manage admin channel settings for notifications')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the channel for admin notifications')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to post admin notifications')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove admin notifications channel')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current admin channel settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test admin notification posting to current channel')
        ),

    async execute(interaction, bot) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'set':
                    await handleSetChannel(interaction, bot);
                    break;
                case 'remove':
                    await handleRemoveChannel(interaction, bot);
                    break;
                case 'status':
                    await handleStatus(interaction, bot);
                    break;
                case 'test':
                    await handleTest(interaction, bot);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }

        } catch (error) {
            console.error('Error in admin command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the admin command.',
                ephemeral: true
            });
        }
    },
};

async function handleSetChannel(interaction, bot) {
    const channel = interaction.options.getChannel('channel');
    
    // Update the admin channel ID in the bot's configuration
    if (bot.modules.adminManager) {
        bot.modules.adminManager.setAdminChannel(channel.id);
    }
    
    // Also update the environment variable for persistence
    process.env.ALERT_CHANNEL_ID = channel.id;
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Admin Channel Set')
        .setDescription(`Admin notifications will now be posted to ${channel}`)
        .addFields(
            { name: 'Channel', value: `${channel} (${channel.id})`, inline: true },
            { name: 'Set By', value: interaction.user.username, inline: true },
            { name: 'Set At', value: new Date().toLocaleString(), inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    // Log the change
    console.log(`Admin channel updated to: ${channel.name} (${channel.id}) by ${interaction.user.username}`);
    
    // Send a test notification to the new admin channel
    try {
        const testEmbed = new EmbedBuilder()
            .setTitle('🔔 Admin Channel Configured')
            .setDescription(`Admin notifications are now being sent to this channel.`)
            .addFields(
                { name: 'Configured By', value: interaction.user.username, inline: true },
                { name: 'Configured At', value: new Date().toLocaleString(), inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        await channel.send({ embeds: [testEmbed] });
    } catch (error) {
        console.error('Error sending test notification to admin channel:', error);
    }
}

async function handleRemoveChannel(interaction, bot) {
    // Remove the admin channel ID
    if (bot.modules.adminManager) {
        bot.modules.adminManager.setAdminChannel(null);
    }
    
    // Clear the environment variable
    process.env.ALERT_CHANNEL_ID = '';
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Admin Notifications Disabled')
        .setDescription('Admin notifications will no longer be posted.')
        .addFields(
            { name: 'Removed By', value: interaction.user.username, inline: true },
            { name: 'Removed At', value: new Date().toLocaleString(), inline: true }
        )
        .setColor(0xffa500)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    // Log the change
    console.log(`Admin notifications disabled by ${interaction.user.username}`);
}

async function handleStatus(interaction, bot) {
    const adminChannelId = process.env.ALERT_CHANNEL_ID;
    let status = '❌ Not Set';
    let channelInfo = 'No channel configured';
    
    if (adminChannelId) {
        const channel = interaction.client.channels.cache.get(adminChannelId);
        if (channel) {
            status = '✅ Active';
            channelInfo = `${channel} (${channel.id})`;
        } else {
            status = '⚠️ Channel Not Found';
            channelInfo = `Channel ID: ${adminChannelId} (channel may have been deleted)`;
        }
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🔔 Admin Channel Status')
        .setDescription('Current admin notifications configuration')
        .addFields(
            { name: 'Status', value: status, inline: true },
            { name: 'Channel', value: channelInfo, inline: false },
            { name: 'Notifications', value: 'Invite requests, system alerts, admin actions', inline: false }
        )
        .setColor(adminChannelId ? 0x00ff00 : 0xffa500)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleTest(interaction, bot) {
    const embed = new EmbedBuilder()
        .setTitle('🧪 Admin Notification Test')
        .setDescription('This is a test of the admin notification system.')
        .addFields(
            { name: 'Test Channel', value: `${interaction.channel}`, inline: true },
            { name: 'Tested By', value: interaction.user.username, inline: true },
            { name: 'Test Time', value: new Date().toLocaleString(), inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    // Also send a test notification to the admin channel if it's set
    const adminChannelId = process.env.ALERT_CHANNEL_ID;
    if (adminChannelId && adminChannelId !== interaction.channel.id) {
        try {
            const adminChannel = interaction.client.channels.cache.get(adminChannelId);
            if (adminChannel) {
                const adminTestEmbed = new EmbedBuilder()
                    .setTitle('🧪 Admin Channel Test')
                    .setDescription('This is a test notification sent to the admin channel.')
                    .addFields(
                        { name: 'Tested By', value: interaction.user.username, inline: true },
                        { name: 'Test Time', value: new Date().toLocaleString(), inline: true }
                    )
                    .setColor(0x0099ff)
                    .setTimestamp();

                await adminChannel.send({ embeds: [adminTestEmbed] });
            }
        } catch (error) {
            console.error('Error sending test to admin channel:', error);
        }
    }
}

