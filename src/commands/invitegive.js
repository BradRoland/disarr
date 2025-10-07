const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invitegive')
        .setDescription('Admin command to directly send an invite to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to send the invite to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('service')
                .setDescription('The service to create an invite for')
                .setRequired(true)
                .addChoices(
                    { name: 'Plex', value: 'plex' },
                    { name: 'Jellyfin', value: 'jellyfin' }
                )
        )
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name for the invite')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
            const targetUser = interaction.options.getUser('user');
            const service = interaction.options.getString('service');
            const name = interaction.options.getString('name');

            // Try to create a Wizarr invite
            let inviteUrl;
            let successMessage = 'created';

            if (bot.modules.wizarrIntegration && bot.modules.wizarrIntegration.isConfigured()) {
                console.log(`Admin creating Wizarr invite for ${service} for user ${targetUser.username}...`);
                const inviteResult = await bot.modules.wizarrIntegration.createInvite({
                    service: service
                });

                if (inviteResult.success) {
                    inviteUrl = inviteResult.inviteUrl;
                    successMessage = 'created and sent';
                } else {
                    console.error('Wizarr API failed during admin invite creation:', inviteResult.error);
                    // Fall back to direct service links
                    if (service.toLowerCase() === 'plex') {
                        inviteUrl = 'https://plex.brads-lab.com';
                    } else if (service.toLowerCase() === 'jellyfin') {
                        inviteUrl = 'https://jellyfin.brads-lab.com';
                    } else {
                        inviteUrl = `https://${service.toLowerCase()}.brads-lab.com`;
                    }
                }
            } else {
                // Fall back to direct service links
                if (service.toLowerCase() === 'plex') {
                    inviteUrl = 'https://plex.brads-lab.com';
                } else if (service.toLowerCase() === 'jellyfin') {
                    inviteUrl = 'https://jellyfin.brads-lab.com';
                } else {
                    inviteUrl = `https://${service.toLowerCase()}.brads-lab.com`;
                }
            }

            // Send DM to the target user
            try {
                const userEmbed = new EmbedBuilder()
                    .setTitle('🎉 You\'ve Been Invited!')
                    .setDescription(`**${interaction.user.username}** has sent you an invite for **${service.charAt(0).toUpperCase() + service.slice(1)}**!`)
                    .addFields(
                        { name: 'Name', value: name, inline: true },
                        { name: 'Service', value: service.charAt(0).toUpperCase() + service.slice(1), inline: true },
                        { name: 'Invited At', value: new Date().toLocaleString(), inline: true },
                        { name: 'Service Access', value: `[Click here to access ${service.charAt(0).toUpperCase() + service.slice(1)}](${inviteUrl})`, inline: false },
                        { name: 'Instructions', value: '1. Click the link above\n2. Create your account or log in\n3. Contact an admin if you need help', inline: false }
                    )
                    .setColor(0x00ff00)
                    .setTimestamp();

                await targetUser.send({ embeds: [userEmbed] });

                // Confirm to admin
                const adminEmbed = new EmbedBuilder()
                    .setTitle('✅ Invite Sent Successfully!')
                    .setDescription(`Invite for **${service.charAt(0).toUpperCase() + service.slice(1)}** has been ${successMessage} and sent to **${targetUser.username}**!`)
                    .addFields(
                        { name: 'Recipient', value: `${targetUser.username} (${targetUser.id})`, inline: true },
                        { name: 'Service', value: service.charAt(0).toUpperCase() + service.slice(1), inline: true },
                        { name: 'Name', value: name, inline: true },
                        { name: 'Invite Link', value: `[Click here to view invite](${inviteUrl})`, inline: false }
                    )
                    .setColor(0x00ff00)
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [adminEmbed]
                });

            } catch (error) {
                console.error('Could not send DM to user:', error);
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Failed to Send DM')
                    .setDescription(`Could not send DM to **${targetUser.username}**. They may have DMs disabled.`)
                    .addFields(
                        { name: 'Recipient', value: `${targetUser.username} (${targetUser.id})`, inline: true },
                        { name: 'Service', value: service.charAt(0).toUpperCase() + service.slice(1), inline: true },
                        { name: 'Name', value: name, inline: true },
                        { name: 'Invite Link', value: `[Click here to view invite](${inviteUrl})`, inline: false },
                        { name: 'Note', value: 'You can manually send them the invite link above.', inline: false }
                    )
                    .setColor(0xffa500)
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [errorEmbed]
                });
            }

        } catch (error) {
            console.error('Error in invitegive command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while creating the invite. Please try again later.',
                ephemeral: true
            });
        }
    },
};


