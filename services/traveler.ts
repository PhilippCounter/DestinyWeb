import {
    BungieMembershipType,
    ServerResponse,
    getProfile,
    HttpClientConfig, 
    DestinyProfileResponse,
    DestinyCharacterComponent,
    DestinyProfileComponent,
    searchDestinyPlayer,
    getActivityHistory,
    DestinyActivityHistoryResults,
    GetActivityHistoryParams,
    DestinyHistoricalStatsPeriodGroup,
    getPostGameCarnageReport,
    DestinyPostGameCarnageReportData,
    getDestinyManifest,
    getDestinyManifestSlice,
    DestinyManifestSlice,
    getHistoricalStatsForAccount,
    DestinyHistoricalStatsAccountResult,
    getHistoricalStats,
    DestinyHistoricalStatsByPeriod
} from 'bungie-api-ts/destiny2';

import { 
    searchByGlobalNamePrefix,
    UserSearchResponse,
    UserSearchResponseDetail,
    UserInfoCard,
    getMembershipDataById,
    UserMembershipData
} from 'bungie-api-ts/user';

import { 
    ComponentType, 
    ActivityModeType, 
    MembershipType,
    PeriodType
} from '../services/bungieEnum';

import axios, { AxiosPromise } from 'axios';
import { apiSecret } from './apiSecret';

export const baseUrl = typeof Window === 'undefined' ? process.env.baseUrl ? process.env.baseUrl : 'http://localhost:3000' : '';

async function $http(config: HttpClientConfig): Promise<AxiosPromise> {

    if ( typeof window !== 'undefined' ) {
        return (await axios({
            method: 'POST',
            url: baseUrl + '/api/bungie',
            data: { 
                bungie_url: config.url,
                bungie_method: config.method,
                bungie_params: config.params,
            },
        }) ).data;
    }

    return (await axios({
        method: config.method,
        url: config.url,
        params: config.params,
        headers: { 'X-API-Key' : apiSecret }
    }) ).data;


}

export const apiGetProfile = ( membershipType: BungieMembershipType, destinyMembershipId: string ): Promise<ServerResponse<DestinyProfileResponse>> => {
    return getProfile( $http, {
        membershipType,
        destinyMembershipId,
        components          : [ 
            ComponentType.Profiles,
            ComponentType.Characters,
        ],
    } );
}

interface IHistoryParams {
    count? : GetActivityHistoryParams['count'],
    mode?  : GetActivityHistoryParams['mode'],
    page?  : GetActivityHistoryParams['page'],
}

export const apiGetActivityHistory = ( membershipType: BungieMembershipType, destinyMembershipId: string, characterId: string, params: IHistoryParams ): Promise<ServerResponse<DestinyActivityHistoryResults>> => {
    return getActivityHistory( $http, {
        membershipType,
        destinyMembershipId,
        characterId,
        ...params
    } );
}

export const apiGetDestinyProfile = ( displayName: string ): Promise<ServerResponse<UserInfoCard[]>> => {
    return searchDestinyPlayer( $http, {
        displayName,
        membershipType : MembershipType.All,
    } );
}

export const apiGetBungieProfile = ( displayNamePrefix: string ): Promise<ServerResponse<UserSearchResponse>> => {
    return searchByGlobalNamePrefix( $http, {
        displayNamePrefix,
        page : 0,
    } );
}

export const apiGetPostGameCarnageReport = ( activityId: string ): Promise<ServerResponse<DestinyPostGameCarnageReportData>> => {
    return getPostGameCarnageReport( $http, {
        activityId
    } );
}

export const apiGetDestinyManifest = async ( ): Promise<DestinyManifestSlice<("DestinyActivityDefinition" | "DestinyClassDefinition")[]>> => {
    const destinyManifest = ( await getDestinyManifest($http) ).Response;
    return getDestinyManifestSlice( $http, {
        destinyManifest,
        tableNames      : [ 'DestinyActivityDefinition', 'DestinyClassDefinition' ],
        language        : 'en',
    } );
}

export const apiGetMembershipDataById = ( membershipType: BungieMembershipType, membershipId: string ): Promise<ServerResponse<UserMembershipData>> => {
    return getMembershipDataById( $http, {
        membershipId,
        membershipType
    } );
}

export const apiGetHistoricalStatsForAccount = ( membershipType: BungieMembershipType, destinyMembershipId: string ): Promise<ServerResponse<DestinyHistoricalStatsAccountResult>> => {
    return getHistoricalStatsForAccount( $http, {
        destinyMembershipId,
        membershipType,
    } );
}

function toDateTime ( date: Date ) {
    return date.toISOString().slice(0, 19).replace('T', ' ')
}

export const apiGetHistoricalStats = ( membershipType: BungieMembershipType, destinyMembershipId: string, characterId: string ): Promise<ServerResponse<{ [mode: string]: DestinyHistoricalStatsByPeriod }>> => {
    let end_date    = new Date();
    let start_date  = new Date();
    
    start_date.setDate( start_date.getDate() - 31 );

    return getHistoricalStats( $http, {
        destinyMembershipId,
        membershipType,
        characterId,
        periodType : PeriodType.Daily,
        dayend : toDateTime( end_date ),
        daystart : toDateTime( start_date ),
    } );
}




