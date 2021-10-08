import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, InputGroup, Button } from 'react-bootstrap'
import { getPlayersByName, DestinyUserSearchResponseDetail } from '../../services/traveler'

import debounce from "lodash.debounce" 

import Loader from "react-loader-spinner"
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css"

export default function PlayerSearch() {

    const [ playerName, setPlayerName ]         = useState<string>('');
    const [ resultPlayers, setResultPlayers ]   = useState<DestinyUserSearchResponseDetail[]>([]);
    const [ loading, setLoading ]               = useState<boolean>(false);


    const search = async ( input?: string ) => {
        const profileResponses = ( await getPlayersByName( input ? input : playerName ) );
        setResultPlayers( profileResponses );
    }

    const delayedSearch = useCallback( debounce(search, 300), [] );

    useEffect(() => setLoading(false), [resultPlayers]);

    useEffect(() => {
        if ( !playerName ) return;
        delayedSearch( playerName ) 
        return delayedSearch.cancel;
    }, [playerName]);

    return <Container fluid>
        
        <Row>
            <Col>
                <Card>
                    <Card.Header>Search User</Card.Header>
                    <Card.Body>
                        <InputGroup className="mb-3">
                            <input 
                                className="form-control" 
                                value={ playerName } 
                                onChange={ (event) => setPlayerName(event.target.value) } 
                                onKeyUp={ (e) => { if( e.key == 'Enter' ) { setLoading(true); search(); } } } 
                            />
                            <Button variant="outline-secondary" id="button-addon2" onClick={ () => { setLoading(true); search() } }>Search</Button>
                        </InputGroup>
                    </Card.Body>
                </Card>
            </Col>
        </Row>

        { resultPlayers && resultPlayers.map( ( player: DestinyUserSearchResponseDetail, idx: number ) => (
            <Link 
                href={'/getPlayer/' + player.profile?.userInfo.membershipType + '/' + player.profile?.userInfo.membershipId }
                key={player.bungieGlobalDisplayName + '#' + player.bungieGlobalDisplayNameCode}
            >
                <Row className="mt-3" style={{ cursor: 'pointer' }} onClick={ () => setLoading(true) } >
                    <Col>
                    <Card>
                            <Card.Body>
                                <img style={{ float: 'left', marginRight: '20px' }} src={ "https://www.bungie.net/" + ( player.characters && player.characters.length ? player.characters[ Object.keys(player.characters)[0] ].emblemPath : '' ) }></img>
                                <div style={{ fontSize: '18', fontWeight: 'bold' }}>
                                    <div style={{ marginBottom: '10px' }}>{player.bungieGlobalDisplayName}#{player.bungieGlobalDisplayNameCode}</div>
                                    { player.destinyMemberships.map( ( membership, idx ) => (
                                        <img style={{ height: '25px', width: '25px', marginRight: '10px' }} src={ "https://www.bungie.net/" + membership.iconPath } key={ membership.membershipId + '_' + idx } />
                                    ) ) }
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Link>
        ))}

    <div style={{
        height: '100%',
        width:  '100%',
        zIndex: 1011,
        position: 'fixed',
        backgroundColor: '#000000',
        opacity: 0.5,
        top: '0px',
        left: '0px',
        paddingLeft: '50%',
        paddingTop: '20%',
        display: loading ? 'inline' : 'none',
    }} >
        <Loader
            type="Puff"
            color="#00BFFF"
            height={100}
            width={100}
        />
    </div>

    </Container>
}