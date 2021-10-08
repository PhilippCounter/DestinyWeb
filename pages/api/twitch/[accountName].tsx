import type { NextApiRequest, NextApiResponse } from 'next';
import { twitchSecret } from '../../../services/apiSecret';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const { accountName } = req.query;

    const fs = require('fs');

    var token = (
        await axios.post(
            'https://id.twitch.tv/oauth2/token?client_id=kauu3sdz1wuimv1lx2zhfb3nb2j4pn&client_secret=09tygj8qjw1ac6i04sp6imbexhn069&grant_type=client_credentials'
        ) 
    ).data as { access_token : string };

    var users = (await axios.get('https://api.twitch.tv/helix/users', {
        params: {
            login : accountName,
        },
        headers: { 
            'Authorization' : 'Bearer ' + token.access_token,
            'Client-Id'     : twitchSecret.client,
        }
    }) ).data as { data : { id: string }[] };

    if ( !users.data[0] ) {
        res.status(200).json({ user: {}, videos: [] });
        return;
    }

    var videos = (await axios.get('https://api.twitch.tv/helix/videos', {
        params: {
            user_id : users.data[0].id,
        },
        headers: { 
            'Authorization' : 'Bearer ' + token.access_token,
            'Client-Id'     : twitchSecret.client,
        }
    }) ).data as { data : any[] };
    
    res.status(200).json({ user: users.data[0], videos: videos.data });
    return;
}