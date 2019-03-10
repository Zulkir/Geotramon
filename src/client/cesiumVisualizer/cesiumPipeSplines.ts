import {IPipe, PipeDirection} from '../transportVisualizer';
import {PipeType} from '../../shared/dataInfo';
import {IVector3, multiHermiteLerp, PointListInterpolationType} from '../../shared/algebra';
import {cesiumVector3} from '../cesiumConverters';
import {ApproximationAlgorithmSpline} from '../cesiumSplines';
import {CesiumTransform} from '../cesiumTransform';
import Cartesian3 = Cesium.Cartesian3;
import Spline = Cesium.Spline;
import SplineC3 = Cesium.SplineC3;

export const forwardSplineKey = Symbol("forwardSpline");
export const backwardSplineKey = Symbol("backwardSpline");

interface IPipeExtended extends IPipe {
    [forwardSplineKey]?: SplineC3;
    [backwardSplineKey]?: SplineC3;
}

export function getPipeSpline(pipe: IPipe, direction: PipeDirection) : SplineC3 {
    const key = pipeSplineByDirection(direction);
    const ePipe = <IPipeExtended>pipe;
    if (!ePipe[key])
        ePipe[key] = buildPipeSpline(pipe, direction);
    return ePipe[key]!;
}

export function pipeSplineByDirection(direction: PipeDirection) {
    switch (direction) {
        case PipeDirection.Forward:
            return forwardSplineKey;
        case PipeDirection.Backward:
            return backwardSplineKey;
        default:
            throw `Invalid pipe direction '${direction}'.`;
    }
}

export function buildPipeSpline(pipe: IPipe, direction: PipeDirection) : SplineC3 {
    const backwards = direction == PipeDirection.Backward;
    const posFrom = cesiumVector3(backwards
        ? pipe.to.transform.absolute.offset
        : pipe.from.transform.absolute.offset);
    const posTo = cesiumVector3(backwards
        ? pipe.from.transform.absolute.offset
        : pipe.to.transform.absolute.offset);
    let spline;
    switch (pipe.type) {
        case PipeType.Arc: {
            spline = buildGlobalArcSpline(posFrom, posTo, 1/8);
            break;
        }
        case PipeType.Line: {
            spline = buildGlobalArcSpline(posFrom, posTo, 0);
            break;
        }
        case PipeType.Explicit: {
            if (!pipe.explicitPath)
                throw "A pipe of type 'Explicit' must have an 'explicitPath' property.";
            const points = [];
            points.push(posFrom);
            for (let pathComponent of pipe.explicitPath.components) {
                const transform = pathComponent.node.transform.absolute;
                const explicitPoints = backwards
                    ? pathComponent.points.slice().reverse()
                    : pathComponent.points;
                let transformedExplicitPoints = explicitPoints.map(x => CesiumTransform.apply(x, transform));
                points.push(...transformedExplicitPoints);
            }
            points.push(posTo);
            const degree = degreeOfPipeType(pipe.explicitPath.interpolationType);
            spline = buildExplicitSpline(points, degree);
            break;
        }
        default: {
            throw `Invalid pipe type '${pipe.type}'`;
        }
    }
    const distance = Cartesian3.distance(spline.points[0], spline.points[spline.points.length - 1]);
    const offsetAmount = distance / 50;
    return offsetSpline(finesseSpline(spline, 129, 2), offsetAmount);
}

export function spline2polylineWithTolerance(spline: SplineC3, endPointTolerance: number, midPointTolerance: number) {
    if (isNaN(endPointTolerance) || isNaN(midPointTolerance))
        throw "Tolerance is NaN";

    const startTime = spline.times[0];
    const endTime = spline.times[spline.times.length - 1];
    const midTime = (startTime + endTime) / 2;
    const accumulator = [];

    function toleranceAt(t: number) {
        //return endPointTolerance;
        const actualT = Math.abs(t - midTime) / (midTime - startTime);
        return multiHermiteLerp(midPointTolerance, endPointTolerance, actualT, 2);
    }

    function generateMidPoints(p1: Cartesian3, t1: number, p2: Cartesian3, t2: number) {
        const middleT = (t1 + t2) / 2;
        const middleApprox = Cesium.Cartesian3.lerp(p1, p2, 0.5, new Cesium.Cartesian3());
        const middleReal = spline.evaluate(middleT, new Cesium.Cartesian3());
        const tolerance = toleranceAt(middleT);
        const toleranceSq = tolerance * tolerance;
        if (Cartesian3.distanceSquared(middleApprox, middleReal) < toleranceSq) {
            return;
        }
        generateMidPoints(p1, t1, middleReal, middleT);
        accumulator.push(middleReal);
        generateMidPoints(middleReal, middleT, p2, t2);
    }

    let startPoint = spline.evaluate(startTime, new Cesium.Cartesian3());
    let endPoint = spline.evaluate(endTime, new Cesium.Cartesian3());

    accumulator.push(startPoint);
    generateMidPoints(startPoint, startTime, endPoint, endTime);
    accumulator.push(endPoint);

    return accumulator;
}

