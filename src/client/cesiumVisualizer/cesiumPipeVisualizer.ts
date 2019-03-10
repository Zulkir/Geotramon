import {IPipe, ISpatialNode, PipeDirection} from '../transportVisualizer';
import {inDfsOrder} from '../../shared/trees';
import {getPipeSpline, spline2polylineWithTolerance} from './cesiumPipeSplines';
import Cartesian3 = Cesium.Cartesian3;
import PolylineGlowMaterialProperty = Cesium.PolylineGlowMaterialProperty;

export class CesiumPipeVisualizer {
    private readonly viewer: Cesium.Viewer;
    private entities: Cesium.Entity[];
    private primitives: Cesium.Primitive[];
    private pipeMaterialType: string;
    private pipeMaterial: Cesium.Material;
    private propertyClass: any;

    public constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer;
        this.entities = [];
        this.primitives = [];

        this.pipeMaterialType = 'TS_DirectedPipeMaterial';
        this.pipeMaterial = new Cesium.Material({
            strict: true,
            fabric: {
                type: this.pipeMaterialType,
                source: `
//#extension GL_OES_standard_derivatives : enable

varying float v_polylineAngle;

mat2 rotate(float rad) {
    float c = cos(rad);
    float s = sin(rad);
    return mat2(
        c, s,
        -s, c
    );
}

const float TwoPI = 6.283185307179586;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    
    vec2 pos = -rotate(v_polylineAngle) * gl_FragCoord.xy;
    
    //vec2 gradient = vec2(dFdx(materialInput.st.x), dFdy(materialInput.st.x));
    //vec2 dir = normalize(gradient);
    //vec2 pos = vec2(dot(gl_FragCoord.xy, dir), 0.0);
    
    float time = czm_frameNumber / 60.0;
    float timeFrequency = 2.0;
    float spatialFrequency = 0.01;
    float color = 0.5 + 0.1 * sin(TwoPI * (pos.x * spatialFrequency + time * timeFrequency));
    //material.diffuse = vec3(color);
    //material.specular = 0.0;
    //material.shininess = 1.0;
    material.emission = vec3(color);
    material.alpha = 0.5;
    return material;
}`
            }
        });

        const mt = this.pipeMaterialType;

        this.propertyClass = function () {
            PolylineGlowMaterialProperty.call(this);
        };
        this.propertyClass.prototype.getType = function (time: any) {
            return mt;
        }
    }

    public reset() {
        for (let primitive of this.primitives)
            this.viewer.scene.primitives.remove(primitive);
        this.primitives = [];
        for (let entity of this.entities)
            this.viewer.entities.remove(entity);
        this.entities = [];
    }

    public addSubtree(subtreeRoot: ISpatialNode) {
        const nodes = inDfsOrder(subtreeRoot, x => x.children);
        for (let node of nodes)
            for (let pipe of node.pipes) {
                this.addPipeDirection(node, pipe, PipeDirection.Forward);
                if (pipe.biDirectional)
                    this.addPipeDirection(node, pipe, PipeDirection.Backward);
            }
    }

    private addPipeDirection(node: ISpatialNode, pipe: IPipe, direction: PipeDirection) {
        const spline = getPipeSpline(pipe, direction);
        const dist = Cartesian3.distance(spline.points[0], spline.points[spline.points.length - 1]);
        const splinePolyline = spline2polylineWithTolerance(spline, dist / 50000 + 0.01, dist / 1000 + 0.01);

        const instance = new Cesium.GeometryInstance({
            geometry: new Cesium.PolylineGeometry({
                positions: splinePolyline,
                width: 10,
            })
        });

        const primitive = this.viewer.scene.primitives.add(new Cesium.Primitive({
            geometryInstances: instance,
            appearance: new Cesium.PolylineMaterialAppearance({
                material: this.pipeMaterial
            })
        }));
        this.primitives.push(primitive);

        //const mat = this.pipeMaterial;
        //const matType = this.pipeMaterialType;
        //const entity = this.viewer.entities.add(<any>{
        //    name: "",
        //    description: <any>"",
        //    polyline: <Cesium.PolylineGraphics>{
        //        positions: <any>splinePolyline,
        //        width: 10,
        //        material: <any>{
        //            definitionChanged: new Cesium.Event(),
        //            isConstant: true,
        //            equals(other?: Cesium.Property): boolean {
        //                return false;
        //            },
        //            getType(time: Cesium.JulianDate): any {
        //                return mat;
        //            },
        //            getValue(time: Cesium.JulianDate, result?: any): any {
        //                return {};
        //            },
        //        },
        //    }
        //});
        //this.entities.push(entity);
    }
}