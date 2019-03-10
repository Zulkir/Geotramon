import {IColor, IMatrix3, ITransform, IVector3, PointListInterpolationType} from './algebra';
import {ICartographicPosition} from './positioning';
import {IVisualElement} from '../client/transportVisualizer';

// ====== Site =======

export interface ISiteInfo {
    readonly name: string;
    readonly description?: string;
    readonly customProps: any;
}

// ====== GeoPathInfo ======

export interface IGeoPathComponentInfo {
    nodeId: number;
    points: IVector3[];
}

export interface IGeoPathInfo {
    interpolationType: PointListInterpolationType;
    components: IGeoPathComponentInfo[];
}

// ====== Pipe =======

export enum PipeType {
    Arc = "ARC",
    Line = "LINE",
    Explicit = "EXPLICIT"
}

export interface IPipeInfo {
    readonly fromNodeId: number;
    readonly toNodeId: number;
    readonly biDirectional: boolean;
    readonly width: number;
    readonly type: PipeType;
    readonly explicitPath?: IGeoPathInfo;
    readonly customProps: any;
}

// ====== SpatialNode =======

export enum CoordinateType {
    Cartographic = "CARTOGRAPHIC",
    Cartesian = "CARTESIAN"
}

export interface ISpatialNodeTransformInfo {
    readonly relative: boolean;
    readonly coordinateType: CoordinateType;
    readonly rotation: IMatrix3;
    readonly position: ICartographicPosition | IVector3;
}

export interface ISpatialNodeInfo {
    readonly id: number;
    readonly name: string;
    readonly transform: ISpatialNodeTransformInfo;
    readonly expandDistance: number;
    readonly detailsOnRequest: boolean;
    readonly children: ISpatialNodeInfo[];
    readonly site?: ISiteInfo;
    readonly pipes: IPipeInfo[];
    readonly collapsedVisuals: ISpatialNodeVisualInfo[];
    readonly expandedVisuals: ISpatialNodeVisualInfo[];
    readonly customProps: {};
}

export interface IVisualInfo {
    readonly model?: {
        readonly uri: string,
        readonly scale?: number,
        readonly minimumPixelSize?: number,
        readonly maximumScale?: number,
        readonly color?: IColor;
        readonly silhouetteColor?: IColor;
        readonly silhouetteSize?: number;
    }
    readonly billboard?: {
        readonly color?: IColor,
        readonly image: string,
        readonly width: number,
        readonly height: number,
        readonly eyeOffset: IVector3
    },
    readonly box?: {
        readonly heightReference: number,
        readonly dimensions: IVector3,
    },
    readonly wall?: {
        readonly height: number,
        readonly points: IVector3[],
        readonly color: IColor
    }
    readonly polygon?: {
        readonly height: number,
        readonly points: IVector3[],
        readonly color: IColor
    }
}

export interface ISpatialNodeVisualInfo extends IVisualInfo {
    readonly transform?: ITransform,
}

// ====== Package ======

export interface IPackageInfo {
    name: string;
    description?: string;
    visual: IVisualInfo;
    customProps: any;
}

export enum PackagePositionInfoType {
    ParentPackage = "PARENT_PACKAGE",
    Site = "SITE",
    Pipe = "PIPE",
    Absolute = "ABSOLUTE"
}

export interface IPackagePositionInfo {
    readonly type: PackagePositionInfoType;
}

export interface IParentPackagePackagePositionInfo extends IPackagePositionInfo {
    readonly type: PackagePositionInfoType.ParentPackage;
    readonly parentPackageId: number;
}

export interface ISitePackagePositionInfo extends IPackagePositionInfo {
    readonly type: PackagePositionInfoType.Site;
    readonly siteNodeId: number;
}

export interface IPipePackagePositionInfo extends IPackagePositionInfo {
    readonly type: PackagePositionInfoType.Pipe;
    readonly fromSiteNodeId: number;
    readonly toSiteNodeId: number;
    readonly interpolationAmount: number;
}

export interface IAbsolutePackagePositionInfo extends IPackagePositionInfo {
    readonly type: PackagePositionInfoType.Absolute;
    readonly carto: ICartographicPosition;
}

// ====== Event =======

export interface IEventInfo {
    readonly genericEventType: GenericEventType;
    readonly time: Date;
}

export enum GenericEventType {
    Package = "PACKAGE"
}

export interface IPackageEventInfo extends IEventInfo {
    readonly genericEventType: GenericEventType.Package;
    readonly packageEventType: PackageEventType;
    readonly packageId: number;
}

export enum PackageEventType {
    Created = "CREATED",
    InfoModified = "INFO_MODIFIED",
    Moved = "MOVED",
    Destroyed = "DESTROYED",
}

export interface IPackageCreatedEventInfo extends IPackageEventInfo {
    readonly packageEventType: PackageEventType.Created;
    readonly package: IPackageInfo;
}

export interface IPackageMovedEventInfo extends IPackageEventInfo  {
    readonly packageEventType: PackageEventType.Moved;
    readonly newPosition: IPackagePositionInfo;
}

export interface IPackageDestroyedEventInfo extends IPackageEventInfo {
    readonly packageEventType: PackageEventType.Destroyed;
}
