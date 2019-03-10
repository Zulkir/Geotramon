import {EventCallback, IDataProvider, IMetaInfo, ISubscriptionToken} from '../shared/dataProvider';
import {
    CoordinateType,
    GenericEventType,
    IEventInfo,
    IPackageCreatedEventInfo,
    IPackageDestroyedEventInfo,
    IPackageInfo,
    IPackageMovedEventInfo, IPackagePositionInfo,
    IPipeInfo,
    IPipePackagePositionInfo,
    ISiteInfo,
    ISpatialNodeInfo,
    ISpatialNodeTransformInfo,
    ISpatialNodeVisualInfo,
    PackageEventType,
    PackagePositionInfoType,
    PipeType
} from '../shared/dataInfo';
import {CesiumTransform} from './cesiumTransform';
import {PointListInterpolationType} from '../shared/algebra';
import {inDfsOrder} from '../shared/trees';
import {HGraph} from '../shared/hgraph';

interface IPipeInfoWithDistance extends IPipeInfo {
    distanceFactor: number;
}

export class TestDataProvider implements IDataProvider {
    private meta: IMetaInfo;
    private root: ISpatialNodeInfo;
    private events: IEventInfo[];

    constructor() {
        this.meta = {
            rootNodeId: 1,
            startTime: new Date(2019, 1, 1, 0, 0, 0),
            endTime: new Date(2019, 1, 1, 0, 3, 0),
        };

        let nextSpatialNodeId = this.meta.rootNodeId + 1;

        function generateSpatialNodeId() {
            return nextSpatialNodeId++;
        }

        const taubFloorPoints0 = [
            new Cesium.Cartesian3(-7, -7, 0),
            new Cesium.Cartesian3(-7, 7, 0),
            new Cesium.Cartesian3(-2, 7, 0),
            new Cesium.Cartesian3(-2, 25, 0),
            new Cesium.Cartesian3(-2.5, 25, 0),
            new Cesium.Cartesian3(-2.5, 23, 0),
            new Cesium.Cartesian3(-7, 23, 0),
            new Cesium.Cartesian3(-7, 28, 0),
            new Cesium.Cartesian3(-2.5, 28, 0),
            new Cesium.Cartesian3(-2.5, 26, 0),
            new Cesium.Cartesian3(-2, 26, 0),
            new Cesium.Cartesian3(-2, 40, 0),
            new Cesium.Cartesian3(2, 40, 0),
            new Cesium.Cartesian3(2, 7, 0),
            new Cesium.Cartesian3(7, 7, 0),
            new Cesium.Cartesian3(7, 2, 0),
            new Cesium.Cartesian3(40, 2, 0),
            new Cesium.Cartesian3(40, -2, 0),
            new Cesium.Cartesian3(26, -2, 0),
            new Cesium.Cartesian3(26, -2.5, 0),
            new Cesium.Cartesian3(28, -2.5, 0),
            new Cesium.Cartesian3(28, -7, 0),
            new Cesium.Cartesian3(23, -7, 0),
            new Cesium.Cartesian3(23, -2.5, 0),
            new Cesium.Cartesian3(25, -2.5, 0),
            new Cesium.Cartesian3(25, -2, 0),
            new Cesium.Cartesian3(7, -2, 0),
            new Cesium.Cartesian3(7, -7, 0),
            new Cesium.Cartesian3(-7, -7, 0),
        ];

        const taubFloorPoints1 = [
            new Cesium.Cartesian3(-7, -7, 10),
            new Cesium.Cartesian3(-7, 7, 10),
            new Cesium.Cartesian3(-2, 7, 10),
            new Cesium.Cartesian3(-2, 15, 10),
            new Cesium.Cartesian3(-2.5, 15, 10),
            new Cesium.Cartesian3(-2.5, 13, 10),
            new Cesium.Cartesian3(-7, 13, 10),
            new Cesium.Cartesian3(-7, 18, 10),
            new Cesium.Cartesian3(-2.5, 18, 10),
            new Cesium.Cartesian3(-2.5, 16, 10),
            new Cesium.Cartesian3(-2, 16, 10),
            new Cesium.Cartesian3(-2, 40, 10),
            new Cesium.Cartesian3(2, 40, 10),
            new Cesium.Cartesian3(2, 7, 10),
            new Cesium.Cartesian3(7, 7, 10),
            new Cesium.Cartesian3(7, -7, 10),
            new Cesium.Cartesian3(-7, -7, 10),
        ];

        function transformZero() : ISpatialNodeTransformInfo {
            return {
                coordinateType: CoordinateType.Cartesian,
                relative: false,
                rotation: CesiumTransform.identity().rotation,
                position: Cesium.Cartesian3.ZERO
            };
        }

        function transformRelativeIdentity() : ISpatialNodeTransformInfo {
            return {
                coordinateType: CoordinateType.Cartesian,
                relative: true,
                rotation: CesiumTransform.identity().rotation,
                position: Cesium.Cartesian3.ZERO
            };
        }

        function posAbsDeg(lon: number, lat: number) : ISpatialNodeTransformInfo {
            return {
                coordinateType: CoordinateType.Cartographic,
                relative: false,
                rotation: CesiumTransform.identity().rotation,
                position: {
                    longitude: lon,
                    latitude: lat,
                    height: 0
                }
            }
        }

        function newNode(fields: {
            id?: number;
            name: string,
            transform: ISpatialNodeTransformInfo;
            expandDistance?: number;
            detailsOnRequest?: boolean;
            children?: ISpatialNodeInfo[];
            site?: ISiteInfo;
            pipes?: IPipeInfo[];
            collapsedVisuals?: ISpatialNodeVisualInfo[];
            expandedVisuals?: ISpatialNodeVisualInfo[];
            customProps?: any;
        }) : ISpatialNodeInfo {
            return {
                id: fields.id || generateSpatialNodeId(),
                name: fields.name,
                transform: fields.transform,
                expandDistance: fields.expandDistance || 0,
                detailsOnRequest: fields.detailsOnRequest || false,
                children: fields.children || [],
                site: fields.site,
                pipes: fields.pipes || [],
                collapsedVisuals: fields.collapsedVisuals || [],
                expandedVisuals: fields.expandedVisuals || [],
                customProps: fields.customProps || {}
            }
        }

        const dataCenterBillboard = {
            billboard: {
                image: './images/data-center-5.png',
                width: 48,
                height: 48,
                eyeOffset: new Cesium.Cartesian3(0, 0, -10)
            }
        };

        const dataCenterComputerBox = {
            box: {
                heightReference: 0,
                dimensions: { x: 1, y: 1, z: 1 },
            }
        };

        const computerTableModel = {
            model: {
                uri: '/models/mesa_pc.glb',
                scale: 0.02
            }
        };

        const superComputerModel = {
            model: {
                uri: '/models/SuperComputer.glb',
                scale: 0.01
            }
        };

        const rootId = this.meta.rootNodeId;
        const machbaId = generateSpatialNodeId();
        const technionGroundId = generateSpatialNodeId();
        const technionCsId = generateSpatialNodeId();
        const technionCsFirstId = generateSpatialNodeId();
        const technionCsSecondId = generateSpatialNodeId();
        const technionCsThirdId = generateSpatialNodeId();
        const hebrewUniId = generateSpatialNodeId();
        const technionComputerCenterBaseId = generateSpatialNodeId();
        const technionEeBaseId = generateSpatialNodeId();
        const cambridgeId = generateSpatialNodeId();

        const pipe_Cambridge_Machba: IPipeInfoWithDistance = {
            type: PipeType.Arc,
            width: 1,
            fromNodeId: cambridgeId,
            toNodeId: machbaId,
            biDirectional: true,
            customProps: {},
            distanceFactor: 15,
        };

        const pipe_Machba_Technion: IPipeInfoWithDistance = {
            type: PipeType.Arc,
            width: 1,
            fromNodeId: machbaId,
            toNodeId: technionComputerCenterBaseId,
            biDirectional: true,
            customProps: {},
            distanceFactor: 5,
        };

        const pipe_Machba_Hebrew: IPipeInfoWithDistance = {
            type: PipeType.Arc,
            width: 1,
            fromNodeId: machbaId,
            toNodeId: hebrewUniId,
            biDirectional: true,
            customProps: {},
            distanceFactor: 5,
        };

        const pipe_TechnionCC_CS: IPipeInfoWithDistance = {
            type: PipeType.Arc,
            width: 1,
            fromNodeId: technionComputerCenterBaseId,
            toNodeId: technionCsId,
            biDirectional: true,
            customProps: {},
            distanceFactor: 5,
        };

        const pipe_TechnionCC_EE: IPipeInfoWithDistance = {
            type: PipeType.Arc,
            width: 1,
            fromNodeId: technionComputerCenterBaseId,
            toNodeId: technionEeBaseId,
            biDirectional: true,
            customProps: {},
            distanceFactor: 5,
        };

        const pipe_TechnionCS_First: IPipeInfoWithDistance = {
            type: PipeType.Explicit,
            width: 1,
            fromNodeId: technionCsId,
            toNodeId: technionCsFirstId,
            biDirectional: true,
            customProps: {},
            distanceFactor: 1,
            explicitPath: {
                interpolationType: PointListInterpolationType.Cubic,
                components: [
                    {
                        nodeId: technionGroundId,
                        points: [
                            new Cesium.Cartesian3(4,    0,    0.2),
                            new Cesium.Cartesian3(6,    0,    0.2),
                            new Cesium.Cartesian3(12,   0,    0.2),
                            new Cesium.Cartesian3(19,   0,    0.2),
                            new Cesium.Cartesian3(22,   0,    0.2),
                            new Cesium.Cartesian3(25,   -1,   0.2),
                            new Cesium.Cartesian3(25.5, -1.8,   0.2),
                            new Cesium.Cartesian3(25.5, -2,   0.2),
                            new Cesium.Cartesian3(25.5, -4.5, 0.2)
                        ]
                    }
                ]
            }
        };

        const pipe_TechnionCS_Second: IPipeInfoWithDistance = {
            type: PipeType.Explicit,
            width: 1,
            fromNodeId: technionCsId,
            toNodeId: technionCsSecondId,
            biDirectional: true,
            customProps: {},
            distanceFactor: 1,
            explicitPath: {
                interpolationType: PointListInterpolationType.Cubic,
                components: [
                    {
                        nodeId: technionGroundId,
                        points: [
                            new Cesium.Cartesian3(0, 4, 0.2),
                            new Cesium.Cartesian3(0, 6, 0.2),
                            new Cesium.Cartesian3(0, 12, 0.2),
                            new Cesium.Cartesian3(0, 14, 0.2),
                            new Cesium.Cartesian3(0, 16, 0.2),
                            new Cesium.Cartesian3(0, 19, 0.2),
                            new Cesium.Cartesian3(0, 22, 0.2),
                            new Cesium.Cartesian3(-1, 25, 0.2),
                            new Cesium.Cartesian3(-1.8, 25.5, 0.2),
                            new Cesium.Cartesian3(-2, 25.5, 0.2),
                            new Cesium.Cartesian3(-4.5, 25.5, 0.2),
                        ]
                    }
                ]
            }
        };

        const pipe_TechnionCS_Third: IPipeInfoWithDistance = {
            type: PipeType.Explicit,
            width: 1,
            fromNodeId: technionCsId,
            toNodeId: technionCsThirdId,
            biDirectional: true,
            customProps: {},
            distanceFactor: 1,
            explicitPath: {
                interpolationType: PointListInterpolationType.Cubic,
                components: [
                    {
                        nodeId: technionGroundId,
                        points: [
                            new Cesium.Cartesian3(0, 1, 5.1),
                            new Cesium.Cartesian3(0, 4, 9.1),
                            new Cesium.Cartesian3(0, 6, 10.1),
                            //new Cesium.Cartesian3(0, 8, 10.1),
                            new Cesium.Cartesian3(0, 9, 10.1),
                            new Cesium.Cartesian3(0, 12, 10.1),
                            new Cesium.Cartesian3(-1, 15, 10.1),
                            new Cesium.Cartesian3(-1.8, 15.5, 10.1),
                            new Cesium.Cartesian3(-2, 15.5, 10.1),
                            new Cesium.Cartesian3(-4.5, 15.5, 10.1),
                        ]
                    }
                ]
            }
        };

        this.root = newNode({
            id: rootId,
            name: 'Root',
            transform: transformZero(),
            pipes: [pipe_Cambridge_Machba],
            children: [
                newNode({
                    name: 'Israel',
                    transform: posAbsDeg(35.1004859, 31.653486),
                    pipes: [
                        pipe_Machba_Technion,
                        pipe_Machba_Hebrew,
                        // todo: refactor
                        pipe_TechnionCC_CS,
                        pipe_TechnionCC_EE,

                    ],
                    children: [
                        newNode({
                            id: machbaId,
                            name: 'Machba',
                            transform: posAbsDeg(34.8058258, 32.108949),
                            site: {
                                name: "Tel-Aviv University -  Inter-University Computation Center",
                                description: `<p>IUCC (Hebrew: מחב”א‎, MACHBA), was established in 1984 by Israel’s research universities. 
It operates as a non-profit organization. Through its centers and divisions, 
IUCC delivers communication and network infrastructure services, digital information services, 
learning technologies, as well as operating and handling all inter-university joint procurement 
and the legal aspects of operating Israel’s National Research and Education Network (NREN). 
IUCC promotes cooperation in these areas among member institutions, and between research institutes and organizations.</p>`,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        }),
                        newNode({
                            name: 'TechnionCS',
                            transform: posAbsDeg(35.0215658, 32.7776437),
                            pipes: [
                                pipe_TechnionCS_First,
                                pipe_TechnionCS_Second,
                                pipe_TechnionCS_Third,
                            ],
                            children: [
                                newNode({
                                    id: technionGroundId,
                                    name: 'Technion Ground',
                                    transform:{
                                        relative: true,
                                        coordinateType: CoordinateType.Cartesian,
                                        rotation: CesiumTransform.rotationZ(Cesium.Math.toRadians(-47)).rotation,
                                        position: new Cesium.Cartesian3(-25, 5, 0),
                                    },
                                    children: [
                                        newNode({
                                            name: 'Floor 0',
                                            transform: transformRelativeIdentity(),
                                            expandedVisuals: [
                                                {
                                                    transform: CesiumTransform.identity(),
                                                    wall: {
                                                        height: 2.2,
                                                        points: taubFloorPoints0,
                                                        color: new Cesium.Color(1, 1, 1)
                                                    }
                                                },
                                                {
                                                    transform: CesiumTransform.identity(),
                                                    polygon: {
                                                        height: 0,
                                                        points: taubFloorPoints0,
                                                        color: new Cesium.Color(0.85, 0.8, 0.7)
                                                    }
                                                },
                                                {
                                                    transform: CesiumTransform.identity(),
                                                    wall: {
                                                        height: 2.2,
                                                        points: taubFloorPoints1,
                                                        color: new Cesium.Color(1, 1, 1)
                                                    }
                                                },
                                                {
                                                    transform: CesiumTransform.identity(),
                                                    polygon: {
                                                        height: 10,
                                                        points: taubFloorPoints1.slice(1, 14),
                                                        color: new Cesium.Color(0.85, 0.8, 0.7)
                                                    }
                                                },
                                                {
                                                    transform: CesiumTransform.identity(),
                                                    polygon: {
                                                        height: 10,
                                                        points: [
                                                            new Cesium.Cartesian3(2, 7, 10),
                                                            new Cesium.Cartesian3(7, 7, 10),
                                                            new Cesium.Cartesian3(7, -7, 10),
                                                            new Cesium.Cartesian3(-7, -7, 10),
                                                            new Cesium.Cartesian3(-7, 7, 10),
                                                            new Cesium.Cartesian3(-2, 7, 10),
                                                            new Cesium.Cartesian3(-2, 4, 10),
                                                            new Cesium.Cartesian3(2, 4, 10),
                                                            new Cesium.Cartesian3(2, 7, 10),
                                                        ],
                                                        color: new Cesium.Color(0.85, 0.8, 0.7)
                                                    }
                                                },
                                            ],
                                            children: [
                                                newNode({
                                                    id: technionCsId,
                                                    name: 'Base',
                                                    transform: transformRelativeIdentity(),
                                                    site: {
                                                        name: "Technion - CS",
                                                        description: `<p>The Department of Computer Science is the second largest academic unit in the Technion, 
with approximately 1,800 undergraduate students (about one-sixth of the total number of Technion students) and over 250 graduate students. 
It comprises over 50 faculty members of international repute with expertise in a wide variety of fields. 
It is the largest department of computer science in Israel and supplies the Israeli hi-tech industry with the highest caliber manpower. 
As one of the most popular Technion departments it can select for admission the very best students. 
The department engages in a wide range of research and teaching activities and constitutes a unique meeting point between science and technology. 
It provides basic computer training to the entire Technion community. A skilled professional staff of 
engineers, technicians and secretaries supports the department's teaching and research. </p>`,
                                                        customProps: {}
                                                    },
                                                    collapsedVisuals: [dataCenterBillboard],
                                                    expandedVisuals: [
                                                        {
                                                            ...superComputerModel,
                                                            transform: new CesiumTransform(1,
                                                                Cesium.Matrix3.fromRotationZ(Math.PI / 4),
                                                                new Cesium.Cartesian3(1, -1, 0))
                                                        }
                                                    ]
                                                }),
                                                newNode({
                                                    id: technionCsFirstId,
                                                    name: 'First Computer',
                                                    transform: {
                                                        relative: true,
                                                        coordinateType: CoordinateType.Cartesian,
                                                        rotation: Cesium.Matrix3.fromRotationZ(Math.PI / 2),
                                                        position: new Cesium.Cartesian3(25.5, -5, 0)
                                                    },
                                                    site: {
                                                        name: "Techion - CS - First Computer",
                                                        description: "<p></p>",
                                                        customProps: {}
                                                    },
                                                    collapsedVisuals: [computerTableModel]
                                                }),
                                                newNode({
                                                    id: technionCsSecondId,
                                                    name: 'Second Computer',
                                                    transform: {
                                                        relative: true,
                                                        coordinateType: CoordinateType.Cartesian,
                                                        rotation: Cesium.Matrix3.IDENTITY,
                                                        position: new Cesium.Cartesian3(-5, 25.5, 0)
                                                    },
                                                    site: {
                                                        name: "Techion - CS - Second Computer",
                                                        description: "<p></p>",
                                                        customProps: {}
                                                    },
                                                    collapsedVisuals: [computerTableModel]
                                                })
                                            ]
                                        }),
                                        newNode({
                                            name: 'Floor 1',
                                            transform: transformRelativeIdentity(),
                                            children: [
                                                newNode({
                                                    id: technionCsThirdId,
                                                    name: 'Third Computer',
                                                    transform: {
                                                        relative: true,
                                                        coordinateType: CoordinateType.Cartesian,
                                                        rotation: Cesium.Matrix3.IDENTITY,
                                                        position: new Cesium.Cartesian3(-5, 15.5, 10)
                                                    },
                                                    site: {
                                                        name: "Techion - CS - Third Computer",
                                                        description: "<p></p>",
                                                        customProps: {}
                                                    },
                                                    collapsedVisuals: [computerTableModel]
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        }),
                        newNode({
                            id: hebrewUniId,
                            name: 'HebrewUniCS',
                            transform: posAbsDeg(35.1978656, 31.7765806),
                            site: {
                                name: "Hebrew University - CS",
                                description: `<p>The School of Computer Science & Engineering at The Hebrew University of Jerusalem 
is devoted to excellence in teaching, learning and research. 
We are leading groundbreaking and revolutionary international studies in science, technology and other areas of scholarship which make a difference globally. 
You are welcome to read more about our research activities, seminars, special events, degree-granting and more.</p>`,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        }),
                        newNode({
                            name: 'Medina Square',
                            transform: posAbsDeg(34.789813, 32.0867595)
                        }),
                        newNode({
                            name: 'Technion Computer Center',
                            transform: posAbsDeg(35.0245425, 32.7772266),
                            children: [
                                newNode({
                                    id: technionComputerCenterBaseId,
                                    name: 'Base',
                                    transform: transformRelativeIdentity(),
                                    site: {
                                        name: "Techion - Computer Center",
                                        description: "<p></p>",
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                })
                            ]
                        }),
                        newNode({
                            name: 'Technion EE',
                            transform: posAbsDeg(35.0251956, 32.7758146),
                            children: [
                                newNode({
                                    id: technionEeBaseId,
                                    name: 'Base',
                                    transform: transformRelativeIdentity(),
                                    site: {
                                        name: "Techion - Electrical Engineering",
                                        description: "<p></p>",
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                })
                            ]
                        })
                    ]
                }),
                newNode({
                    name: 'UK',
                    transform: posAbsDeg(-2.5091442, 54.4338846),
                    children: [
                        newNode({
                            id: cambridgeId,
                            name: 'Cambridge',
                            transform: posAbsDeg(0.0920459, 52.2109457),
                            site: {
                                name: "University of Cambridge - Computer Laboratory",
                                description: `<p>The Computer Laboratory is an academic department within the University of Cambridge that encompasses 
Computer Science, along with many aspects of Engineering, Technology and Mathematics. 
It consists of 44 academic staff, 30 support staff, 7 research fellows, 102 post-doctoral research workers and 121 PhD students. 
We have over 300 undergraduates studying for Part I, II and III of the Computer Science Tripos and 36 graduate students studying for the MPhil in Advanced Computer Science.</p>`,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                })
            ]
        });


        this.events = [];
        {
            const allNodes = inDfsOrder(this.root, x => x.children);
            const nodesById = <{[id:number]:ISpatialNodeInfo}>{};
            for (let node of allNodes)
                nodesById[node.id] = node;
            const allPipes = allNodes
                .map(x => x.pipes)
                .filter(x => x)
                .reduce((x, y) => [...x, ...y]);
            const arrows = allPipes
                .map(x => x.biDirectional
                    ? [{from: nodesById[x.fromNodeId], to: nodesById[x.toNodeId]},
                        {from: nodesById[x.toNodeId], to: nodesById[x.fromNodeId]}]
                    : [{from: nodesById[x.fromNodeId], to: nodesById[x.toNodeId]}])
                .reduce((x, y) => [...x, ...y]);

            const hgraph = new HGraph({
                treeRoot: this.root,
                getId: x => x.id,
                getChildren: x => x.children,
                arrows: arrows
            });

            const connectedNodeIds = allPipes
                .map(x => [x.fromNodeId, x.toNodeId])
                .reduce((x, y) => [...x, ...y])
                .filter((x, i, a) => a.indexOf(x) == i);

            function getPipeBetween(idFrom: number, idTo: number): IPipeInfo {
                return allPipes.find(x =>
                    x.fromNodeId == idFrom && x.toNodeId == idTo ||
                    x.fromNodeId == idTo && x.toNodeId == idFrom && x.biDirectional)!;
            }

            const self = this;

            function createPackage(time: Date, packageId: number, info: IPackageInfo) {
                self.events.push(<IPackageCreatedEventInfo>{
                    time: time,
                    genericEventType: GenericEventType.Package,
                    packageEventType: PackageEventType.Created,
                    packageId: packageId,
                    package: info
                });
            }

            function movePackageToPipe(time: Date, packageId: number, info: IPipePackagePositionInfo) {
                self.events.push(<IPackageMovedEventInfo>{
                    time: time,
                    genericEventType: GenericEventType.Package,
                    packageEventType: PackageEventType.Moved,
                    packageId: packageId,
                    newPosition: info
                });
            }

            function destroyPackage(time: Date, id: number) {
                self.events.push(<IPackageDestroyedEventInfo>{
                    time: time,
                    genericEventType: GenericEventType.Package,
                    packageEventType: PackageEventType.Destroyed,
                    packageId: id
                });
            }

            function addSeconds(date: Date, seconds: number): Date {
                return new Date(date.getTime() + seconds * 1000);
            }

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

            const timeDisambiguator = 0.001;

            let currentTime = this.meta.startTime;
            for (let i = 0; i < 100; i++) {
                const idFrom = connectedNodeIds[Math.floor((Math.random() * connectedNodeIds.length))];
                const idTo = connectedNodeIds[Math.floor((Math.random() * connectedNodeIds.length))];
                if (idFrom === idTo)
                    continue;
                const path = hgraph.findPath(nodesById[idFrom], nodesById[idTo]);
                if (!path)
                    continue;
                const pathIds = path.map(x => x.id);

                const timestamps = [currentTime];
                createPackage(timestamps[0], i, {
                    name: `Packet #${i}`,
                    description: `<p>A <strong>test</strong> packet.</p>
<p>Start Time: ${currentTime}</p>
<br/>
<p>From: ${idFrom}</p>
<p>To: ${idTo}</p>
<p>Path: ${pathIds}</p>
`,
                    visual: {
                        billboard: {
                            color: randomSaturatedColor(),
                            image: <any>'./images/packet2.png',
                            width: <any>16,
                            height: <any>16,
                            eyeOffset: new Cesium.Cartesian3(0, 0, -2)
                        }
                    },
                    customProps: {}
                });
                for (let j = 1; j < pathIds.length; j++) {
                    let pipeFromId = pathIds[j - 1];
                    let pipeToId = pathIds[j];
                    const pipe = getPipeBetween(pipeFromId, pipeToId);
                    const pipeTravelTime = (Math.random() * 5 + 1) * ((<any>pipe).distanceFactor || 1);
                    timestamps.push(addSeconds(timestamps[j - 1], pipeTravelTime));
                    movePackageToPipe(addSeconds(timestamps[j - 1], timeDisambiguator), i, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: pipeFromId,
                        toSiteNodeId: pipeToId,
                        interpolationAmount: 0
                    });
                    movePackageToPipe(timestamps[j], i, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: pipeFromId,
                        toSiteNodeId: pipeToId,
                        interpolationAmount: 1
                    });
                }
                destroyPackage(addSeconds(timestamps[timestamps.length - 1], timeDisambiguator), i);

                currentTime = addSeconds(currentTime, Math.random() * 1.1 + 0.01);
            }
        }
    }

    getMeta(): Promise<IMetaInfo> {
        return Promise.resolve(this.meta);
    }

    getSpatialSubtree(rootId: number): Promise<ISpatialNodeInfo> {
        if (rootId !== 1) {
            return Promise.reject("rootId is invalid");
        }
        return Promise.resolve(this.root);
    }

    subscribe(onEvent: EventCallback): ISubscriptionToken {
        for (let event of this.events)
            onEvent(event);
        return {};
    }

    unsubscribe(token: ISubscriptionToken): void {
    }
}