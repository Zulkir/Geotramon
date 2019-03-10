import Cartesian3 = Cesium.Cartesian3;
import Quaternion = Cesium.Quaternion;
import InterpolationAlgorithm = Cesium.InterpolationAlgorithm;
import SplineC3 = Cesium.SplineC3;

export class BezierQuadraticInterpolationAlgorithm {
    static get type() { return 'BezierQuadraticInterpolationAlgorithm'; }
    static getRequiredDataPoints(degree: number) { return 3; }
    static interpolateOrderZero(x: number, xTable: number[], yTable: number[], yStride: number, inputOrder: number, outputOrder: number, result?: number[]) {
        result = result || [];
        const t = x;
        const it = 1.0 - t;
        for (let i = 0; i < yStride; i++) {
            const p0 = yTable[i];
            const p1 = yTable[i + yStride];
            const p2 = yTable[i + 2 * yStride];
            result[i] = it * it * p0 + 2 * it * t * p1 + t * t * p2;
        }
        return result;
    }
}

export class BezierQuadraticSpline implements SplineC3 {
    public times: number[];
    public points: Cesium.Cartesian3[];

    constructor(points: Cesium.Cartesian3[]) {
        if (points.length !== 3)
            throw `'points' array must be of length 3, but was of length ${points.length}.`;
        this.times = [0, 0.5, 1];
        this.points = points.slice();
    }

    evaluate(time: number, result? : Cartesian3): Cartesian3 {
        if (!(result instanceof Cesium.Cartesian3))
            throw `Element type 'Cartesian3' expected, but ${typeof result} found.`;

        const t = time;
        const it = 1.0 - t;
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];

        let aux = new Cesium.Cartesian3();
        Cesium.Cartesian3.multiplyByScalar(p0, it * it, aux);
        Cesium.Cartesian3.clone(aux, result);
        Cesium.Cartesian3.multiplyByScalar(p1, 2 * it * t, aux);
        Cesium.Cartesian3.add(result, aux, result);
        Cesium.Cartesian3.multiplyByScalar(p2, t * t, aux);
        Cesium.Cartesian3.add(result, aux, result);
        return result;

        //if (typeof result === 'number') {
        //    return it * it * p0 + 2 * it * t * p1 + t * t * p2;
        //}
    }
}

export class ApproximationAlgorithmSpline implements SplineC3 {
    public times: number[];
    public points: Cesium.Cartesian3[];
    public algorithm: Cesium.InterpolationAlgorithm;
    public degree: number;
    public startDate: Cesium.JulianDate;
    public posProp: Cesium.SampledPositionProperty;

    constructor(times: number[], points: Cartesian3[], algorithm: InterpolationAlgorithm, degree: number) {
        this.times = times.slice();
        this.points = points.slice();
        this.algorithm = algorithm;
        this.degree = degree;

        this.startDate = Cesium.JulianDate.now();
        this.posProp = new Cesium.SampledPositionProperty();
        this.posProp.setInterpolationOptions({
            interpolationAlgorithm: algorithm,
            interpolationDegree: degree
        });
        for (let i = 0; i < times.length; i++) {
            let date = Cesium.JulianDate.addSeconds(this.startDate, this.times[i] - this.times[0], new Cesium.JulianDate());
            this.posProp.addSample(date, points[i]);
        }
    }

    evaluate(time: number, result? : Cartesian3) : Cartesian3 {
        if (result && !(result instanceof Cesium.Cartesian3))
            throw `Element type 'Cartesian3' expected, but ${typeof result} found.`;

        let date = Cesium.JulianDate.addSeconds(this.startDate, time, new Cesium.JulianDate());
        result = <Cartesian3>this.posProp.getValue(date, result);
        return result;
    }
}
