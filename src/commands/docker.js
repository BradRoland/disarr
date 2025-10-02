const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('docker')
        .setDescription('Display Docker container status and management')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Docker action to perform')
                .setRequired(false)
                .addChoices(
                    { name: 'Status', value: 'status' },
                    { name: 'Start Container', value: 'start' },
                    { name: 'Stop Container', value: 'stop' },
                    { name: 'Restart Container', value: 'restart' }
                )
        )
        .addStringOption(option =>
            option.setName('container')
                .setDescription('Container name (required for start/stop/restart)')
                .setRequired(false)
        ),

    async execute(interaction, bot) {
        const action = interaction.options.getString('action') || 'status';
        const containerName = interaction.options.getString('container');

        if (['start', 'stop', 'restart'].includes(action) && !containerName) {
            await interaction.reply({
                content: '❌ Container name is required for this action.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        try {
            if (action === 'status') {
                const dockerStats = await bot.modules.dockerMonitor.getContainerStatus();
                const dashboard = bot.modules.dashboardEmbed.createDockerStatusEmbed(dockerStats);
                await interaction.editReply(dashboard);
            } else {
                let result;
                switch (action) {
                    case 'start':
                        result = await bot.modules.dockerMonitor.startContainer(containerName);
                        break;
                    case 'stop':
                        result = await bot.modules.dockerMonitor.stopContainer(containerName);
                        break;
                    case 'restart':
                        result = await bot.modules.dockerMonitor.restartContainer(containerName);
                        break;
                }

                const emoji = result.success ? '✅' : '❌';
                await interaction.editReply({
                    content: `${emoji} ${result.message}`
                });
            }
        } catch (error) {
            console.error('Error with Docker command:', error);
            await interaction.editReply({
                content: '❌ Error executing Docker command. Please try again later.',
                ephemeral: true
            });
        }
    },
};


