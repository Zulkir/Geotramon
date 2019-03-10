import {IMatrix3, ITransform, IVector3} from '../shared/algebra';
import {cesiumMatrix3, cesiumVector3, mat423} from './cesiumConverters';

export class CesiumTransform implements ITransform {
    public scale: number;
    public rotation: Cesium.Matrix3;
    public offset: Cesium.Cartesian3;

    public constructor(scale?: number, rotation?: IMatrix3, offset?: IVector3) {
        this.scale = scale || 1;
        this.rotation = Cesium.Matrix3.clone(cesiumMatrix3(rotation || Cesium.Matrix3.IDENTITY));
        this.offset = Cesium.Cartesian3.clone(cesiumVector3(offset || Cesium.Cartesian3.ZERO));
    }

    public static apply(vector: IVector3, transform: ITransform) {
        let result = Cesium.Cartesian3.clone(cesiumVector3(vector));
        Cesium.Cartesian3.multiplyByScalar(result, transform.scale, result);
        Cesium.Matrix3.multiplyByVector(cesiumMatrix3(transform.rotation), result, result);
        Cesium.Cartesian3.add(result, cesiumVector3(transform.offset), result);
        return result;
    }

    public static combine(first: ITransform, second: ITransform) {
        let result = new CesiumTransform();
        result.scale = first.scale * second.scale;
        Cesium.Matrix3.multiply(cesiumMatrix3(second.rotation), cesiumMatrix3(first.rotation), result.rotation);
        result.offset = CesiumTransform.apply(first.offset, second);
        return result;
    }

    public static combineMany(...transforms : ITransform[]) {
        let result = transforms[0];
        for (let i = 1; i < transforms.length; i++)
            result = CesiumTransform.combine(result, transforms[i]);
        return result;
    }

    public static invert(transform: ITransform) {
        let result = new CesiumTransform();
        result.scale = 1 / transform.scale;
        Cesium.Matrix3.transpose(cesiumMatrix3(transform.rotation), result.rotation);
        Cesium.Matrix3.multiplyByVector(result.rotation, cesiumVector3(transform.offset), result.offset);
        Cesium.Cartesian3.multiplyByScalar(result.offset, result.scale, result.offset);
        return result;
    }

    public static eastNorthUp(origin: IVector3) {
        let result = new CesiumTransform();
        let mat4 = Cesium.Transforms.eastNorthUpToFixedFrame(cesiumVector3(origin));
        result.scale = 1;
        result.rotation = mat423(mat4);
        result.offset = Cesium.Cartesian3.clone(cesiumVector3(origin));
        return result;
    }

    public static identity() {
        return new CesiumTransform(1, Cesium.Matrix3.IDENTITY, Cesium.Cartesian3.ZERO);
    }

    public static scale(scale: number) {
        return new CesiumTransform(scale, Cesium.Matrix3.IDENTITY, Cesium.Cartesian3.ZERO);
    }

    public static translation(offset: IVector3) {
        return new CesiumTransform(1, Cesium.Matrix3.IDENTITY, cesiumVector3(offset));
    }

    public static rotationX(angle: number) {
        return new CesiumTransform(1, Cesium.Matrix3.fromRotationX(angle), Cesium.Cartesian3.ZERO);
    }

    public static rotationY(angle: number) {
        return new CesiumTransform(1, Cesium.Matrix3.fromRotationY(angle), Cesium.Cartesian3.ZERO);
    }

    public static rotationZ(angle: number) {
        return new CesiumTransform(1, Cesium.Matrix3.fromRotationZ(angle), Cesium.Cartesian3.ZERO);
    }
}