import type { NextApiRequest, NextApiResponse } from 'next';
import { storeDestinyManifest, pullDestinyManifest } from '../../services/traveler'
import { allowedSpecialEndpoints } from '../../services/apiSecret';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const fs = require('fs');

    if ( req.method == 'PUT' ) {

        if ( !allowedSpecialEndpoints ) {
            res.status(405).json( [ 'not allowed' ] );
            return;
        }

        await storeDestinyManifest( fs );
        res.status(200).json([ 'ok' ]);
        return;
    } 
    if ( req.method == 'GET' ) {
        const manifest = await pullDestinyManifest( fs );
        res.status(200).json(manifest);
        return;
    }
    
    res.status(404).json([ 'not found' ]);
    return;
}
