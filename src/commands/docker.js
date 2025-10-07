const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
                    { name: 'Restart Container', value: 'restart' },
                    { name: 'View Logs', value: 'logs' }
                )
        )
        .addStringOption(option =>
            option.setName('container')
                .setDescription('Container name (required for start/stop/restart)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, bot) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '❌ You need Administrator permissions to use this command.',
                ephemeral: true
            });
            return;
        }

        const action = interaction.options.getString('action') || 'status';
        const containerName = interaction.options.getString('container');

        if (['start', 'stop', 'restart', 'logs'].includes(action) && !containerName) {
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
            } else if (action === 'logs') {
                const result = await bot.modules.dockerMonitor.getContainerLogs(containerName);
                
                if (!result.success) {
                    await interaction.editReply({
                        content: `❌ Error getting logs for ${containerName}: ${result.message}`,
                        ephemeral: true
                    });
                    return;
                }

                // Format logs for Discord (Discord has a 2000 character limit per message)
                const maxLength = 1900; // Leave some buffer
                let logText = result.logs.join('\n');
                
                if (logText.length > maxLength) {
                    logText = logText.substring(0, maxLength) + '\n... (truncated)';
                }

                await interaction.editReply({
                    content: `📋 **Logs for ${result.containerName}** (${result.totalLines} lines)\n\`\`\`\n${logText}\n\`\`\``
                });
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


