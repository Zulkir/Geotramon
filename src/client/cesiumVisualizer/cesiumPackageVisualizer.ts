import {IPackage, IPipe, ISpatialNode, PipeDirection} from '../transportVisualizer';
import {cesiumVector3} from '../cesiumConverters';
import {
    GenericEventType,
    IAbsolutePackagePositionInfo,
    IEventInfo,
    IPackageCreatedEventInfo,
    IPackageEventInfo,
    IPackageMovedEventInfo,
    IParentPackagePackagePositionInfo,
    IPipePackagePositionInfo,
    ISitePackagePositionInfo,
    PackageEventType,
    PackagePositionInfoType
} from '../../shared/dataInfo';
import {multiHermiteLerp} from '../../shared/algebra';
import {IMetaInfo} from '../../shared/dataProvider';
import {
    IntDictionary,
    IntDictionaryMethods,
    NaiveSetMethods,
    ReadOnlyIntDictionary
} from '../../shared/codingUtilities';
import {getDefaultPipePoints} from './cesiumPipeSplines';
import Entity = Cesium.Entity;
import Viewer = Cesium.Viewer;
import JulianDate = Cesium.JulianDate;
import Cartesian3 = Cesium.Cartesian3;

interface PackageCache extends IPackage {
    id: number;
    name: string;
    description?: string;
    events: IPackageEventInfo[];
    entity: Entity;
    samples: Array<{time: number, pos: Cartesian3}>;
}

interface Data {
    startTime: JulianDate,
    nodesById: ReadOnlyIntDictionary<ISpatialNode>,
    getPipe: (fromId: number, toId: number) => IPipe | undefined,
    dependencies: IntDictionary<number[]>;

    // todo: remove
    getCacheById: (packageId: number) => PackageCache;
}

export class CesiumPackageVisualizer {
    private readonly viewer: Viewer;
    private packageCachesById: {[id:number]:PackageCache};
    private data?: Data;

    public constructor(viewer: Viewer) {
        this.viewer = viewer;
        this.packageCachesById = {};
    }

    private getCache(id: number): PackageCache {
        if (this.packageCachesById[id])
            return this.packageCachesById[id];
        let entity = this.viewer.entities.add(new Entity());
        const cache : PackageCache = {
            id: id,
            name: "",
            description: "",
            events: [],
            customProps: {},
            entity: entity,
            samples: []
        };
        this.packageCachesById[id] = cache;
        return cache;
    }

    public getAllPackages() : ReadonlyArray<IPackage> {
        return Object.keys(this.packageCachesById).map(x => this.packageCachesById[<number><any>x]);
    }

    public getEntity(packageId: number) : Entity | undefined {
        const cache = this.getCache(packageId);
        return cache ? cache.entity : undefined;
    }

    public reset() {
        for (let id in this.packageCachesById)
            this.viewer.entities.remove(this.packageCachesById[id].entity);
        this.packageCachesById = {};
        this.data = undefined;
    }

    public prepareForEvents(data: {
        meta: IMetaInfo,
        nodesById: ReadOnlyIntDictionary<ISpatialNode>,
        getPipe: (fromId: number, toId: number) => IPipe | undefined
    }) {
        this.data = {
            startTime: JulianDate.fromDate(data.meta.startTime),
            nodesById: data.nodesById,
            getPipe: data.getPipe,
            dependencies: {},
            getCacheById: x => this.packageCachesById[x]
        };
    }

    public onEvent(event: IEventInfo) {
        if (!this.data)
            throw "prepareForEvents() must be called before calling onEvent().";
        if (event.genericEventType != GenericEventType.Package)
            return;
        const pevent = <IPackageEventInfo>event;
        const packageId = pevent.packageId;
        const cache = this.getCache(packageId);
        CesiumPackageVisualizer.insertEvent(cache.events, pevent);
        CesiumPackageVisualizer.updateCache(this.data, cache);
        // TODO: reconsider
        //const dependencies = this.data.dependencies[packageId];
        //if (dependencies)
        //    for (let dependency of dependencies)
        //        CesiumPackageVisualizer.updateCache(this.data, this.getCache(dependency));
    }

    private static insertEvent(events: IEventInfo[], event: IEventInfo) {
        for (let i = 0; i < events.length; i++) {
            if (event.time < events[i].time) {
                events.splice(i, 0, event);
                return;
            }
        }
        events.push(event);
    }

