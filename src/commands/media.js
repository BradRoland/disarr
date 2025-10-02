const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('media')
        .setDescription('Display current media activity and downloads')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of media activity to display')
                .setRequired(false)
                .addChoices(
                    { name: 'All Activity', value: 'all' },
                    { name: 'Jellyfin Streams', value: 'jellyfin' },
                    { name: 'Plex Streams', value: 'plex' },
                    { name: 'qBittorrent Downloads', value: 'qbittorrent' },
                    { name: 'NZBGet Downloads', value: 'nzbget' }
                )
        ),

    async execute(interaction, bot) {
        await interaction.deferReply();

        try {
            const mediaStats = await bot.modules.mediaDashboard.getCurrentActivity();
            const dashboard = bot.modules.dashboardEmbed.createMediaActivityEmbed(mediaStats);

            await interaction.editReply(dashboard);
        } catch (error) {
            console.error('Error getting media activity:', error);
            await interaction.editReply({
                content: '❌ Error loading media activity. Please try again later.',
                ephemeral: true
            });
        }
    },
};
