import type { NextApiRequest, NextApiResponse } from 'next';
import { storeDestinyManifest, pullDestinyManifest } from '../../services/traveler'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const fs = require('fs');

    if ( req.method == 'PUT' ) {
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