function buildGlobalArcSpline(posFrom: IVector3, posTo: IVector3, heightFactor: number) {
    const p1 = cesiumVector3(posFrom);
    const p3 = cesiumVector3(posTo);

    if (isNaN(Cesium.Cartesian3.distanceSquared(p1, p3)))
        throw "Something is NaN";

    const c1 = Cesium.Ellipsoid.WGS84.cartesianToCartographic(p1);
    const c3 = Cesium.Ellipsoid.WGS84.cartesianToCartographic(p3);

    const geodesic = new Cesium.EllipsoidGeodesic(c1, c3);
    const dist = geodesic.surfaceDistance;
    const midPointCarto = geodesic.interpolateUsingFraction(0.5);
    const midPointDegrees = {
        longitude: Cesium.Math.toDegrees(midPointCarto.longitude),
        latitude: Cesium.Math.toDegrees(midPointCarto.latitude),
        height: dist * heightFactor
    };
    const p2 = Cesium.Cartesian3.fromDegrees(midPointDegrees.longitude, midPointDegrees.latitude, midPointDegrees.height);
    const splineControlPoints = [p1, p2, p3];
    return new ApproximationAlgorithmSpline(
        [0, 0.5, 1],
        splineControlPoints,
        Cesium.HermitePolynomialApproximation,
        2);
}

function buildStraightSpline(posFrom: Cartesian3, posTo: Cartesian3) {
    if (isNaN(Cesium.Cartesian3.distanceSquared(posFrom, posTo)))
        throw "Something is NaN";
    return new Cesium.LinearSpline({
        times: [0, 1],
        points: [posFrom, posTo]
    });
}

function degreeOfPipeType(interpolationType: PointListInterpolationType) {
    switch (interpolationType) {
        case PointListInterpolationType.Linear: return 1;
        case PointListInterpolationType.Quadratic: return 2;
        case PointListInterpolationType.Cubic: return 3;
        default: {
            console.error(`Unknown interpolation type '${interpolationType}' found.`);
            return 1;
        }
    }
}

function buildExplicitSpline(points: Cartesian3[], degree: number) {
    if (points.some(p => isNaN(p.x) || isNaN(p.y) || isNaN(p.z)))
        throw "Something is NaN";

    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        totalLength += Math.max(Cesium.Cartesian3.distance(p1, p2), 0.01);
    }

    const times = Array(points.length);
    times[0] = 0;
    let accumLength = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        accumLength += Math.max(Cesium.Cartesian3.distance(p1, p2), 0.01);
        times[i] = accumLength / totalLength;
    }
    times[times.length - 1] = 1;

    if (degree === 1) {
        return new Cesium.LinearSpline({
            times: times,
            points: points
        });
    }
    return new ApproximationAlgorithmSpline(
        times,
        points,
        Cesium.HermitePolynomialApproximation,
        degree);
}

function offsetSpline(spline: SplineC3, offsetAmount: number) {
    const newPoints = Array(spline.points.length);
    newPoints[0] = spline.points[0];

    for (let i = 1; i < spline.points.length - 1; i++) {
        const p1 = <Cartesian3>spline.points[i - 1];
        const p2 = <Cartesian3>spline.points[i];
        const p3 = <Cartesian3>spline.points[i + 1];
        const up = Cesium.Cartesian3.normalize(p2, new Cesium.Cartesian3());
        const v1 = Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3());
        const v2 = Cesium.Cartesian3.subtract(p3, p2, new Cesium.Cartesian3());
        const r1 = Cesium.Cartesian3.cross(v1, up, new Cesium.Cartesian3());
        const r2 = Cesium.Cartesian3.cross(v2, up, new Cesium.Cartesian3());
        const r1norm = Cesium.Cartesian3.normalize(r1, new Cesium.Cartesian3());
        const r2norm = Cesium.Cartesian3.normalize(r2, new Cesium.Cartesian3());
        const rAvg = Cesium.Cartesian3.lerp(r1norm, r2norm, 0.5, new Cesium.Cartesian3());
        const rNorm = Cesium.Cartesian3.magnitudeSquared(rAvg) > Cesium.Math.EPSILON8
            ? Cesium.Cartesian3.normalize(rAvg, new Cesium.Cartesian3())
            : Cesium.Cartesian3.normalize(v1, new Cesium.Cartesian3());
        let time = spline.times[i];
        const localAmount = offsetAmount * Math.sin(Math.PI * time);
        //const localAmount = time <= 0.5
        //    ? offsetAmount * hermite(time * 2)
        //    : offsetAmount * hermite((1 - time) * 2);
        const offset = Cesium.Cartesian3.multiplyByScalar(rNorm, localAmount, new Cesium.Cartesian3());
        newPoints[i] = Cesium.Cartesian3.add(p2, offset, new Cesium.Cartesian3());
    }
    newPoints[spline.points.length - 1] = spline.points[spline.points.length - 1];

    if (spline instanceof ApproximationAlgorithmSpline) {
        return new ApproximationAlgorithmSpline(
            spline.times, newPoints, spline.algorithm, spline.degree);
    }
    if (spline instanceof Cesium.LinearSpline) {
        return new Cesium.LinearSpline({
            times: spline.times,
            points: newPoints
        });
    }
    throw `Spline is of unknown format '${typeof spline}'`;
}

function finesseSpline(spline: SplineC3, numPoints: number, numHermites: number) {
    //return spline;
    //numPoints *= 10;

    const times = Array(numPoints);
    const points = Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
        const amount = i / (numPoints - 1);
        const t = multiHermiteLerp(0, 1, amount, numHermites);
        times[i] = t;
        points[i] = spline.evaluate(t);
    }
    return new ApproximationAlgorithmSpline(
        times,
        points,
        Cesium.HermitePolynomialApproximation,
        2);
}