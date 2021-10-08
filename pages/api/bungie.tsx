import type { NextApiRequest, NextApiResponse } from 'next';
import { apiSecret } from '../../services/apiSecret';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const fs = require('fs');

    const file_path = cachableResponseString( req.body.bungie_url );
    if ( file_path ) {
        if ( fs.existsSync(file_path) ) { 
            res.status(200).json( fs.readFileSync( file_path, 'UTF-8' ) );
            return;
        }
    }

    var response = (await axios.get(req.body.bungie_url, {
        params: req.body.bungie_params,
        headers: { 'X-API-Key' : apiSecret }
    }) ).data;

    if ( file_path ) fs.writeFileSync( file_path, JSON.stringify(response) );
    
    res.status(200).json( response );
    return;
}

function cachableResponseString ( url: string ): string|undefined {
    let regExp = new RegExp("^https\:\/\/stats\.bungie\.net\/Platform\/Destiny2\/Stats\/PostGameCarnageReport\/([0-9]+)\/");
    if ( url.match( regExp ) ) return 'data/PCGR/' + ( url.match( regExp ) || [] )[1] + '.json';
    return;
}
