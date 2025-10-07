const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('links')
        .setDescription('Display quick access links to all hosted services'),

    async execute(interaction, bot) {
        await interaction.deferReply();

        try {
            const dashboard = bot.modules.dashboardEmbed.createQuickLinksEmbed();
            await interaction.editReply(dashboard);
        } catch (error) {
            console.error('Error creating links:', error);
            await interaction.editReply({
                content: '❌ Error loading quick links. Please try again later.',
                ephemeral: true
            });
        }
    },
};


