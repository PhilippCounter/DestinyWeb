import type { NextApiRequest, NextApiResponse } from 'next';
import { tensor, sequential, layers, train, losses, util, tidy, greater, scalar, where, onesLike, zerosLike, metrics, Tensor  } from "@tensorflow/tfjs-node";
import { getHistory, apiGetPostGameCarnageReport, apiGetMembershipDataById, HistoryActivity, apiGetHistoricalStatsForAccount } from '../../../services/traveler'
import { DestinyHistoricalStatsPeriodGroup } from 'bungie-api-ts/destiny2';

import { 
    ComponentType, 
    ActivityModeType, 
    MembershipType,
    PeriodType
} from '../../../services/bungieEnum';

import { allowedSpecialEndpoints } from '../../../services/apiSecret';

const initialModelOptions = {
    optimizer: "adam",
    learningRate: 0.05,
    epochs: 2000,
};

const OPTIMIZERS = {
    sgd: { libelle: "sgd", fn: (lr: number) => train.sgd(lr) },
    adam: { libelle: "adam", fn: (lr: number) => train.adam(lr) },
    adagrad: { libelle: "adagrad", fn: (lr: number) => train.adagrad(lr) },
    adadelta: { libelle: "adadelta", fn: (lr: number) => train.adadelta(lr) },
    momentum: { libelle: "momentum", fn: (lr: number) => train.momentum(lr, 1) },
    rmsprop: { libelle: "rmsprop", fn: (lr: number) => train.rmsprop(lr) },
} as { [ key: string ]: any };

interface miniHistory {
        activityDetails: { instanceId: string },
        period: string,
        values: { [ key: string ]: { basic: { value: number } } }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const fs = require('fs');

    if ( !allowedSpecialEndpoints ) {
        res.status(405).json( [ 'not allowed' ] );
        return;
    }

    const testPlayerMembershipId = "4611686018429254495";

    const history = await getHistory( 2, testPlayerMembershipId, "2305843009261515325", { page: 0, count: 200, mode: ActivityModeType.TrialsOfOsiris } ) as miniHistory[];
    console.log('got history', history.length);

    let data_set = [];
    let gotten_data = 0;

    if ( fs.existsSync('data/ai_set.json') ) { 
        data_set = JSON.parse( fs.readFileSync( 'data/ai_set.json', 'UTF-8' ) );
        gotten_data = 1;
    }

    let player_cache = {} as any;

    let count_entries = 1;

    for ( let entrie of history ) {
        if ( gotten_data ) break; 

        const pcgr = await loadPGCR( entrie.activityDetails.instanceId );
        console.log('got pcgr => ', count_entries, entrie.period  );
        count_entries++;

        let formated_players = [
            [], // team 18
            [], // team 19
        ] as any[][];

        const testPlayerTeam = pcgr.entries.find( (player) => player.player.destinyUserInfo.membershipId == testPlayerMembershipId )?.values.team.basic.value;

        for ( let player of pcgr.entries ) {

            const member = player.player.destinyUserInfo.membershipType + '_' + player.player.destinyUserInfo.membershipId;
            const account_stats = player_cache[member] ? player_cache[member] : ( await apiGetHistoricalStatsForAccount( player.player.destinyUserInfo.membershipType, player.player.destinyUserInfo.membershipId ) ).Response;
            player_cache[member] = account_stats;
            
            const pvp_stats = account_stats.mergedAllCharacters.results.allPvP.allTime;
            console.log('got player => ', player.player.destinyUserInfo.displayName  );

            if ( !pvp_stats ) continue;
        
            formated_players[ testPlayerTeam == player.values.team.basic.value ? 0 : 1 ].push(
                [ 
                    pvp_stats.killsDeathsRatio.basic.value  || 0, 
                    pvp_stats.kills.basic.value             || 0, 
                    pvp_stats.winLossRatio.basic.value      || 0,
                ],
            );
        }

        data_set.push( {
            players : formated_players,
            win     : entrie.values.standing.basic.value,
        } );

        //fs.writeFileSync( 'data/ai_set.json', JSON.stringify( data_set ) );

    }
    

    const test_input = data_set.shift() || { players: [] };

    let input_data = data_set.map( (data: any) => flattenTheSet( data ) );
    let label_data = data_set.map( (data: any) => data.win ? 1 : 0 );

    // 'TRAINING'
    const [input, label] = generateData( input_data, label_data );
    const model = createModel(initialModelOptions);

    await model.fit(input, label, { epochs : initialModelOptions.epochs });

    model.save('file://data/ai_model');

    const flatInput = flattenTheSet( test_input ) as any[];

    const data       = model.predict( tensor([ flatInput ]) ) as Tensor;
    const prediction = binarize( data ).as1D() as Tensor;


    const dataArray  = data.arraySync();
    const dataString = Array.isArray( dataArray ) ? dataArray[0] : dataArray; 

    const predictionArray  = prediction.arraySync();
    const predictionString = Array.isArray( predictionArray ) ? predictionArray[0] : predictionArray; 

    res.status(200).json( [ dataString , predictionString ] );
    return;

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

function flattenTheSet ( data: any ) {
    
    let players = data.players;


    return [
        (( players[0] || [] )[0] || [] )[0], (( players[0] || [] )[0] || [] )[1], (( players[0] || [] )[0] || [] )[2], 
        (( players[0] || [] )[1] || [] )[0], (( players[0] || [] )[1] || [] )[1], (( players[0] || [] )[1] || [] )[2], 
        (( players[0] || [] )[2] || [] )[0], (( players[0] || [] )[2] || [] )[1], (( players[0] || [] )[2] || [] )[2], 
        
        (( players[1] || [] )[0] || [] )[0], (( players[1] || [] )[0] || [] )[1], (( players[1] || [] )[0] || [] )[2], 
        (( players[1] || [] )[1] || [] )[0], (( players[1] || [] )[1] || [] )[1], (( players[1] || [] )[1] || [] )[2], 
        (( players[1] || [] )[2] || [] )[0], (( players[1] || [] )[2] || [] )[1], (( players[1] || [] )[2] || [] )[2], 
    ].map( (val) => val ? val : 0 );
}

function generateData( input_data: any, label_data: any ) {

    

    const input = tensor( input_data );
    const label = tensor( label_data );

    return [input, label];
}

function createModel({ learningRate = 0.01, optimizer = "adam" }) {
    const selectOptimizer = (optimizer: string) => {
        return OPTIMIZERS[optimizer].fn(learningRate);
    };

    const model = sequential();
    model.add(layers.dense({ units : 18, activation: 'sigmoid', inputShape: [ 18 ] }));
    model.add(layers.dense({ units : 36, activation: 'sigmoid' }));
    model.add(layers.dense({ units : 1, activation: 'sigmoid' }));
    


    model.compile({
        optimizer: selectOptimizer(optimizer),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });
    return model;
}

const loadPGCR = async ( activityId: string ) => {
    return ( await apiGetPostGameCarnageReport( activityId ) ).Response;
}