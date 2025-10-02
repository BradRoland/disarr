const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('arr')
        .setDescription('Display ARR stack status and activity')
        .addStringOption(option =>
            option.setName('service')
                .setDescription('Specific ARR service to check')
                .setRequired(false)
                .addChoices(
                    { name: 'All Services', value: 'all' },
                    { name: 'Radarr', value: 'radarr' },
                    { name: 'Sonarr', value: 'sonarr' },
                    { name: 'Lidarr', value: 'lidarr' },
                    { name: 'Readarr', value: 'readarr' },
                    { name: 'Prowlarr', value: 'prowlarr' }
                )
        ),

    async execute(interaction, bot) {
        await interaction.deferReply();

        try {
            const arrStats = await bot.modules.arrIntegration.getARRStatus();
            const dashboard = bot.modules.dashboardEmbed.createARRStatusEmbed(arrStats);

            await interaction.editReply(dashboard);
        } catch (error) {
            console.error('Error getting ARR status:', error);
            await interaction.editReply({
                content: '❌ Error loading ARR stack status. Please try again later.',
                ephemeral: true
            });
        }
    },
};


