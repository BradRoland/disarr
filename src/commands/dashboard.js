const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Display the HomeLab dashboard with real-time stats and quick links')
        .addStringOption(option =>
            option.setName('visibility')
                .setDescription('Who can see this dashboard')
                .setRequired(false)
                .addChoices(
                    { name: 'Public', value: 'public' },
                    { name: 'Private (Ephemeral)', value: 'private' }
                )
        ),

    async execute(interaction, bot) {
        const isPrivate = interaction.options.getString('visibility') === 'private';
        await interaction.deferReply({ ephemeral: isPrivate });

        try {
            const dashboardData = await bot.getDashboardData();
            const mainDashboardData = bot.modules.dashboardEmbed.createMainDashboard(dashboardData);
            const quickLinksData = bot.modules.dashboardEmbed.createQuickLinksEmbed(dashboardData);

            const reply = await interaction.editReply({ 
                embeds: [...mainDashboardData.embeds, ...quickLinksData.embeds],
                components: [...mainDashboardData.components, ...quickLinksData.components]
            });

            // Store the message ID for auto-updates (only for public messages)
            if (!isPrivate) {
                bot.lastDashboardMessageId = reply.id;
            }
        } catch (error) {
            console.error('Error creating dashboard:', error);
            await interaction.editReply({
                content: '❌ Error loading dashboard data. Please try again later.',
                ephemeral: true
            });
        }
    },
};


