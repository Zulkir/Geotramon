export interface IVector3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface IMatrix3 {
    [index: number]: number;
    // readonly column0Row0?: number; readonly column1Row0?: number; readonly column2Row0?: number;
    // readonly column0Row1?: number; readonly column1Row1?: number; readonly column2Row1?: number;
    // readonly column0Row2?: number; readonly column1Row2?: number; readonly column2Row2?: number;
}

export interface ITransform {
    scale: number;
    rotation: IMatrix3;
    offset: IVector3;
}

export interface IColor {
    red: number,
    green: number,
    blue: number,
    alpha: number
}

export enum PointListInterpolationType {
    Linear = "LINEAR",
    Quadratic = "QUADRATIC",
    Cubic = "CUBIC"
}

export function hermite(t: number): number {
    return t * t * (3 - 2 * t);
}

export function hermiteLerp(x: number, y: number, t: number): number {
    return x - hermite(t) * (x - y);
}

export function multiHermiteLerp(x: number, y: number, t: number, n: number): number {
    for (let i = 0; i < n; i++)
        t = hermite(t);
    return x - t * (x - y);
}

export function safeLerp(from: number, to: number, amount: number) : number {
    const result = (1 - amount) * from + amount * to;
    if (result < from)
        return from;
    if (result > to)
        return to;
    return result;
}