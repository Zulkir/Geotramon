import {
    CoordinateType, IPackageEventInfo,
    IPipeInfo,
    ISiteInfo,
    ISpatialNodeInfo,
    ISpatialNodeTransformInfo,
    ISpatialNodeVisualInfo, PipeType
} from '../shared/dataInfo';
import {ITransform, IVector3, PointListInterpolationType} from '../shared/algebra';
import {CesiumTransform} from './cesiumTransform';
import {ICartographicPosition} from '../shared/positioning';

export interface IVisualElement extends ISpatialNodeVisualInfo {

}

export interface ISpatialNodeTransform extends ISpatialNodeTransformInfo {
    readonly absolute: ITransform;
}

export interface ISpatialNode {
    readonly id: number;
    readonly name: string;
    readonly transform: ISpatialNodeTransform;
    readonly expandDistance: number;
    readonly detailsOnRequest: boolean;
    readonly children: ReadonlyArray<ISpatialNode>;
    readonly site?: ISite;
    readonly pipes: ReadonlyArray<IPipe>;
    readonly collapsedVisuals: ReadonlyArray<IVisualElement>;
    readonly expandedVisuals: ReadonlyArray<IVisualElement>;
    readonly customProps: any;

    readonly parent?: ISpatialNode;
}

export interface ISite {
    readonly name: string;
    readonly description?: string;
    readonly customProps: any;
}

export interface IGeoPathComponent {
    readonly node: ISpatialNode,
    readonly points: ReadonlyArray<IVector3>
}

export interface IGeoPath {
    readonly interpolationType: PointListInterpolationType,
    readonly components: ReadonlyArray<IGeoPathComponent>
}

export enum PipeDirection {
    Forward,
    Backward
}

export interface IPipe {
    readonly from: ISpatialNode;
    readonly to: ISpatialNode;
    readonly biDirectional: boolean;
    readonly width: number;
    readonly type: PipeType;
    readonly explicitPath?: IGeoPath;
    readonly customProps: any;
}

export interface IPackage {
    readonly id: number;
    readonly name: string;
    readonly description?: string;
    readonly customProps: any;
    readonly events: ReadonlyArray<IPackageEventInfo>;
}

export interface IFilter<T> {
    (obj: T): boolean;
}

export interface IVisualizerObjectCollection<T> {
    readonly filters: IFilter<T>[];
    query(filter?: IFilter<T>) : T[];
    select(filter: IFilter<T>) : void;
    navigateTo(obj: T) : void;
}

export class VisualizerObjectCollectionImpl<T> implements IVisualizerObjectCollection<T> {
    readonly objects: T[];
    readonly filters: IFilter<T>[];

    constructor() {
        this.objects = [];
        this.filters = [];
    }

    query(filter?: IFilter<T>): T[] {
        return filter !== undefined
            ? this.objects.filter(x => filter(x))
            : this.objects.slice();
    }

    select(filter: IFilter<T>): void {
        throw "Not Implemented";
    }

    navigateTo(obj: T): void {
        throw "Not Implemented";
    }

    reset(){
        this.objects.length = 0;
        this.filters.length = 0;
    }

    push(obj: T) {
        this.objects.push(obj);
    }
}

export interface ITransportVisualizer {
    spatialNodes: IVisualizerObjectCollection<ISpatialNode>;
    sites: IVisualizerObjectCollection<ISite>;
    pipes: IVisualizerObjectCollection<IPipe>;
    packages: IVisualizerObjectCollection<IPackage>;

    selectPackage(filter: (pckg: IPackage) => boolean) : void;
    registerCustomVisual(name: string, visual: ISpatialNodeVisualInfo): void;
    findClosestNode(position: ISpatialNodeTransformInfo): ISpatialNode;
    findPath(fromNodeId: number, toNodeId: number): IGeoPath | null;
}

export class SpatialNode implements ISpatialNode {
    readonly id: number;
    readonly name: string;
    readonly transform: ISpatialNodeTransform;
    readonly expandDistance: number;
    readonly detailsOnRequest: boolean;

    readonly parent?: ISpatialNode;
    readonly children: ReadonlyArray<ISpatialNode>;
    readonly site?: ISite;
    readonly pipes: ReadonlyArray<IPipe>;
    readonly collapsedVisuals: ReadonlyArray<IVisualElement>;
    readonly expandedVisuals: ReadonlyArray<IVisualElement>;
    readonly customProps: any;

