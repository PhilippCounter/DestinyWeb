import { useEffect, useState, useReducer } from 'react';
import { Table } from 'react-bootstrap'
import { HistoryActivity, getHistory, apiGetPostGameCarnageReport, apiGetMembershipDataById, apiPullTwitchAccount, ITwitchData, ITwitchVideo } from '../services/traveler'
import { BungieMembershipType, DestinyManifestSlice, DestinyPostGameCarnageReportData, DestinyPostGameCarnageReportEntry } from 'bungie-api-ts/destiny2';
import { UserMembershipData } from 'bungie-api-ts/user';
import { ActivityModeType } from '../services/bungieEnum';

import Loader from "react-loader-spinner"
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css"

interface IProps {
    manifest : DestinyManifestSlice<("DestinyActivityDefinition" | "DestinyClassDefinition")[]>,
    membershipType : BungieMembershipType|undefined,
    destinyMembershipId: string|undefined
    
    lastMatches : HistoryActivity[],
    characterId : string,
}

interface ITwitchLink {
    name?: string,
    url?: string,
    duration?: string,
}

interface IAdditionalData {
    PCGR           : { [ instanceId: string ] : DestinyPostGameCarnageReportData|undefined },
    membershipData : { [ membership: string ] : UserMembershipData|undefined },
    twitchData     : { [ twitchDisplayName: string ] : ITwitchData|undefined }
    videoData      : { [ instanceId:string ] : { [ membership: string ] : ITwitchLink|undefined }|undefined }
}

interface IDisplayData {
    lastMatches     : HistoryActivity[],
    additionalData  : IAdditionalData,
}

interface ITeams {
    [ teamId: string ] : { twitch: ITwitchLink|undefined, userName: string }[]
}

function reducer(state : IDisplayData, action: { type: "lastMatches"|"additionalData", lastMatches?: HistoryActivity[], additionalData?: IAdditionalData }  ): IDisplayData {
    switch (action.type) {
      case 'lastMatches':
        if ( action.lastMatches ) return { lastMatches: [ ...state.lastMatches, ...action.lastMatches ], additionalData: state.additionalData };
      case 'additionalData':
        if ( action.additionalData ) return { lastMatches: state.lastMatches, additionalData: action.additionalData };
      default:
        throw new Error();
    }
}

