const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop live dashboard updates')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, bot) {
        await interaction.deferReply({ ephemeral: true });

        try {
            if (!bot.liveUpdateInterval) {
                await interaction.editReply({
                    content: '❌ No live updates are currently running.',
                });
                return;
            }

            // Stop the interval
            clearInterval(bot.liveUpdateInterval);
            bot.liveUpdateInterval = null;
            bot.liveUpdateMessage = null;
            bot.liveUpdateChannel = null;

            await interaction.editReply({
                content: '✅ Live dashboard updates stopped successfully.',
            });

        } catch (error) {
            console.error('Error stopping live updates:', error);
            await interaction.editReply({
                content: '❌ Error stopping live updates. Please try again later.',
            });
        }
    },
};
