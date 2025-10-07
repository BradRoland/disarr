const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Request an invite to Plex or Jellyfin')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Your name for the invite')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Optional message explaining why you want access')
                .setRequired(false)
        ),

    async execute(interaction, bot) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const name = interaction.options.getString('name');
            const message = interaction.options.getString('message') || 'No message provided';
            const requester = interaction.user;

            // Create service selection embed
            const embed = new EmbedBuilder()
                .setTitle('🎬 Choose Your Media Service')
                .setDescription(`**${name}**, please select which service you'd like an invite for:`)
                .setColor(0x0099ff)
                .setFooter({ text: 'HomeLab Discord Bot • Invite Request' })
                .setTimestamp();

            // Create service selection buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('invite_plex')
                        .setLabel('🎭 Plex')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎭'),
                    new ButtonBuilder()
                        .setCustomId('invite_jellyfin')
                        .setLabel('🎬 Jellyfin')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎬')
                );

            const response = await interaction.editReply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            // Collect button interaction
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000, // 5 minutes
                max: 1
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== requester.id) {
                    return await buttonInteraction.reply({
                        content: '❌ Only the person who requested the invite can select a service.',
                        ephemeral: true
                    });
                }

                const service = buttonInteraction.customId === 'invite_plex' ? 'Plex' : 'Jellyfin';
                
                // Update the embed to show processing
                const processingEmbed = new EmbedBuilder()
                    .setTitle('⏳ Processing Invite Request')
                    .setDescription(`**${name}** has requested an invite for **${service}**.\n\n🔄 Sending approval request to admin...`)
                    .setColor(0xffa500)
                    .setFooter({ text: 'HomeLab Discord Bot • Processing' })
                    .setTimestamp();

                await buttonInteraction.update({
                    embeds: [processingEmbed],
                    components: []
                });

                           // Use InviteManager to handle the approval request
                           if (bot.modules.inviteManager) {
                               const inviteData = {
                                   requester: {
                                       id: requester.id,
                                       name: name
                                   },
                                   service: service,
                                   message: message
                               };
                               
                               await bot.modules.inviteManager.sendApprovalRequest(inviteData);
                           } else {
                               console.error('InviteManager not available');
                           }

                           // Update user message for admin approval
                           const pendingEmbed = new EmbedBuilder()
                               .setTitle('⏳ Invite Request Submitted')
                               .setDescription(`Your request for **${service}** has been submitted for admin approval. You'll receive a DM with your invite link once approved.`)
                               .setColor(0xffa500)
                               .setTimestamp();

                    await buttonInteraction.editReply({
                        embeds: [pendingEmbed],
                        components: []
                    });
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('⏰ Request Expired')
                        .setDescription('Your invite request has expired. Please use `/invite` again to make a new request.')
                        .setColor(0xff0000)
                        .setFooter({ text: 'HomeLab Discord Bot • Expired' })
                        .setTimestamp();

                    try {
                        await interaction.editReply({
                            embeds: [timeoutEmbed],
                            components: []
                        });
                    } catch (error) {
                        console.error('Error updating expired invite request:', error);
                    }
                }
            });

        } catch (error) {
            console.error('Error in invite command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your invite request. Please try again later.',
                ephemeral: true
            });
        }
    },
};
