import axios from 'axios';
import { BungieMembershipType } from 'bungie-api-ts/common';
import config from 'next/dist/server/config';
import { useReducer, useCallback, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap'
import debounce from "lodash.debounce" 
import { apiGetProfile, baseUrl } from '../services/traveler';

interface IReducerState {
    teamA: { membershipType?: string, membershipId?: string, playerName?: string }[],
    teamB: { membershipType?: string, membershipId?: string, playerName?: string }[],
}

interface IReducerAction {
    teamName        : 'teamA'|'teamB',
    playerIndex     : number,
    type            : 'membershipType'|'membershipId'|'playerName',
    text            : string,
}



function playerReducer ( state : IReducerState, action : IReducerAction ) : IReducerState {
    state[ action.teamName ][ action.playerIndex ][ action.type ] = action.text;
    return { ...state };
}



export default function Home() {

    const [ player, setPlayer ] = useReducer(playerReducer, { 
        teamA: [ { membershipId: '4611686018431042237', membershipType: '2', playerName: 'DonkyTheKing' },    { membershipId: '4611686018446510179', membershipType: '2', playerName: 'iSymth' },   { membershipId: '4611686018453526074', membershipType: '2', playerName: 'Kaleyta' } ], 
        teamB: [ { membershipId: '4611686018429254495', membershipType: '2', playerName: 'Philipp_Counter' }, { membershipId: '4611686018433354557', membershipType: '2', playerName: 'Mpahaoua' }, { membershipId: '4611686018436908464', membershipType: '2', playerName: 'kreuschi12' } ] 
    } );

    const [ prediction, setPrediction ] = useState<string[]>();

    const predictWin = async () => {
        const result = (await axios({
            method: 'POST',
            url: baseUrl + '/api/ai/run',
            data: [
                player.teamA,
                player.teamB,
            ],
        }) ).data;

        setPrediction( result );
    }

    const setPlayerData = async ( action: IReducerAction ) => {
        const playerData = player[ action.teamName ][ action.playerIndex ];
        const membershipId   = action.type == 'membershipId'   ? action.text : playerData.membershipId;
        const membershipType = action.type == 'membershipType' ? action.text : playerData.membershipType;
        const bungieMembershipType = parseInt( membershipType || "2" );

        if ( bungieMembershipType && membershipId ) {
            setPlayerName( action, bungieMembershipType, membershipId );
        }

        setPlayer( action );
    }

    const setPlayerName = async ( action: IReducerAction, bungieMembershipType: BungieMembershipType, membershipId: string ) => {
        const destinyProfileResponse = ( await apiGetProfile( bungieMembershipType, membershipId ) ).Response;
        const profileName = destinyProfileResponse.profile.data?.userInfo.bungieGlobalDisplayName || '';
        setPlayer( { ...action, type : 'playerName', text : profileName } );
    }


    return <Container fluid>
        <Row>
            <Col> <h1>Destiny AI predictions</h1> </Col>
        </Row>
        <Row className="mt-3" >
            { [0,1,2].map(
                (playerIndex) => <Col key={playerIndex}>
                    <div>{ player.teamA[playerIndex].playerName }</div>
                    <div><input value={ player.teamA[playerIndex].membershipType } onChange={ (event) => setPlayerData({ teamName: 'teamA', playerIndex, type: 'membershipType', text: event.target.value }) } /></div>
                    <div><input value={ player.teamA[playerIndex].membershipId }   onChange={ (event) => setPlayerData({ teamName: 'teamA', playerIndex, type: 'membershipId', text: event.target.value }) } /></div>
                </Col>
            )}
        </Row>
        <Row className="mt-5">
            { [0,1,2].map(
                (playerIndex) => <Col key={playerIndex}>
                    <div>{ player.teamB[playerIndex].playerName }</div>
                    <div><input value={ player.teamB[playerIndex].membershipType } onChange={ (event) => setPlayerData({ teamName: 'teamB', playerIndex, type: 'membershipType', text: event.target.value }) } /></div>
                    <div><input value={ player.teamB[playerIndex].membershipId }   onChange={ (event) => setPlayerData({ teamName: 'teamB', playerIndex, type: 'membershipId', text: event.target.value }) } /></div>
                </Col>
            )}
        </Row>
        <Row className="mt-5">
            { prediction && <>
                <Col>
                    <div style={{ fontSize: '30px' }}>
                        <div style={{ marginTop: '20px', fontSize: '20px' }}>Team A has a {prediction[0]}% chance of winning</div>
                    </div>
                </Col>
            </>}
        </Row>
        <Row className="mt-5">
            <Col>
                <Button onClick={ predictWin }> predict </Button>
            </Col>
        </Row>
        
    </Container>
}