export const storeDestinyManifest = async ( fs: any ): Promise<void> => {
    let manifest = await apiGetDestinyManifest();
    fs.writeFileSync( 'data/manifest.json', JSON.stringify( manifest ) );
}

export const pullDestinyManifest = async ( fs: any ): Promise<DestinyManifestSlice<("DestinyActivityDefinition" | "DestinyClassDefinition")[]>> => {
    let file = fs.readFileSync( 'data/manifest.json', 'utf8' );
    return JSON.parse( file );
}

export const apiPullDestinyManifest = async ( ): Promise<DestinyManifestSlice<("DestinyActivityDefinition" | "DestinyClassDefinition")[]>> => {
    return (await axios({
        method: 'GET',
        url: baseUrl + '/api/manifest',
    }) ).data;
}

interface ITwitchUser {
    id: string,
    login: string,
    display_name: string,
    type: string,
    broadcaster_type: string,
    description: string,
    profile_image_url: string,
    offline_image_url: string,
    view_count: number,
    created_at: string,
}

export interface ITwitchVideo {
    id: string,
    stream_id: string,
    user_id: string,
    user_login: string,
    user_name:string,
    title: string,
    description: string,
    created_at: string,
    published_at: string,
    url: string,
    thumbnail_url: string,
    viewable: string,
    view_count: number,
    language: string,
    type: string,
    duration: string,
}

export interface ITwitchData {
    user: ITwitchUser|{ display_name?: undefined },
    videos: ITwitchVideo[],
}

export const apiPullTwitchAccount = async ( account_name: string ): Promise<ITwitchData> => {
    return (await axios({
        method: 'GET',
        url: baseUrl + '/api/twitch/' + account_name,
    }) ).data;
}

export interface DestinyUserSearchResponseDetail extends UserSearchResponseDetail {
    characters? : { [ characterId: string ] : DestinyCharacterComponent },
    profile?    : DestinyProfileComponent, 
}

export const getPlayersByName = async ( playerName: string ): Promise<DestinyUserSearchResponseDetail[]> => {
    const profileResponse = ( await apiGetBungieProfile( playerName.replace('#', '%23') ) ).Response;
    const searchResults = profileResponse.searchResults as DestinyUserSearchResponseDetail[];

    for ( let profile of searchResults ) {
        const destinyProfileResponse = ( await apiGetProfile( profile.destinyMemberships[0].membershipType, profile.destinyMemberships[0].membershipId ) ).Response;
        profile['characters']   = destinyProfileResponse.characters.data;
        profile['profile']      = destinyProfileResponse.profile.data;
    }
    
    return searchResults;
}

export interface DestinyProfileData extends DestinyProfileResponse {
    lastMatches? : { [ characterId: string ] : HistoryActivity[] },
    accountStats : DestinyHistoricalStatsAccountResult,
    characterStats : { [ characterId: string ] : { [mode: string]: DestinyHistoricalStatsByPeriod } }
}


export const getPlayerMembership = async ( destinyMembershipType: BungieMembershipType, destinyMembershipId: string ): Promise<DestinyProfileData> => {

    const profile = ( await apiGetProfile( destinyMembershipType, destinyMembershipId ) ).Response as DestinyProfileData;

    profile['lastMatches'] = {};
    profile['characterStats'] = {};
    if ( profile.characters && profile.characters.data ) {
        
        for ( let characterId of Object.keys( profile.characters.data ) ) {
            let charData = profile.characters.data;
            if ( !charData ) continue;

            let character = charData[characterId];
            profile['characterStats'][characterId] = ( await apiGetHistoricalStats( character.membershipType, character.membershipId, characterId ) ).Response;
            profile['lastMatches'][characterId] = await getHistory( character.membershipType, character.membershipId, characterId, { page: 0, count: 10, mode: ActivityModeType.AllPvP } );

        }
    }

    // profile['accountStats'] = ( await apiGetHistoricalStatsForAccount( profile.membershipType, profile.membershipId ) ).Response;

    return profile;
}

export interface HistoryActivity extends DestinyHistoricalStatsPeriodGroup {
    PCGR?   : DestinyPostGameCarnageReportData,
    twitch? : { [ membershipId: string ] : string }, 
}

export const getHistory = async ( membershipType: BungieMembershipType|undefined, destinyMembershipId: string|undefined, characterId: string, params: IHistoryParams ): Promise<DestinyHistoricalStatsPeriodGroup[]> => {
    if ( !membershipType || !destinyMembershipId ) return [];
    const activityResponse = ( await apiGetActivityHistory( membershipType,destinyMembershipId, characterId, params ) ).Response; 
    return activityResponse.activities as HistoryActivity[];
}