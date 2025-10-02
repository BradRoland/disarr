const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('live')
        .setDescription('Start live dashboard updates in the current channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, bot) {
        await interaction.deferReply();

        try {
            // Check if live updates are already running
            if (bot.liveUpdateInterval) {
                await interaction.editReply({
                    content: '❌ Live updates are already running! Use `/stop` to stop them.',
                    ephemeral: true
                });
                return;
            }

            // Send initial dashboard
            const dashboardData = await bot.getDashboardData();
            const dashboard = bot.modules.dashboardEmbed.createMainDashboard(dashboardData);
            
            const message = await interaction.editReply(dashboard);

            // Start live updates every 30 seconds
            bot.liveUpdateInterval = setInterval(async () => {
                try {
                    const newDashboardData = await bot.getDashboardData();
                    const newDashboard = bot.modules.dashboardEmbed.createMainDashboard(newDashboardData);
                    
                    await message.edit(newDashboard);
                } catch (error) {
                    console.error('Error updating live dashboard:', error);
                }
            }, 30000);

            // Store the message and channel for cleanup
            bot.liveUpdateMessage = message;
            bot.liveUpdateChannel = interaction.channel;

            await interaction.followUp({
                content: '✅ Live dashboard updates started! Updates every 30 seconds. Use `/stop` to stop.',
                ephemeral: true
            });

        } catch (error) {
            console.error('Error starting live updates:', error);
            await interaction.editReply({
                content: '❌ Error starting live updates. Please try again later.',
                ephemeral: true
            });
        }
    },
};
