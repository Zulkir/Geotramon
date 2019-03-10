import {IEventInfo, ISpatialNodeInfo} from './dataInfo';

export interface IMetaInfo {
    readonly rootNodeId: number;
    readonly startTime: Date;
    readonly endTime: Date;
}

export type EventCallback = (event: IEventInfo) => void;

export interface ISubscriptionToken {
    // todo
}

export interface IDataProvider {
    getMeta() : Promise<IMetaInfo>;
    getSpatialSubtree(rootId: number) : Promise<ISpatialNodeInfo>;
    subscribe(onEvent : EventCallback) : ISubscriptionToken;
    unsubscribe(token: ISubscriptionToken) : void;
}