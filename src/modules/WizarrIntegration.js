const axios = require('axios');

class WizarrIntegration {
    constructor(config) {
        this.config = config;
        this.baseUrl = (config.wizarr?.url || process.env.WIZARR_URL)?.replace(/\/+$/, ''); // Remove trailing slashes
        this.apiKey = config.wizarr?.apiKey || process.env.WIZARR_API_KEY;
    }

           async createInvite(inviteData) {
               try {
                   if (!this.baseUrl || !this.apiKey) {
                       throw new Error('Wizarr URL or API key not configured');
                   }

                   console.log(`Attempting to create Wizarr invite for ${inviteData.service} at: ${this.baseUrl}`);

                   // Generate a unique invite code
                   const inviteCode = `discord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                   
                   // Set expiration date (2 days from now) - use exact API format
                   const expirationDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                   // Format must match: \d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?
                   const expiresAt = expirationDate.toISOString(); // This gives us the correct format
                   
                   console.log('Setting invite expiration to:', expiresAt);
                   
                   // Map service names to server IDs based on the API response
                   const serverIdMap = {
                       'plex': 2,
                       'jellyfin': 1
                   };
                   
                   const serverId = serverIdMap[inviteData.service.toLowerCase()];
                   if (!serverId) {
                       throw new Error(`Unknown service: ${inviteData.service}`);
                   }

                   // Prepare request body - use exact API format
                   const requestBody = {
                       server_ids: [serverId], // Use server IDs instead of server names
                       code: inviteCode, // REQUIRED - unique invite code
                       used: false, // Not used yet
                       unlimited: false, // Explicitly set to false to allow expiration
                       users: [], // Empty array as per documentation
                       libraries: [], // Empty array as per documentation
                       expiresAt: expiresAt // Use exact API format: YYYY-MM-DDTHH:MM:SS.sssZ
                   };
                   
                   console.log('Wizarr API request body:', JSON.stringify(requestBody, null, 2));
                   
                   // Use the correct API endpoint from the documentation
                   const response = await axios.post(`${this.baseUrl}/api/invitations`, requestBody, {
                       headers: {
                           'X-API-Key': this.apiKey,
                           'Content-Type': 'application/json',
                           'Accept': 'application/json'
                       },
                       timeout: 10000
                   });

                   console.log('Wizarr API response:', response.status, response.data);
                   
                   // If the invite was created successfully, try to update it with expiration
                   if (response.status === 200 || response.status === 201) {
                       const inviteId = response.data.id || response.data.invitation?.id;
                       if (inviteId) {
                           console.log('Attempting to update invite with expiration:', inviteId);
                           try {
                               const updateResponse = await axios.put(`${this.baseUrl}/api/invitations/${inviteId}`, {
                                   expiresAt: expiresAt
                               }, {
                                   headers: {
                                       'X-API-Key': this.apiKey,
                                       'Content-Type': 'application/json',
                                       'Accept': 'application/json'
                                   },
                                   timeout: 10000
                               });
                               console.log('Update response:', updateResponse.status, updateResponse.data);
                           } catch (updateError) {
                               console.log('Failed to update invite expiration:', updateError.message);
                           }
                       }
                   }

                   // Extract the actual invite URL from the response
                   const invitation = response.data.invitation;
                   const inviteUrl = invitation.url || `${this.baseUrl}/j/${invitation.code}`;
                   
                   return {
                       success: true,
                       inviteCode: invitation.code,
                       inviteUrl: inviteUrl,
                       expires: invitation.expires || expiresAt,
                       maxUses: invitation.unlimited ? 'unlimited' : '1'
                   };

               } catch (error) {
                   console.error('Wizarr API Error:', {
                       status: error.response?.status,
                       statusText: error.response?.statusText,
                       data: error.response?.data,
                       message: error.message,
                       url: `${this.baseUrl}/api/invitations`
                   });
                   return {
                       success: false,
                       error: error.response?.data?.message || error.response?.data || error.message || 'Unknown error'
                   };
               }
           }

    async getInviteStatus(inviteCode) {
        try {
            if (!this.baseUrl || !this.apiKey) {
                throw new Error('Wizarr URL or API key not configured');
            }

            const response = await axios.get(`${this.baseUrl}/api/invitations/${inviteCode}`, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: true,
                status: response.data.status,
                used: response.data.used,
                remainingUses: response.data.remaining_uses,
                expires: response.data.expiresAt
            };

        } catch (error) {
            console.error('Wizarr Status Check Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Unknown error'
            };
        }
    }

    async revokeInvite(inviteCode) {
        try {
            if (!this.baseUrl || !this.apiKey) {
                throw new Error('Wizarr URL or API key not configured');
            }

            const response = await axios.delete(`${this.baseUrl}/api/invitations/${inviteCode}`, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: true,
                message: 'Invite revoked successfully'
            };

        } catch (error) {
            console.error('Wizarr Revoke Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Unknown error'
            };
        }
    }

    async getServiceConfig(service) {
        try {
            if (!this.baseUrl || !this.apiKey) {
                throw new Error('Wizarr URL or API key not configured');
            }

            const response = await axios.get(`${this.baseUrl}/api/v1/config/${service.toLowerCase()}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                timeout: 10000
            });

            return {
                success: true,
                config: response.data
            };

        } catch (error) {
            console.error('Wizarr Config Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Unknown error'
            };
        }
    }

    isConfigured() {
        return !!(this.baseUrl && this.apiKey);
    }
}

module.exports = WizarrIntegration;
