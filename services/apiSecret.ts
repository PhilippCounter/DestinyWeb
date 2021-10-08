export const apiSecret = process.env.apiSecret || '';

export const twitchSecret = {
    client : process.env.twitchClient  || '',
    secret : process.env.twitchSecret  || ''
};

export const allowedSpecialEndpoints = process.env.allowedSpecialEndpoints;