import {CesiumTransportVisualizer} from './cesiumVisualizer/cesiumTransportVisualizer';
import {TestDataProvider} from './testDataProvider';
import {NetworkingDataProvider} from './testDataProviders/networkingDataProvider';
import {DeliveryDataProvider} from './testDataProviders/deliveryDataProvider';

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MmQ5OWZlZS0xYjI2LTQ1NzktYTIzOC1hMjI0MjY3MmJhZWQiLCJpZCI6NTM5NSwic2NvcGVzIjpbImFzciIsImdjIl0sImlhdCI6MTU0MzIzODg4NX0.I4ZQdXYZFiLReyiJeBecfLtOlrT8Gv5smjLQKOS7160';

declare var global: any;
global = {};

const viewer = new Cesium.Viewer('cesiumContainer', {
    // terrainProvider: Cesium.createWorldTerrain({})
});

//Set the random number seed for consistent results.
Cesium.Math.setRandomNumberSeed(3);

global.visualizer = new CesiumTransportVisualizer(viewer);
global.dataProvider = new DeliveryDataProvider();
global.visualizer.bind(global.dataProvider).then(() => {

    //viewer.zoomTo(viewer.entities.values.filter(x => (x.name || '').includes("CS"))[0]);
});

