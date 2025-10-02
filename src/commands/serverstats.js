const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Display detailed server statistics')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of server stats to display')
                .setRequired(false)
                .addChoices(
                    { name: 'All Stats', value: 'all' },
                    { name: 'CPU Only', value: 'cpu' },
                    { name: 'Memory Only', value: 'memory' },
                    { name: 'Disk Only', value: 'disk' },
                    { name: 'Network Only', value: 'network' }
                )
        ),

    async execute(interaction, bot) {
        await interaction.deferReply();

        try {
            const serverStats = await bot.modules.serverMonitor.getStats();
            const dashboard = bot.modules.dashboardEmbed.createServerStatsEmbed(serverStats);

            await interaction.editReply(dashboard);
        } catch (error) {
            console.error('Error getting server stats:', error);
            await interaction.editReply({
                content: '❌ Error loading server statistics. Please try again later.',
                ephemeral: true
            });
        }
    },
};


