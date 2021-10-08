import type { NextApiRequest, NextApiResponse } from 'next';
import { tensor, train, util, tidy, scalar, where, onesLike, zerosLike, Tensor, loadLayersModel   } from "@tensorflow/tfjs-node";
import { apiGetHistoricalStatsForAccount } from '../../../services/traveler'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const fs = require('fs');

    const model = await loadLayersModel('file://data/ai_model/model.json');
    
    let formated_players = [
        [], // team 18
        [], // team 19
    ] as any[][];

    const teams = req.body;

    for ( let i = 0; i < teams.length; i++ ) {
        let players = teams[i];

        for ( let player of players ) {
            const account_stats = ( await apiGetHistoricalStatsForAccount( player.membershipType, player.membershipId ) ).Response;
            const pvp_stats = account_stats.mergedAllCharacters.results.allPvP.allTime;
    
            formated_players[i].push([
                pvp_stats.killsDeathsRatio.basic.value, 
                pvp_stats.kills.basic.value, 
                pvp_stats.winLossRatio.basic.value 
            ]);
        }
    }

    console.log( formated_players );

    const data       = model.predict( tensor([ flattenTheSet({ players: formated_players }) ]) ) as Tensor;
    const prediction = binarize( data ).as1D() as Tensor;

    const dataArray  = data.arraySync();
    const dataString = ( Array.isArray( dataArray ) ? ( Array.isArray( dataArray[0] ) ? dataArray[0][0] : dataArray[0] ) : dataArray ) as number; 

    const predictionArray  = prediction.arraySync();
    const predictionString = Array.isArray( predictionArray ) ? predictionArray[0] : predictionArray; 

    res.status(200).json( [ Number(dataString * 100).toFixed(2), predictionString ? 'win' : 'loss' ] );
    return;

}

function flattenTheSet ( data: any ) {
    return [
        data.players[0][0][0], data.players[0][0][1], data.players[0][0][2], 
        data.players[0][1][0], data.players[0][1][1], data.players[0][1][2], 
        data.players[0][2][0], data.players[0][2][1], data.players[0][2][2], 
        
        data.players[1][0][0], data.players[1][0][1], data.players[1][0][2],
        data.players[1][1][0], data.players[1][1][1], data.players[1][1][2], 
        data.players[1][2][0], data.players[1][2][1], data.players[1][2][2], 
    ];
}


export function binarize(y : any, threshold: number = 0.5 ) {
    util.assert(
        threshold >= 0 && threshold <= 1,
        () => `Expected threshold to be >=0 and <=1, but got ${threshold}`
    );
  
    return tidy(() => {
      const condition = y.greater(scalar(threshold));
      return where(condition, onesLike(y), zerosLike(y));
    });
}
