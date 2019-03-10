import {ISpatialNode, IVisualElement} from '../transportVisualizer';
import {inDfsOrder} from '../../shared/trees';
import {CesiumTransform} from '../cesiumTransform';
import {cesiumColor, cesiumMatrix3, cesiumVector3} from '../cesiumConverters';
import Entity = Cesium.Entity;

export class CesiumSpatialNodeVisualizer {
    private readonly viewer: Cesium.Viewer;
    private entities: Cesium.Entity[];

    public constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer;
        this.entities = [];
    }

    public reset() {
        for (let entity of this.entities)
            this.viewer.entities.remove(entity);
        this.entities = [];
    }

    public addSubtree(subtreeRoot: ISpatialNode) {
        const nodes = inDfsOrder(subtreeRoot, x => x.children);
        for (let node of nodes) {
            for (let visual of node.collapsedVisuals)
                this.addVisual(node, visual, true);
            for (let visual of node.expandedVisuals)
                this.addVisual(node, visual, false);
        }
    }

    private addVisual(node: ISpatialNode, visual: IVisualElement, collapsed: boolean) {
        const entity = new Entity();
        if (node.site) {
            entity.name = node.site.name;
            entity.description = <any>node.site.description;
        }
        const absTransform = visual.transform
            ? CesiumTransform.combine(visual.transform, node.transform.absolute)
            : node.transform.absolute;
        entity.position = cesiumVector3(absTransform.offset);
        entity.orientation = <any>Cesium.Quaternion.fromRotationMatrix(cesiumMatrix3(absTransform.rotation));
        entity.model = <Cesium.ModelGraphics><unknown>visual.model;
        entity.box = <Cesium.BoxGraphics><unknown>visual.box;
        entity.billboard = <Cesium.BillboardGraphics><unknown>visual.billboard;
        if (visual.wall) {
            const wall = visual.wall;
            const positions = wall.points.map(p => CesiumTransform.apply(p, absTransform));
            entity.wall = <Cesium.WallGraphics><unknown>{
                positions: positions,
                minimumHeights: wall.points.map(p => p.z),
                maximumHeights: wall.points.map(p => p.z + wall.height),
                material: cesiumColor(wall.color)
            }
        }
        if (visual.polygon) {
            const polygon = visual.polygon;
            const points = (polygon.points).map(p => CesiumTransform.apply(p, absTransform));
            entity.polygon = <Cesium.PolygonGraphics><unknown>{
                hierarchy: new Cesium.PolygonHierarchy(points, []),
                height: polygon.height,
                material: cesiumColor(polygon.color)
            }
        }
        this.entities.push(this.viewer.entities.add(entity));
    }
}