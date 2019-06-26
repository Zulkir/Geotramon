import {IDataProvider, IMetaInfo, ISubscriptionToken} from '../../shared/dataProvider';
import {ISpatialNodeTransformInfo, ISpatialNodeVisualInfo} from '../../shared/dataInfo';
import {
    IFilter,
    IGeoPath,
    IPackage,
    IPipe,
    ISite,
    ISpatialNode,
    ITransportVisualizer,
    IVisualizerObjectCollection,
    SpatialNode,
    VisualizerObjectCollectionImpl
} from '../transportVisualizer';
import {CesiumSpatialNodeVisualizer} from './cesiumSpatialNodeVisualizer';
import {CesiumPipeVisualizer} from './cesiumPipeVisualizer';
import {CesiumPackageVisualizer} from './cesiumPackageVisualizer';
import {IntDictionary} from '../../shared/codingUtilities';


export class CesiumSpatialNodeCollection implements IVisualizerObjectCollection<ISpatialNode> {
    readonly filters: IFilter<ISpatialNode>[];

    select(filter: IFilter<ISpatialNode>): void {
    }

    query(filter?: IFilter<ISpatialNode>): ISpatialNode[] {
        return [];
    }

    navigateTo(obj: ISpatialNode): void {
    }

    reset() {

    }
}

class UnorderedIntPairDictionary<T> {
    private readonly internalDict: {
        [keyString: string]: T | undefined;
    };

    constructor() {
        this.internalDict = {};
    }

    static toKey(x: number, y: number): string {
        return x <= y
            ? `${x}_${y}`
            : `${y}_${x}`;
    }

    get(x: number, y: number): T | undefined {
        const key = UnorderedIntPairDictionary.toKey(x, y);
        return this.internalDict[key];
    }

    set(x: number, y: number, value: T | undefined) {
        const key = UnorderedIntPairDictionary.toKey(x, y);
        this.internalDict[key] = value;
    }
}

export class CesiumTransportVisualizer implements ITransportVisualizer {
    private readonly viewer: Cesium.Viewer;
    private dataProvider?: IDataProvider;
    private subscriptionToken?: ISubscriptionToken;

    private meta: IMetaInfo;
    private rootNode: SpatialNode;

    private nodesById: IntDictionary<ISpatialNode>;
    private pipesByEndIds: UnorderedIntPairDictionary<IPipe>;

    public readonly spatialNodes: CesiumSpatialNodeCollection;
    public readonly sites: IVisualizerObjectCollection<ISite>;
    public readonly pipes: IVisualizerObjectCollection<IPipe>;
    public readonly packages: IVisualizerObjectCollection<IPackage>;

    private readonly nodeVisualizer: CesiumSpatialNodeVisualizer;
    private readonly pipeVisualizer: CesiumPipeVisualizer;
    private readonly packageVisualizer: CesiumPackageVisualizer;

    public constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer;
        this.initializedGlobalViewerProps();
        this.spatialNodes = new VisualizerObjectCollectionImpl<ISpatialNode>();
        this.sites = new VisualizerObjectCollectionImpl<ISite>();
        this.pipes = new VisualizerObjectCollectionImpl<IPipe>();
        this.packages = new VisualizerObjectCollectionImpl<IPackage>();
        this.nodeVisualizer = new CesiumSpatialNodeVisualizer(viewer);
        this.pipeVisualizer = new CesiumPipeVisualizer(viewer);
        this.packageVisualizer = new CesiumPackageVisualizer(viewer);
    }

    public async bind(dataProvider: IDataProvider) {
        if (this.dataProvider && this.subscriptionToken)
            this.dataProvider.unsubscribe(this.subscriptionToken);

        this.dataProvider = dataProvider;
        // TODO
        //this.spatialNodes.reset();
        //this.sites.reset();
        //this.pipes.reset();
        //this.packages.reset();

        this.nodesById = {};
        this.pipesByEndIds = new UnorderedIntPairDictionary<IPipe>();

        this.meta = await dataProvider.getMeta();
        this.bindTime(this.meta.startTime, this.meta.endTime);
        const rootNodeInfo = await dataProvider.getSpatialSubtree(this.meta.rootNodeId);
        this.rootNode = new SpatialNode(undefined, rootNodeInfo);

        this.updateIndices(this.rootNode);

        this.nodeVisualizer.reset();
        this.pipeVisualizer.reset();
        this.packageVisualizer.reset();
        this.nodeVisualizer.addSubtree(this.rootNode);
        this.pipeVisualizer.addSubtree(this.rootNode);
        this.packageVisualizer.prepareForEvents({
            meta: this.meta,
            nodesById: this.nodesById,
            getPipe: (x, y) => this.pipesByEndIds.get(x, y)
        });

        this.subscriptionToken = this.dataProvider.subscribe(e => this.packageVisualizer.onEvent(e));
    }

    private initializedGlobalViewerProps() {
        (this.viewer as any).infoBox.frame.sandbox += " allow-scripts";
        (parent as any).GtmVisualizer = this;
    }

    private bindTime(startTime: Date, endTime: Date) {
        //Set bounds of our simulation time
        const start = Cesium.JulianDate.fromDate(startTime);
        const stop = Cesium.JulianDate.fromDate(endTime);

        //Make sure viewer is at the desired time.
        this.viewer.clock.startTime = start.clone();
        this.viewer.clock.stopTime = stop.clone();
        this.viewer.clock.currentTime = start.clone();
        this.viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; //Loop at the end
        this.viewer.clock.multiplier = 1;
        this.viewer.clock.shouldAnimate = true;

        //Set timeline to simulation bounds
        this.viewer.timeline.zoomTo(start, stop);
    }

    private updateIndices(subtreeRoot: SpatialNode) {
        this.nodesById[subtreeRoot.id] = subtreeRoot;
        for (let pipe of subtreeRoot.pipes)
            this.pipesByEndIds.set(pipe.from.id, pipe.to.id, pipe);
        // TODO: other indices
        for (let child of subtreeRoot.children)
            this.updateIndices(child);
    }

    public selectPackage(filter: (pckg: IPackage) => boolean) {
        const filteredPackages = this.packageVisualizer.getAllPackages().filter(filter);
        this.viewer.selectedEntity = filteredPackages.length > 0
            ? this.packageVisualizer.getEntity(filteredPackages[0].id)
            : <any>undefined;
    }

    public findClosestNode(position: ISpatialNodeTransformInfo): ISpatialNode {
        throw "Not Implemented";
    }

    public findPath(fromNodeId: number, toNodeId: number): IGeoPath | null {
        throw "Not Implemented";
    }

    public registerCustomVisual(name: string, visual: ISpatialNodeVisualInfo): void {
        throw "Not Implemented";
    }
}