    constructor(parent: ISpatialNode | undefined, info: ISpatialNodeInfo) {
        this.id = info.id;
        this.name = info.name;
        this.expandDistance = info.expandDistance;
        this.detailsOnRequest = info.detailsOnRequest;

        this.parent = parent;
        const parentTransform = parent ? parent.transform : undefined;
        this.transform = SpatialNode.buildTransform(parentTransform, info.transform);

        this.children = info.children.map(x => new SpatialNode(this, x));

        this.site = info.site ? {
            name: info.site.name,
            description: info.site.description,
            customProps: {...info.site.customProps}
        } : undefined;

        const pipes: IPipe[] = [];
        for (let pipeInfo of info.pipes) {
            const resolvingIds: number[] = [];
            resolvingIds.push(pipeInfo.fromNodeId);
            resolvingIds.push(pipeInfo.toNodeId);
            if (pipeInfo.explicitPath) {
                for (let pathComponentInfo of pipeInfo.explicitPath.components) {
                    resolvingIds.push(pathComponentInfo.nodeId);
                }
            }

            const resolvedNodes: ISpatialNode[] = [];
            let badPipe = false;
            for (let id of resolvingIds) {
                const node = findNodeWithId(this, id);
                if (!node)
                {
                    console.error(`Pipe or its path refers to a non-existing node with id ${id}`);
                    badPipe = true;
                    break;
                }
                resolvedNodes[id] = node;
            }

            if (badPipe)
                continue;

            const explicitPath = pipeInfo.explicitPath ? {
                interpolationType: pipeInfo.explicitPath.interpolationType,
                components: pipeInfo.explicitPath.components.map(x => ({
                    node: resolvedNodes[x.nodeId],
                    points: x.points
                }))
            } : undefined;

            pipes.push({
                from: resolvedNodes[pipeInfo.fromNodeId],
                to: resolvedNodes[pipeInfo.toNodeId],
                biDirectional: pipeInfo.biDirectional,
                width: pipeInfo.width,
                type: pipeInfo.type,
                explicitPath: explicitPath,
                customProps: pipeInfo.customProps
            });
        }
        this.pipes = pipes;

        // TODO: validate all fields
        this.collapsedVisuals = info.collapsedVisuals;
        this.expandedVisuals = info.expandedVisuals;
        this.customProps = info.customProps;
    }

    private static buildTransform(parentTransform: ISpatialNodeTransform | undefined, info: ISpatialNodeTransformInfo) : ISpatialNodeTransform {
        const absoluteParentTransform = parentTransform ? parentTransform.absolute : CesiumTransform.identity();
        switch (info.coordinateType) {
            case CoordinateType.Cartographic: {
                if (info.relative) {
                    console.error("Cartographic transform cannot be relative. Interpreting as absolute.");
                }
                // todo: validate type assertion or make into discriminated union
                const cartoPosition = <ICartographicPosition>info.position;
                const absPosition = Cesium.Cartesian3.fromDegrees(cartoPosition.longitude, cartoPosition.latitude, cartoPosition.height);
                const defaultAbsTransform = CesiumTransform.eastNorthUp(absPosition);
                return {
                    ...info,
                    relative: true,
                    absolute: CesiumTransform.combine(new CesiumTransform(1, info.rotation), defaultAbsTransform)
                };
            }
            case CoordinateType.Cartesian: {
                // todo: validate type assertion or make into discriminated union
                const ownTransform = new CesiumTransform(1, info.rotation, <IVector3>info.position);
                const absoluteTransform = info.relative
                    ? CesiumTransform.combine(ownTransform, absoluteParentTransform)
                    : ownTransform;
                return {
                    ...info,
                    absolute: absoluteTransform
                };
            }
            default: {
                console.error(`Unknown CoordinateType ${info.coordinateType}`);
                return {
                    ...info,
                    absolute: CesiumTransform.identity()
                }
            }
        }
    }
}

export function findNodeWithId(subtreeRoot: ISpatialNode, id: number) : ISpatialNode | undefined {
    if (subtreeRoot.id == id)
        return subtreeRoot;
    for (let child of subtreeRoot.children) {
        const childWithId = findNodeWithId(child, id);
        if (childWithId)
            return childWithId;
    }
    return undefined;
}