    // TODO: to non-static
    private static updateCache(data: Data, cache: PackageCache) {
        const packageId = cache.id;
        const entity = cache.entity;
        const events = cache.events;

        function toTotalSeconds(date: Date) {
            return JulianDate.secondsDifference(JulianDate.fromDate(date), data.startTime);
        }

        function toJulianDate(totalSeconds: number) {
            return JulianDate.addSeconds(data.startTime, totalSeconds, new JulianDate());
        }

        // todo: make work correctly
        let lastEmittedSampleTime: number;
        let lastDecodedEventTime: number;
        const infoEvent = <IPackageCreatedEventInfo | undefined> events.find(x => x.packageEventType == PackageEventType.Created);

        if (infoEvent) {
            cache.name = infoEvent.package.name;
            cache.description = infoEvent.package.description;

            entity.name = cache.name;
            entity.description = <any>cache.description;
            entity.model = <any>infoEvent.package.visual.model;
            entity.billboard = <any>infoEvent.package.visual.billboard;
            entity.box = <any>infoEvent.package.visual.box;
            entity.wall = <any>infoEvent.package.visual.wall;
            entity.polygon = <any>infoEvent.package.visual.polygon;
            lastEmittedSampleTime = toTotalSeconds(infoEvent.time);
        }
        else {
            entity.name = "packet " + packageId;
            entity.description = <any>undefined;
            entity.model = <any>undefined;
            entity.billboard = <any>{
                color: <any>randomSaturatedColor(),
                image: <any>'./images/packet2.png',
                width: <any>16,
                height: <any>16,
                eyeOffset: new Cesium.Cartesian3(0, 0, -2)
            };
            entity.box = <any>undefined;
            entity.wall = <any>undefined;
            entity.polygon = <any>undefined;
            lastEmittedSampleTime = 0;
        }

        const positionProp = new Cesium.SampledPositionProperty();
        positionProp.setInterpolationOptions({
            interpolationDegree: 1,
            interpolationAlgorithm: Cesium.HermitePolynomialApproximation
        });

        function emitSample(time: number, pos: Cartesian3) {
            positionProp.addSample(toJulianDate(time), pos);
            cache.samples.push({time: time, pos: pos});
            lastEmittedSampleTime = time;
        }

        let lastParentSample : {time: number, parentCache: PackageCache} | undefined = undefined;

        function flushParentSamples() {
            if (!lastParentSample)
                return;
            const parentCache = lastParentSample.parentCache;
            const startTime = lastParentSample.time;
            const endTime = lastDecodedEventTime;
            for (let i = 0; i < parentCache.samples.length; i++) {
                const parentSample = parentCache.samples[i];
                if (parentSample.time < startTime)
                    continue;
                if (parentSample.time > endTime)
                    break;
                emitSample(parentSample.time, parentSample.pos);
            }
            lastParentSample = undefined;
        }

        let lastFromId = <number | undefined> undefined;
        let lastToId = <number | undefined> undefined;
        let pastPipeSamples = <{amount: number, time: number}[]> [];

        function flushPipeSamples() {
            function cleanUp() {
                lastFromId = undefined;
                lastToId = undefined;
                pastPipeSamples = [];
            }

            if (!lastFromId || !lastToId || pastPipeSamples.length === 0) {
                cleanUp();
                return;
            }

            const pipe = data.getPipe(lastFromId, lastToId);
            if (!pipe) {
                cleanUp();
                return;
            }

            const forward = pipe.from.id == lastFromId && pipe.to.id == lastToId;
            const direction = forward ? PipeDirection.Forward : PipeDirection.Backward;
            //const spline = getPipeSpline(pipe, direction);
            const pipePoints = getDefaultPipePoints(pipe, direction);

            function geometricalAmount(amount: number) {
                return multiHermiteLerp(0, 1, amount, 2);
            }

            if (pastPipeSamples.length === 1) {
                const single = pastPipeSamples[0];
                const placeOnPipe = geometricalAmount(single.amount);
                const pipePointIndex = Math.round(placeOnPipe / (pipePoints.length - 1));
                const pipePoint = pipePoints[pipePointIndex];
                emitSample(single.time, pipePoint);
                cleanUp();
                return;
            }

            if (pastPipeSamples[0].amount !== 0.0) {
                const first = pastPipeSamples[0];
                const last = pastPipeSamples[pastPipeSamples.length - 1];
                const speed = (last.amount - first.amount) / (last.time - first.time);
                const approxZeroTime = first.time - first.amount / speed;
                if (approxZeroTime > lastEmittedSampleTime) {
                    pastPipeSamples = [{time: approxZeroTime, amount: 0}, ...pastPipeSamples];
                }
                else {
                    const time = (lastEmittedSampleTime + first.time) / 2;
                    pastPipeSamples = [{time: time, amount: 0}, ...pastPipeSamples];
                }
            }

            if (pastPipeSamples[pastPipeSamples.length - 1].amount !== 1.0) {
                const first = pastPipeSamples[0];
                const last = pastPipeSamples[pastPipeSamples.length - 1];
                const speed = (last.amount - first.amount) / (last.time - first.time);
                const approxZeroTime = first.time + 1 / speed;
                if (approxZeroTime < lastDecodedEventTime) {
                    pastPipeSamples = [...pastPipeSamples, {time: approxZeroTime, amount: 1}];
                }
                else {
                    const time = (last.time + lastDecodedEventTime) / 2;
                    pastPipeSamples = [...pastPipeSamples, {time: time, amount: 1}];
                }
            }

            const preHermiteAmountSpline = new Cesium.LinearSpline({
                times: pastPipeSamples.map(x => x.time),
                points: pastPipeSamples.map(x => new Cartesian3(x.amount, 0, 0))
            });

            // todo: use more than 2 samples

            for (let i = 1; i < pastPipeSamples.length; i++) {
                const s1 = pastPipeSamples[i - 1];
                const s2 = pastPipeSamples[i];

                const relevantPoints: Cartesian3[] = [];
                for (let j = 0; j < pipePoints.length; j++) {
                    const amount = j / (pipePoints.length - 1);
                    if (amount < s1.amount)
                        continue;
                    if (amount > s2.amount)
                        break;
                    relevantPoints.push(pipePoints[j]);
                }

                if (relevantPoints.length == 0) {
                    const amount = (s1.amount + s2.amount) / 2;
                    relevantPoints.push(pipePoints[Math.round(amount * (pipePoints.length - 1))])
                }

                for (let j = 0; j < relevantPoints.length; j++) {
                    const amount = j / (relevantPoints.length - 1);
                    const time = Cesium.Math.lerp(s1.time, s2.time, amount);
                    emitSample(time, relevantPoints[j]);
                }
            }

            /*
            const firstPipePointIndex = Math.ceil(firstSample.amount);
            const lastPipePointIndex = Math.floor(lastSample.amount);
            const relevantPipePoints = pipePoints.slice(firstPipePointIndex, lastPipePointIndex + 1);

            for (let i = 0; i < relevantPipePoints.length; i++) {
                emitSample()
            }

            const samplesPerPipe = 128;
            for (let i = 0; i < samplesPerPipe; i++) {
                const pipeStartTime = pastPipeSamples[0].time;
                const pipeEndTime = pastPipeSamples[pastPipeSamples.length - 1].time;
                const time = Cesium.Math.lerp(pipeStartTime, pipeEndTime, i / (samplesPerPipe - 1));
                const linearTimeAmount = preHermiteAmountSpline.evaluate(time).x;
                const hermiteAmount = geometricalAmount(linearTimeAmount);
                emitSample(time, spline.evaluate(hermiteAmount, new Cesium.Cartesian3()))
            }*/

            cleanUp();
        }

        for (let event of events) {
            lastDecodedEventTime = toTotalSeconds(event.time);
            if (event.packageEventType !== PackageEventType.Moved)
                continue;
            const mevent = <IPackageMovedEventInfo> event;
            flushParentSamples();
            let newPosition = mevent.newPosition;
            switch (newPosition.type) {
                case PackagePositionInfoType.ParentPackage:
                    flushPipeSamples();
                    const parentPos = <IParentPackagePackagePositionInfo> newPosition;
                    const parentId = parentPos.parentPackageId;
                    const parentDependencies = IntDictionaryMethods.getOrAdd(data.dependencies, parentId, x => []);
                    NaiveSetMethods.add(parentDependencies, packageId);
                    lastParentSample = {
                        time: lastDecodedEventTime,
                        parentCache: data.getCacheById(parentId)
                    };
                    break;
                case PackagePositionInfoType.Site:
                    flushPipeSamples();
                    const sitePos = <ISitePackagePositionInfo> newPosition;
                    emitSample(lastDecodedEventTime, cesiumVector3(data.nodesById[sitePos.siteNodeId].transform.absolute.offset));
                    break;
                case PackagePositionInfoType.Pipe:
                    const pipePos = <IPipePackagePositionInfo> newPosition;
                    if (pipePos.fromSiteNodeId != lastFromId || pipePos.toSiteNodeId != lastToId) {
                        flushPipeSamples();
                        lastFromId = pipePos.fromSiteNodeId;
                        lastToId = pipePos.toSiteNodeId;
                    }
                    pastPipeSamples.push({time: lastDecodedEventTime, amount: pipePos.interpolationAmount});
                    break;
                case PackagePositionInfoType.Absolute:
                    flushPipeSamples();
                    const absPos = <IAbsolutePackagePositionInfo> newPosition;
                    const carto = absPos.carto;
                    emitSample(lastDecodedEventTime, Cartesian3.fromDegrees(carto.longitude, carto.latitude, carto.height));
                    break;
            }
        }
        flushParentSamples();
        flushPipeSamples();

        function randomSaturatedColor() {
            switch (Math.floor(Math.random() * 6)) {
                case 0: return new Cesium.Color(Math.random(), 0, 1, 1);
                case 1: return new Cesium.Color(Math.random(), 1, 0, 1);
                case 2: return new Cesium.Color(0, Math.random(), 1, 1);
                case 3: return new Cesium.Color(1, Math.random(), 0, 1);
                case 4: return new Cesium.Color(0, 1, Math.random(), 1);
                case 5: return new Cesium.Color(1, 0, Math.random(), 1);
            }
            throw "Should never happen";
        }

        entity.position = positionProp;
        entity.orientation = new Cesium.VelocityOrientationProperty(entity.position);
    }
}