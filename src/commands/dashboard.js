const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Manage dashboard auto-posting settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the channel for auto-posting dashboard')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to post dashboard updates')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove auto-posting dashboard')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current dashboard settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test dashboard posting to current channel')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('links')
                .setDescription('Configure which service links to show on dashboard')
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
                case 'links':
                    await handleLinksConfig(interaction, bot);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }

        } catch (error) {
            console.error('Error in dashboard command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the dashboard command.',
                ephemeral: true
            });
        }
    },
};

async function handleSetChannel(interaction, bot) {
    const channel = interaction.options.getChannel('channel');
    
    // Update the dashboard channel ID in the bot's configuration
    if (bot.modules.mediaDashboard) {
        bot.modules.mediaDashboard.setDashboardChannel(channel.id);
    }
    
    // Also update the environment variable for persistence
    process.env.DASHBOARD_CHANNEL_ID = channel.id;
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Dashboard Channel Set')
        .setDescription(`Dashboard will now be auto-posted to ${channel}`)
        .addFields(
            { name: 'Channel', value: `${channel} (${channel.id})`, inline: true },
            { name: 'Set By', value: interaction.user.username, inline: true },
            { name: 'Set At', value: new Date().toLocaleString(), inline: true }
        )
        .setColor(0x00ff00)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    // Log the change
    console.log(`Dashboard channel updated to: ${channel.name} (${channel.id}) by ${interaction.user.username}`);
    
    // Immediately post the dashboard to the new channel
    try {
        console.log('Posting dashboard immediately to new channel...');
        await bot.autoPostDashboard(true); // true = immediate posting
    } catch (error) {
        console.error('Error posting dashboard immediately:', error);
    }
}

async function handleRemoveChannel(interaction, bot) {
    // Remove the dashboard channel ID
    if (bot.modules.mediaDashboard) {
        bot.modules.mediaDashboard.setDashboardChannel(null);
    }
    
    // Clear the environment variable
    process.env.DASHBOARD_CHANNEL_ID = '';
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Dashboard Auto-Posting Disabled')
        .setDescription('Dashboard will no longer be auto-posted.')
        .addFields(
            { name: 'Removed By', value: interaction.user.username, inline: true },
            { name: 'Removed At', value: new Date().toLocaleString(), inline: true }
        )
        .setColor(0xffa500)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    // Log the change
    console.log(`Dashboard auto-posting disabled by ${interaction.user.username}`);
}

async function handleStatus(interaction, bot) {
    const dashboardChannelId = process.env.DASHBOARD_CHANNEL_ID;
    let status = '❌ Not Set';
    let channelInfo = 'No channel configured';
    
    if (dashboardChannelId) {
        const channel = interaction.client.channels.cache.get(dashboardChannelId);
        if (channel) {
            status = '✅ Active';
            channelInfo = `${channel} (${channel.id})`;
        } else {
            status = '⚠️ Channel Not Found';
            channelInfo = `Channel ID: ${dashboardChannelId} (channel may have been deleted)`;
        }
    }
    
    const enabledServices = bot.modules.mediaDashboard ? bot.modules.mediaDashboard.getEnabledServices() : 'all';
    const servicesInfo = enabledServices === 'all' 
        ? 'All Services' 
        : Array.isArray(enabledServices) && enabledServices.length > 0
            ? `${enabledServices.length} Service${enabledServices.length === 1 ? '' : 's'}`
            : 'No Services';
    
    const embed = new EmbedBuilder()
        .setTitle('📊 Dashboard Status')
        .setDescription('Current dashboard auto-posting configuration')
        .addFields(
            { name: 'Status', value: status, inline: true },
            { name: 'Channel', value: channelInfo, inline: false },
            { name: 'Enabled Services', value: servicesInfo, inline: true },
            { name: 'Refresh Interval', value: `${process.env.REFRESH_INTERVAL || 30000}ms`, inline: true }
        )
        .setColor(dashboardChannelId ? 0x00ff00 : 0xffa500)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleTest(interaction, bot) {
    const embed = new EmbedBuilder()
        .setTitle('🧪 Dashboard Test')
        .setDescription('This is a test of the dashboard posting system.')
        .addFields(
            { name: 'Test Channel', value: `${interaction.channel}`, inline: true },
            { name: 'Tested By', value: interaction.user.username, inline: true },
            { name: 'Test Time', value: new Date().toLocaleString(), inline: true }
        )
        .setColor(0x0099ff)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    // Also test the actual dashboard if the module exists
    if (bot.modules.mediaDashboard) {
        try {
            await bot.modules.mediaDashboard.updateDashboard(interaction.channel);
            console.log(`Dashboard test successful in ${interaction.channel.name}`);
        } catch (error) {
            console.error('Dashboard test failed:', error);
        }
    }
}

async function handleLinksConfig(interaction, bot) {
    if (!bot.modules.mediaDashboard) {
        return await interaction.editReply({
            content: '❌ Dashboard module not available.',
            ephemeral: true
        });
    }

    const enabledServices = bot.modules.mediaDashboard.getEnabledServices();
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
        const isEnabled = enabledServices === 'all' || (Array.isArray(enabledServices) && enabledServices.includes(service.value));
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
        const isEnabled = enabledServices === 'all' || (Array.isArray(enabledServices) && enabledServices.includes(service.value));
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
        const isEnabled = enabledServices === 'all' || (Array.isArray(enabledServices) && enabledServices.includes(service.value));
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
        const isEnabled = enabledServices === 'all' || (Array.isArray(enabledServices) && enabledServices.includes(service.value));
        serviceRow4.addComponents(
            new ButtonBuilder()
                .setCustomId(`dashboard_service_${service.value}`)
                .setLabel(`${isEnabled ? '✅' : '❌'} ${service.name}`)
                .setStyle(isEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
    });

    const components = [actionRow, serviceRow1, serviceRow2, serviceRow3, serviceRow4].filter(row => row.components.length > 0);

    await interaction.editReply({ 
        embeds: [embed], 
        components: components,
        ephemeral: true
    });
}