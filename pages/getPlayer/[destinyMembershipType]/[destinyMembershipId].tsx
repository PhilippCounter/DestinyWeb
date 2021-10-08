import { Container, Row, Col, Card } from 'react-bootstrap'
import { getPlayerMembership, DestinyProfileData, apiPullDestinyManifest } from '../../../services/traveler'
import CharacterActivities from '../../../components/characterActivities'
import { DestinyManifestSlice } from 'bungie-api-ts/destiny2';
import { Chart, AxisOptions } from 'react-charts'
import { useMemo, useState } from 'react'

interface IProps {
    manifest : DestinyManifestSlice<("DestinyActivityDefinition" | "DestinyClassDefinition")[]>,
    player   : DestinyProfileData
}

type DailyStars = {
    date: Date, 
    stars: number, 
}

type Series = {
    label: string,
    data: DailyStars[]
}

export default function PlayerName( props: IProps ) {

    const player = props.player as DestinyProfileData;

    const firstChar = player.characterStats[ Object.keys(player.characterStats)[0] ];

    const data: Series[] = [
        {
            label: 'Deaths',
            data: [
                ...( firstChar.allPvP.daily || [] ).map( ( dayData ) => ({ date: new Date( dayData.period ), stars : dayData.values.deaths.basic.value }) ),
                {
                    date : new Date(),
                    stars : 0,
                },
            ],
        },
        {
            label: 'Kills',
            data: [
                ...( firstChar.allPvP.daily || [] ).map( ( dayData ) => ({ date: new Date( dayData.period ), stars : dayData.values.kills.basic.value }) ),
                {
                    date : new Date(),
                    stars : 0,
                },
            ],
        },
    ];

    const primaryAxis = useMemo( (): AxisOptions<DailyStars> => ({ getValue: datum => datum.date }), [] )
    const secondaryAxes = useMemo( (): AxisOptions<DailyStars>[] => [ { getValue: datum => datum.stars } ], [] )

    const [ charId, setCharId ] = useState<string>( player.characters.data ? Object.keys( player.characters.data )[0] : '' );
    let character   = player.characters && player.characters.data ? player.characters.data[charId] : null;


    return <Container fluid>
        <Row>
            <div style={{ width: '590px' }}>
                { character ? <Card key={ charId }>
                    <Card.Body>
                        { player.characters.data ? Object.keys( player.characters.data ).map( (_charId, idx) => {
                            let _character = player.characters && player.characters.data ? player.characters.data[_charId] : null;
                            return <div className={ "character-buttons " + ( _charId == charId ? 'active' : '' ) } key={ charId + '_' + idx } onClick={() => setCharId(_charId)}>
                                <div style={{ fontSize: '30px' }} >{ _character ? props.manifest.DestinyClassDefinition[_character.classHash].displayProperties.name : null }</div> 
                                <img  src={ "https://www.bungie.net/" + ( _character ? _character.emblemPath : '' ) }></img>
                            </div>
                        } ) : null }
                    </Card.Body>
                    <Card.Footer>
                        { player.lastMatches && player.lastMatches[ charId ] 
                            ? <CharacterActivities 
                                manifest={props.manifest}
                                membershipType={player.profile.data?.userInfo.membershipType}
                                destinyMembershipId={player.profile.data?.userInfo.membershipId}
                                lastMatches={ player.lastMatches[ charId ] }
                                characterId={charId}
                            /> : null
                        }
                    </Card.Footer>
                </Card> :null }
            </div>
            <Col>
                <Row>
                    <Card>
                        <Card.Body>
                            <img style={{ float: 'left', marginRight: '20px' }} src={ "https://www.bungie.net/" + ( player.characters.data ? player.characters.data[ Object.keys(player.characters.data)[0] ].emblemPath : '' ) }></img>
                            <div>
                                <div style={{ marginBottom: '10px', fontSize: '30px', fontWeight: 'bold' }}>{player.profile.data?.userInfo.bungieGlobalDisplayName}#{player.profile.data?.userInfo.bungieGlobalDisplayNameCode}</div>
                                <div style={{ marginBottom: '10px', fontSize: '20px' }}>{player.profile.data?.userInfo.membershipType} - {player.profile.data?.userInfo.membershipId}</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Row>
                <Row className="mt-3">
                    <Card style={{ height: '500px', padding: '20px', color: '#FFF' }} >
                        <Card.Body>
                            <Chart 
                                key={ charId }
                                style={{ color: '#FFF' }}
                                options={{
                                    data,
                                    primaryAxis,
                                    secondaryAxes,
                                    dark : true
                                }}
                            />
                        </Card.Body>
                    </Card>
                </Row>
            </Col>
        </Row>



    </Container>
}

export async function getServerSideProps( { params }: any ) {
    var manifest = await apiPullDestinyManifest();
    var player = await getPlayerMembership( params.destinyMembershipType, params.destinyMembershipId );
    return { props: { manifest, player } };
}