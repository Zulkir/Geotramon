import {IColor, IMatrix3, IVector3} from '../shared/algebra';

export function cesiumVector3(v: IVector3): Cesium.Cartesian3 {
    return v instanceof Cesium.Cartesian3
        ? v
        :new Cesium.Cartesian3(v.x, v.y, v.z);
}

export function cesiumColor(v: IColor): Cesium.Color {
    return v instanceof Cesium.Color
        ? v
        :new Cesium.Color(v.red, v.green, v.blue, v.alpha);
}

export function  cesiumMatrix3(m: IMatrix3): Cesium.Matrix3 {
    return (m instanceof Cesium.Matrix3)
        ? m
        : new Cesium.Matrix3(...[...Array(9).keys()].map(x => m[x]));
}

export function mat423(mat: Cesium.Matrix4) : Cesium.Matrix4 {
    const result = new Cesium.Matrix3();
    for (let c = 0; c < 3; c++) {
        for (let r = 0; r < 3; r++) {
            result[c * 3 + r] = mat[c * 4 + r];
        }
    }
    return result;
}