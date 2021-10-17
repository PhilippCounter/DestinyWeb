import { Container, Row, Col, Card, Table } from 'react-bootstrap'
import { getPlayerMembership, DestinyProfileData, apiPullDestinyManifest, reactSelectDarkTheme, apiAllGetHistoricalStats, apiGetHistoricalStatsDefinition } from '../../../services/traveler'
import CharacterActivities from '../../../components/characterActivities'
import { DestinyManifestSlice } from 'bungie-api-ts/destiny2';
import { Chart, AxisOptions } from 'react-charts'
import { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import { BungieMembershipType, DestinyHistoricalStatsValue, DestinyHistoricalStatsDefinition, DestinyMetricDefinition, DestinyMetricComponent } from 'bungie-api-ts/destiny2';

interface IProps {
    manifest        : DestinyManifestSlice<("DestinyActivityDefinition" | "DestinyClassDefinition")[]>,
    player          : DestinyProfileData,
    metricsWithDefinition : { metric: DestinyMetricComponent, definition: DestinyMetricDefinition }[],
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

    const getCharWithLatestActivity = ( player: DestinyProfileData ): string => {
        let highestCharId    = '';
        let highestCharPriod;

        if ( !player.lastMatches ) return Object.keys(player.characterStats)[0];

        for ( const charId of Object.keys( player.lastMatches ) ) {
            const date = new Date( player.lastMatches[charId][0].period );
            if ( !highestCharPriod || date > highestCharPriod ) {
                highestCharId    = charId;
                highestCharPriod = date;
            }
        }

        return highestCharId;
    }

    const firstCharId = getCharWithLatestActivity(player);
    const firstChar = player.characterStats[ firstCharId ];

    const [ charId, setCharId ] = useState<string>( firstCharId );
    let character   = player.characters && player.characters.data ? player.characters.data[charId] : null;

    const valueTypeListToSeries = ( valueTypes: string[] ): Series[] => {
        return valueTypes.map( ( valueType ) => {
            const data = ( player.characterStats[ charId ].allPvP.daily || [] ).map( ( dayData ) => ({ date: new Date( dayData.period ), stars : dayData.values[valueType].basic.value }));
            return {
                label: valueType,
                data: data.length > 0 ? data : [{ date: new Date(), stars: 0 }],
            };
        } );
    }

    const deafultValueTypes = [ 'killsDeathsRatio' ];
    const [ chartData, setChartData ] = useState<Series[]>( valueTypeListToSeries(deafultValueTypes) );
    const primaryAxis   = useMemo( (): AxisOptions<DailyStars> => ({ getValue: datum => datum.date }), [] )
    const secondaryAxes = useMemo( (): AxisOptions<DailyStars>[] => [ { getValue: datum => datum.stars } ], [] )

    useEffect(() => {
        setChartData( valueTypeListToSeries( chartData.map((el) => el.label) ) )
    },[charId]);

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
                    <Col>
                        <Card>
                            <Card.Body>
                                <img style={{ float: 'left', marginRight: '20px' }} src={ "https://www.bungie.net/" + ( player.characters.data ? player.characters.data[ Object.keys(player.characters.data)[0] ].emblemPath : '' ) }></img>
                                <div>
                                    <div style={{ marginBottom: '10px', fontSize: '30px', fontWeight: 'bold' }}>{player.profile.data?.userInfo.bungieGlobalDisplayName}#{player.profile.data?.userInfo.bungieGlobalDisplayNameCode}</div>
                                    <div style={{ marginBottom: '10px', fontSize: '20px' }}>{player.profile.data?.userInfo.membershipType} - {player.profile.data?.userInfo.membershipId}</div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className="mt-3">
                    <Col>
                        <Card>
                            <Card.Body>Character Stats</Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className="mt-3">
                    <Col>
                        <Card style={{ height: '600px', padding: '20px', color: '#FFF' }} >
                            <div style={{ marginBottom: '10px' }}>
                                <Select 
                                    className="basic-multi-select"
                                    defaultValue={ deafultValueTypes.map( (el) => ({ label: el, value: el }) ) }
                                    options={ Object.keys( firstChar.allPvP.daily[0].values ).map( (el) => ({ label: el, value: el }) ) }
                                    theme={reactSelectDarkTheme}
                                    onChange={ (list) => setChartData( valueTypeListToSeries( list.map((el) => el.value ) ) ) }
                                    isMulti
                                />
                            </div>
                            <Card.Body>
                                <Chart 
                                    key={ charId }
                                    style={{ color: '#FFF' }}
                                    options={{
                                        data: chartData,
                                        primaryAxis,
                                        secondaryAxes,
                                        dark : true
                                    }}
                                />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className="mt-3">
                    <Col>
                        <Card>
                            <Card.Body>Metrics</Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className="row-cols-auto">
                    {
                        props.metricsWithDefinition.map( (metric,idx) => <Col key={idx} className="mt-3">
                            <Card style={{ width: '250px' }}>
                                <Card.Header style={{ fontSize: '12px', height: '53px' }}>
                                    { metric.definition.displayProperties.name }
                                </Card.Header>
                                <Card.Body>
                                    <div style={{ float: 'left' }}><img src={ "https://www.bungie.net/" + metric.definition.displayProperties.icon } /></div>
                                    <div style={{ textAlign: 'right' }}>{ metric.metric.objectiveProgress.progress }</div>
                                </Card.Body>
                            </Card>
                        </Col> )
                    }

                </Row>
            </Col>
        </Row>



    </Container>
}

export async function getServerSideProps( { params }: any ) {
    const manifest = await apiPullDestinyManifest();
    const player   = await getPlayerMembership( params.destinyMembershipType, params.destinyMembershipId );
    const metrics  = player.metrics.data?.metrics || {};
    const metricsWithDefinition = Object.keys( metrics ).map( (hash) => ({ metric: metrics[parseInt(hash)], definition: manifest.DestinyMetricDefinition[parseInt(hash)] }) ) as { metric: DestinyMetricComponent, definition: DestinyMetricDefinition }[];

    return { props: { manifest, player, metricsWithDefinition } };
}