export default function CharacterActivities( props: IProps ) {

    const [displayData, setDisplayData] = useReducer(reducer, { lastMatches: props.lastMatches, additionalData: { PCGR: {}, membershipData: {}, twitchData: {}, videoData: {} } });

    const [ page, setPage ]                     = useState<number>( 0 );
    const [ loading, setLoading ]               = useState<boolean>( false );

    const loadMoreGames = async() => {
        setLoading(true);
        let newPage = page+1;
        let newLastMatches = await getHistory( props.membershipType, props.destinyMembershipId, props.characterId, { page: newPage, count: 10, mode: ActivityModeType.AllPvP } );
        setDisplayData({ type: 'lastMatches', lastMatches: newLastMatches });
        setPage( newPage );
    }

    const zeroPad = (num: number, places: number) => String(num).padStart(places, '0')

    const loadPGCR = async () => {
        let newAdditionalData = displayData.additionalData; 

        for ( let activity of displayData.lastMatches ) {
            let instanceId = activity.activityDetails.instanceId;
            let activity_time = new Date( activity.period );
            let all_pcgrs = newAdditionalData.PCGR;

            if ( !all_pcgrs[instanceId] ) {
                all_pcgrs[instanceId] = ( await apiGetPostGameCarnageReport( activity.activityDetails.instanceId ) ).Response;
            }

            let activity_pcgr = all_pcgrs[instanceId];

            for ( let entry of activity_pcgr?.entries || [] ) {
                let all_members = newAdditionalData.membershipData;
                let memberId    = entry.player.destinyUserInfo.membershipId;
                let memberType  = entry.player.destinyUserInfo.membershipType;

                if ( !all_members[ `${memberType}|${memberId}` ] ) {
                    all_members[ `${memberType}|${memberId}` ] = ( await apiGetMembershipDataById( entry.player.destinyUserInfo.membershipType, entry.player.destinyUserInfo.membershipId ) ).Response;
                }

                let entry_membership    = all_members[ `${memberType}|${memberId}` ];
                let twitch_display_name = entry_membership?.bungieNetUser?.twitchDisplayName;
                let all_twitch_data     = newAdditionalData.twitchData;

                

                if ( twitch_display_name ) {
                    if ( !all_twitch_data[ twitch_display_name ] ) {
                        all_twitch_data[ twitch_display_name ] = ( await apiPullTwitchAccount( twitch_display_name ) );
                    }

                    let entry_twitch_data   = all_twitch_data[ twitch_display_name ];
                    let all_video_data      = newAdditionalData.videoData;

                    if ( !all_video_data[ instanceId ] ) all_video_data[ instanceId ] = {};
                    
                    if ( !( all_video_data[ instanceId ] || {} )[ `${memberType}|${memberId}` ] ) {
                        ( all_video_data[ instanceId ] || {} )[ `${memberType}|${memberId}` ] = {};

                        let video = getVideoByTime( entry_twitch_data ? entry_twitch_data.videos : [], activity_time );
                        if ( video ) {
                            let duration = new Date( activity_time.getTime() - ( new Date( video.created_at ) ).getTime() );
                            ( all_video_data[ instanceId ] || {} )[ `${memberType}|${memberId}` ] =  { 
                                name     : twitch_display_name,
                                url      : video.url,
                                duration : duration.getHours()-1 + 'h' + duration.getMinutes() + 'm' + duration.getSeconds() + 's',
                            };
                        }

                    }
                }
            }

            setDisplayData({ type: 'additionalData', additionalData : newAdditionalData });
        }

    }

    const getVideoByTime = ( videos: ITwitchVideo[], activity_time: Date ) => {
        return videos.find( (video) => {
            let from   = new Date( video.created_at );
            let to     = new Date( video.created_at );
            to.setHours( to.getHours() + parseInt( ( video.duration.split('h')[0].match(/[0-9]+$/) || [] )[0] || '0' ) );
            to.setMinutes( to.getMinutes() + parseInt( ( video.duration.split('m')[0].match(/[0-9]+$/) || [] )[0] || '0' ) );
            to.setSeconds( to.getSeconds() + parseInt( ( video.duration.split('s')[0].match(/[0-9]+$/) || [] )[0] || '0' ) );
            return from.getTime() <= activity_time.getTime() && to.getTime() >= activity_time.getTime();
        } );
    }

    const splitToTeams = ( instanceId : string, playerEntries: DestinyPostGameCarnageReportEntry[] ): ITeams => {
        let teams = { 
            '18' : [],
            '19' : [],
        } as ITeams;
        for ( let entry of playerEntries ) {
            let memberId    = entry.player.destinyUserInfo.membershipId;
            let memberType  = entry.player.destinyUserInfo.membershipType;

            let teamid = entry.values.team.basic.value;
            if ( teamid != -1 ) {
                teams[ teamid ].push({
                    twitch   : ( displayData.additionalData.videoData[ instanceId ] || {} )[ `${memberType}|${memberId}` ],
                    userName : entry.player.destinyUserInfo.displayName,
                });
            }
        } 

        return teams;
    }

    useEffect(() => { loadPGCR(); setLoading(false) }, [displayData.lastMatches]);

    return <Table className="activity-table" style={{ fontSize: '12px' }} striped>
        <thead>
            <tr>
                <th style={{ width: '14%' }}>Date</th>
                <th style={{ width: '17%' }}>Mode - Map</th>
                <th style={{ width: '8%' }}>Kills</th>
                <th style={{ width: '11%' }}>Deaths</th>
                <th style={{ width: '8%' }}>K/D</th>
                <th style={{ width: '21%' }}>Alpha</th>
                <th style={{ width: '21%' }}>Bravo</th>
            </tr>
        </thead>
        <tbody>
            { displayData.lastMatches ? displayData.lastMatches.map( (activity, idx) => {
                let instance_id = activity.activityDetails.instanceId;
                let activity_pcgr   = displayData.additionalData.PCGR[ instance_id ];
                let playerEntries   = activity_pcgr?.entries || [];

                let teams = splitToTeams( instance_id, playerEntries );

                let image = props.manifest.DestinyActivityDefinition[ activity.activityDetails.referenceId ].pgcrImage;
                let values =  activity.values || {};
                let date = new Date( activity.period );

                return ( <tr key={ activity.activityDetails.instanceId + '_' + idx } className="activity-tr" style={{ background: 'linear-gradient( rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7) ), url("https://www.bungie.net/' + image + '")' }}>
                    <td className="activity-td">
                        <div>{ zeroPad( date.getFullYear(), 4 ) }-{ zeroPad( date.getMonth(), 2 ) }-{ zeroPad( date.getDate(), 2 ) }</div>
                        <div>{ zeroPad( date.getHours(), 2 ) }:{ zeroPad( date.getMinutes(), 2 ) }:{ zeroPad( date.getSeconds(), 2 ) }</div>
                        <div>
                            <span style={{
                                marginTop: '8px',
                                marginLeft: '5px',
                                height: '20px',
                                width: '20px',
                                backgroundColor: values.standing.basic.value == 0 ? '#00e676' : '#ff3d00',
                                borderRadius: '50%',
                                display: 'inline-block',
                            }}></span>
                        </div>
                    </td>
                    <td className="activity-td">
                        <div>{ props.manifest.DestinyActivityDefinition[ activity.activityDetails.directorActivityHash ].displayProperties.name }</div>
                        <div>{ props.manifest.DestinyActivityDefinition[ activity.activityDetails.referenceId ].displayProperties.name }</div>
                    </td>
                    <td className="activity-td">{ values?.kills?.basic?.value }</td>
                    <td className="activity-td">{ values?.deaths?.basic?.value }</td>
                    <td className="activity-td">{ ( ( values?.kills?.basic?.value || 0 ) / ( values?.deaths?.basic?.value || 1 ) ).toFixed(2) }</td>
                        { ( Object.keys(teams) ).map( (teamId, idx) => {
                            let team = teams[ teamId ] || [];
                            return <td key={teamId + '_' + idx} className="activity-td"> 
                                <div className="player-entries" >
                                    { playerEntries.length <= 0 ? <Loader
                                        type="Puff"
                                        color="#00BFFF"
                                        height={15}
                                        width={15}
                                    /> : null }
                                    { team.map( (data, idx) => 
                                        <div key={ data?.twitch?.name + '_' + idx }>
                                            { data?.twitch?.url 
                                                ? <a  
                                                    style={{ 
                                                        color : data?.twitch?.url ? '#F0F' : '#FFF',
                                                        textDecoration: 'none',  
                                                    }} 
                                                    target="_blank" rel="noreferrer" href={ data.twitch.url ? data.twitch.url + '?t=' + data.twitch.duration : "#" }
                                                >
                                                    { data?.userName } ( { data.twitch.name } )
                                                </a>
                                                : data?.userName
                                            }
                                        </div>
                                    ) } 
                                </div>
                            </td>
                        } ) }
                </tr> )
            }) : null}
            <tr>
                <td style={{ cursor:'pointer' }} colSpan={7} onClick={loadMoreGames}>
                    <label style={{ float: 'left', marginRight: '10px', cursor:'pointer' }}>more...</label>
                    { loading ? <Loader
                        type="Puff"
                        color="#00BFFF"
                        height={15}
                        width={15}
                    /> : null }
                </td>
            </tr>
        </tbody>
    </Table>
}
