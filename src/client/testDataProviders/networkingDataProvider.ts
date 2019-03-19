import {EventCallback, IDataProvider, IMetaInfo, ISubscriptionToken} from '../../shared/dataProvider';
import {
    CoordinateType,
    GenericEventType,
    IAbsolutePackagePositionInfo,
    IEventInfo,
    IPackageCreatedEventInfo,
    IPackageDestroyedEventInfo,
    IPackageInfo,
    IPackageMovedEventInfo,
    IParentPackagePackagePositionInfo,
    IPipeInfo,
    IPipePackagePositionInfo,
    ISiteInfo,
    ISitePackagePositionInfo,
    ISpatialNodeInfo,
    ISpatialNodeTransformInfo,
    ISpatialNodeVisualInfo,
    PackageEventType,
    PackagePositionInfoType,
    PipeType
} from '../../shared/dataInfo';
import {CesiumTransform} from '../cesiumTransform';
import {IColor, PointListInterpolationType} from '../../shared/algebra';
import {inDfsOrder} from '../../shared/trees';
import {HGraph} from '../../shared/hgraph';
import Color = Cesium.Color;
import Cartesian3 = Cesium.Cartesian3;

export class NetworkingDataProvider implements IDataProvider {
    private meta: IMetaInfo;
    private root: ISpatialNodeInfo;
    private events: IEventInfo[];

    constructor() {
        this.meta = {
            rootNodeId: 1,
            startTime: new Date(2019, 1, 1, 0, 0, 0),
            endTime: new Date(2019, 1, 1, 0, 3, 0),
        };

        let nextId = this.meta.rootNodeId + 1;

        function generateId() {
            return nextId++;
        }

        const idsByName: {[name:string]:number} = {};

        function nodeIdByName(name: string) {
            if (!idsByName[name])
                idsByName[name] = generateId();
            return idsByName[name];
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

        function newArcPipe(fromName: string, toName: string) {
            return {
                type: PipeType.Arc,
                width: 1,
                fromNodeId: nodeIdByName(fromName),
                toNodeId: nodeIdByName(toName),
                biDirectional: true,
                customProps: {},
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
                id: fields.id || nodeIdByName(fields.name),
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

        const pipe_Cambridge_Machba = newArcPipe("Cambridge", "Machba");
        const pipe_Machba_Technion = newArcPipe("Machba", "Technion Computer Center");
        const pipe_Machba_Hebrew = newArcPipe("Machba", "Hebrew University");

        const pipe_TechnionCC_CS = newArcPipe("Technion Computer Center", "Technion CS");
        const pipe_TechnionCC_EE = newArcPipe("Technion Computer Center", "Technion EE");

        const pipe_TechnionCS_First: IPipeInfo = {
            type: PipeType.Explicit,
            width: 1,
            fromNodeId: nodeIdByName("Technion CS"),
            toNodeId: nodeIdByName("Technion CS First"),
            biDirectional: true,
            customProps: {},
            explicitPath: {
                interpolationType: PointListInterpolationType.Cubic,
                components: [
                    {
                        nodeId: nodeIdByName("Technion Ground"),
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

        const pipe_TechnionCS_Second: IPipeInfo = {
            type: PipeType.Explicit,
            width: 1,
            fromNodeId: nodeIdByName("Technion CS"),
            toNodeId: nodeIdByName("Technion CS Second"),
            biDirectional: true,
            customProps: {},
            explicitPath: {
                interpolationType: PointListInterpolationType.Cubic,
                components: [
                    {
                        nodeId: nodeIdByName("Technion Ground"),
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

        const pipe_TechnionCS_Third: IPipeInfo = {
            type: PipeType.Explicit,
            width: 1,
            fromNodeId: nodeIdByName("Technion CS"),
            toNodeId: nodeIdByName("Technion CS Third"),
            biDirectional: true,
            customProps: {},
            explicitPath: {
                interpolationType: PointListInterpolationType.Cubic,
                components: [
                    {
                        nodeId: nodeIdByName("Technion Ground"),
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

        const pipe_Machba_BGU = newArcPipe("Machba", "Ben Gurion University");
        const pipe_Heb_BGU = newArcPipe("Hebrew University", "Ben Gurion University");
        const pipe_Machba_Ariel = newArcPipe("Machba", "Ariel University");
        const pipe_Technion_Ariel = newArcPipe("Technion Computer Center", "Ariel University");
        const pipe_Heb_Ariel = newArcPipe("Hebrew University", "Ariel University");
        const pipe_Technion_Berlin = newArcPipe("Technion Computer Center", "Berlin University");

        this.root = newNode({
            id: this.meta.rootNodeId,
            name: 'Root',
            transform: transformZero(),
            pipes: [
                pipe_Cambridge_Machba,
                pipe_Technion_Berlin
            ],
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

                        pipe_Machba_BGU,
                        pipe_Heb_BGU,
                        pipe_Machba_Ariel,
                        pipe_Technion_Ariel,
                        pipe_Heb_Ariel
                    ],
                    children: [
                        newNode({
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
                            name: 'Technion CS Building',
                            transform: posAbsDeg(35.0215658, 32.7776437),
                            pipes: [
                                pipe_TechnionCS_First,
                                pipe_TechnionCS_Second,
                                pipe_TechnionCS_Third,
                            ],
                            children: [
                                newNode({
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
                                                    name: 'Technion CS',
                                                    transform: transformRelativeIdentity(),
                                                    site: {
                                                        name: "Technion CS",
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
                                                    name: 'Technion CS First',
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
                                                    name: 'Technion CS Second',
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
                                                    name: 'Technion CS Third',
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
                            name: 'Hebrew University',
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
                            name: "Ben Gurion University",
                            transform: posAbsDeg(34.8041082, 31.2622686),
                            site: {
                                name: "Ben Gurion University - CS",
                                description: `<p>The Department of Computer Science at Ben-Gurion University originated from 
the Computer Science program in the Mathematics department and was founded as an independent department in the year 2000. 
Although it is one of the youngest departments in Ben Gurion University, it is the fastest to grow, 
leading the growth of BGU as a whole in both research and education. 
With close to 450 new undergraduate students accepted to its different academic programs, 
the Computer Science department is already the largest in the university, teaching more than 1500 students in its student body. 
With 36 full time faculty, it is also among the largest in terms of academic staff whose research activities span virtually all Computer Science research areas. 
The department prides itself with strong international reputation and world class research that are complemented by vigorous and exciting research atmosphere, 
state-of-the-art research labs, and a spirit of congeniality and collegiality.</p>`,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        }),
                        newNode({
                            name: "Ariel University",
                            transform: posAbsDeg(35.2071627, 32.1037157),
                            site: {
                                name: "Ariel University - CS",
                                description: `<p>The Department of Computer Science at Ariel University 
offers an undergraduate curriculum towards the Bachelor's degree, 
as well as a graduate program culminating in Master's and Doctorate degrees. 
The department is a young and vibrant one, with faculty focused on such areas as 
computer vision, machine learning, data mining and compression, artificial intelligence, 
computational geometry, graph theory, approximation algorithms, cryptography, robotics, bioinformatics and combinatorics.</p>`,
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
                            site: {
                                name: "Techion - Computer Center",
                                description: "<p></p>",
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        }),
                        newNode({
                            name: 'Technion EE',
                            transform: posAbsDeg(35.0251956, 32.7758146),
                            site: {
                                name: "Techion - Electrical Engineering",
                                description: "<p></p>",
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: 'UK',
                    transform: posAbsDeg(-2.5091442, 54.4338846),
                    children: [
                        newNode({
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
                }),
                newNode({
                    name: 'Germany',
                    transform: posAbsDeg(9.9837941, 51.2488038),
                    children: [
                        newNode({
                            name: 'Berlin University',
                            transform: posAbsDeg(13.2971595, 52.4559518),
                            site: {
                                name: "University of Cambridge - Computer Laboratory",
                                description: `<p></p>`,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                })
            ]
        });

        function randomElem<T>(array: T[]) {
            const index = Math.floor((Math.random() * array.length));
            return array[index];
        }

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

            const interUniPipes = [
                pipe_Heb_Ariel,
                pipe_Heb_BGU,
                pipe_Machba_Ariel,
                pipe_Machba_BGU,
                pipe_Machba_Hebrew,
                pipe_Machba_Technion,
                pipe_Technion_Ariel,
            ];

            const self = this;

            function createPackage(time: Date, packageId: number, info: IPackageInfo) : IPackageCreatedEventInfo {
                const event = <IPackageCreatedEventInfo>{
                    time: time,
                    genericEventType: GenericEventType.Package,
                    packageEventType: PackageEventType.Created,
                    packageId: packageId,
                    package: info
                };
                self.events.push(event);
                return event;
            }

            function movePackageToSite(time: Date, packageId: number, info: ISitePackagePositionInfo) {
                self.events.push(<IPackageMovedEventInfo>{
                    time: time,
                    genericEventType: GenericEventType.Package,
                    packageEventType: PackageEventType.Moved,
                    packageId: packageId,
                    newPosition: info
                });
            }

            function movePackageToPackage(time: Date, packageId: number, info: IParentPackagePackagePositionInfo) {
                self.events.push(<IPackageMovedEventInfo>{
                    time: time,
                    genericEventType: GenericEventType.Package,
                    packageEventType: PackageEventType.Moved,
                    packageId: packageId,
                    newPosition: info
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

            function movePackageAbsolute(time: Date, packageId: number, info: IAbsolutePackagePositionInfo) {
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

            const companies: Array<{name: string, color: IColor}> = [
                {
                    name: "Google",
                    color: new Color(0, 0.8, 0)
                },
                {
                    name: "IBM",
                    color: new Color(0, 1, 1)
                },
                {
                    name: "Amazon",
                    color: new Color(1, 1, 0)
                },
                {
                    name: "Microsoft",
                    color: new Color(0, 0, 1)
                },
            ];

            // TRANSFERS
            {
                let currentTime = this.meta.startTime;

                for (let i = 0; i < 200; i++) {
                    const pipe = randomElem(interUniPipes);
                    const fromToIds = [pipe.fromNodeId, pipe.toNodeId];
                    if (Math.random() > 0.5)
                        fromToIds.reverse();
                    const fromId = fromToIds[0];
                    const toId = fromToIds[1];

                    const company = randomElem(companies);
                    const packageId = generateId();
                    const sizeInGigs = 2 * (10 + 90 * Math.random());
                    const durationInSeconds = sizeInGigs / 10;

                    let currentPackageTime = currentTime;

                    createPackage(currentPackageTime, packageId, {
                        name: `${packageId}: ${company.name} transfer from ${nodesById[fromId].name} to ${nodesById[toId].name}`,
                        description: `<p>Size: ${sizeInGigs} GB<br/>Duration: ${durationInSeconds} sec</p>`,
                        customProps: {},
                        visual: {
                            billboard: {
                                image: "/images/white-square.png",
                                color: company.color,
                                width: 16,
                                height: 16,
                                eyeOffset: new Cartesian3(0, 0, -2)
                            }
                        }
                    });

                    movePackageToPipe(addSeconds(currentPackageTime, 0.01), packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: fromId,
                        toSiteNodeId: toId,
                        interpolationAmount: 0
                    });

                    currentPackageTime = addSeconds(currentPackageTime, durationInSeconds);

                    movePackageToPipe(addSeconds(currentPackageTime, 0.01), packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: fromId,
                        toSiteNodeId: toId,
                        interpolationAmount: 1
                    });

                    destroyPackage(addSeconds(currentPackageTime, 0.01), packageId);

                    currentTime = addSeconds(currentTime, 0.1 + 3 * Math.random());
                }
            }

            // USER
            {
                let currentTime = this.meta.startTime;

                for (let i = 0; i < 200; i++) {
                    const pipe = randomElem(interUniPipes);
                    const fromToIds = [pipe.fromNodeId, pipe.toNodeId];
                    if (Math.random() > 0.5)
                        fromToIds.reverse();
                    const fromId = fromToIds[0];
                    const toId = fromToIds[1];

                    const company = randomElem(companies);
                    const packageId = generateId();
                    const durationInSeconds = 3;

                    let currentPackageTime = currentTime;

                    createPackage(currentPackageTime, packageId, {
                        name: `${packageId}: ${company.name} user data from ${nodesById[fromId].name} to ${nodesById[toId].name}`,
                        description: "",
                        customProps: {},
                        visual: {
                            billboard: {
                                image: "/images/packet2.png",
                                color: company.color,
                                width: 16,
                                height: 16,
                                eyeOffset: new Cartesian3(0, 0, -2)
                            }
                        }
                    });

                    movePackageToPipe(addSeconds(currentPackageTime, 0.01), packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: fromId,
                        toSiteNodeId: toId,
                        interpolationAmount: 0
                    });

                    currentPackageTime = addSeconds(currentPackageTime, durationInSeconds);

                    movePackageToPipe(addSeconds(currentPackageTime, 0.01), packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: fromId,
                        toSiteNodeId: toId,
                        interpolationAmount: 1
                    });

                    destroyPackage(addSeconds(currentPackageTime, 0.01), packageId);

                    currentTime = addSeconds(currentTime, 0.1 + 3 * Math.random());
                }
            }

            const externalPipes = [
                pipe_Cambridge_Machba,
                pipe_Technion_Berlin
            ];

            // EXTERNAL
            {
                let currentTime = this.meta.startTime;

                for (let i = 0; i < 200; i++) {
                    const pipe = randomElem(externalPipes);
                    const fromToIds = [pipe.fromNodeId, pipe.toNodeId];
                    if (Math.random() > 0.5)
                        fromToIds.reverse();
                    const fromId = fromToIds[0];
                    const toId = fromToIds[1];

                    const company = randomElem(companies);
                    const packageId = generateId();
                    const sizeInGigs = 2 * (10 + 90 * Math.random());
                    const durationInSeconds = sizeInGigs / 10;

                    let currentPackageTime = currentTime;

                    createPackage(currentPackageTime, packageId, {
                        name: `${packageId}: ${company.name} transfer from ${nodesById[fromId].name} to ${nodesById[toId].name}`,
                        description: `<p>Size: ${sizeInGigs} GB<br/>Duration: ${durationInSeconds} sec</p>`,
                        customProps: {},
                        visual: {
                            billboard: {
                                image: "/images/white-square.png",
                                color: company.color,
                                width: 16,
                                height: 16,
                                eyeOffset: new Cartesian3(0, 0, -2)
                            }
                        }
                    });

                    movePackageToPipe(addSeconds(currentPackageTime, 0.01), packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: fromId,
                        toSiteNodeId: toId,
                        interpolationAmount: 0
                    });

                    currentPackageTime = addSeconds(currentPackageTime, durationInSeconds);

                    movePackageToPipe(addSeconds(currentPackageTime, 0.01), packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: fromId,
                        toSiteNodeId: toId,
                        interpolationAmount: 1
                    });

                    destroyPackage(addSeconds(currentPackageTime, 0.01), packageId);

                    currentTime = addSeconds(currentTime, 0.1 + 3 * Math.random());
                }
            }

            const technionPipes = [
               pipe_TechnionCC_CS,
               pipe_TechnionCC_EE,
               pipe_TechnionCS_First,
               pipe_TechnionCS_Second,
               pipe_TechnionCS_Third
            ];

            // Technion
            {
                let currentTime = this.meta.startTime;

                for (let i = 0; i < 200; i++) {
                    const pipe = randomElem(technionPipes);
                    const fromToIds = [pipe.fromNodeId, pipe.toNodeId];
                    if (Math.random() > 0.5)
                        fromToIds.reverse();
                    const fromId = fromToIds[0];
                    const toId = fromToIds[1];

                    const packageId = generateId();
                    const durationInSeconds = 3;

                    let currentPackageTime = currentTime;

                    createPackage(currentPackageTime, packageId, {
                        name: `${packageId}: Technion internal data from ${nodesById[fromId].name} to ${nodesById[toId].name}`,
                        description: "",
                        customProps: {},
                        visual: {
                            billboard: {
                                image: "/images/packet2.png",
                                color: new Color(0, 0, 0.8),
                                width: 16,
                                height: 16,
                                eyeOffset: new Cartesian3(0, 0, -2)
                            }
                        }
                    });

                    movePackageToPipe(addSeconds(currentPackageTime, 0.01), packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: fromId,
                        toSiteNodeId: toId,
                        interpolationAmount: 0
                    });

                    currentPackageTime = addSeconds(currentPackageTime, durationInSeconds);

                    movePackageToPipe(addSeconds(currentPackageTime, 0.01), packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: fromId,
                        toSiteNodeId: toId,
                        interpolationAmount: 1
                    });

                    destroyPackage(addSeconds(currentPackageTime, 0.01), packageId);

                    currentTime = addSeconds(currentTime, 0.1 + 0.5 * Math.random());
                }
            }

            // ERRORS
            {
                let currentTime = addSeconds(this.meta.startTime, 10);

                const pipe = pipe_Machba_Hebrew;
                const currentErrorIds: number[] = [];

                interface ErrorEvent {
                    time: Date,
                    errorId: number,
                    emitOwnEvents: () => void,
                    applyToList: () => void
                }

                const errorEvents: ErrorEvent[] = [];
                const stack = new Error().stack;

                // todo: find out why 10 does not work
                for (let i = 0; i < 4; i++) {
                    const errorStartTime = currentTime;
                    const errorId = generateId();
                    errorEvents.push({
                        time: errorStartTime,
                        errorId: errorId,
                        emitOwnEvents: () => {
                            createPackage(errorStartTime, errorId, {
                                name: "Error " + errorId,
                                description: stack,
                                customProps: {},
                                visual: {
                                    billboard: {
                                        image: "/images/packet2.png",
                                        color: Color.RED,
                                        width: 16,
                                        height: 16,
                                        eyeOffset: new Cartesian3(0, 0, -2)
                                    }
                                }
                            });
                            movePackageToPipe(addSeconds(errorStartTime, 0.01), errorId, {
                                type: PackagePositionInfoType.Pipe,
                                fromSiteNodeId: pipe.fromNodeId,
                                toSiteNodeId: pipe.toNodeId,
                                interpolationAmount: 0
                            });
                        },
                        applyToList: () => currentErrorIds.push(errorId)
                    });
                    const errorEndTime = addSeconds(errorStartTime, 10);
                    errorEvents.push({
                        time: errorEndTime,
                        errorId: errorId,
                        emitOwnEvents: () => {
                            movePackageToPipe(addSeconds(errorEndTime, 0.3), errorId, {
                                type: PackagePositionInfoType.Pipe,
                                fromSiteNodeId: pipe.fromNodeId,
                                toSiteNodeId: pipe.toNodeId,
                                interpolationAmount: 1
                            });
                            destroyPackage(addSeconds(errorEndTime,0.31), errorId);
                        },
                        applyToList: () => currentErrorIds.splice(currentErrorIds.indexOf(errorId), 1)
                    });

                    currentTime = addSeconds(currentTime, 0.7 + 3 * Math.random());
                }

                errorEvents.sort((x, y) => x.time.getTime() - y.time.getTime());

                for (let errorEvent of errorEvents) {
                    console.log(`time: ${errorEvent.time}, error: ${errorEvent.errorId}`);

                    for (let i = 0; i < currentErrorIds.length; i++) {
                        const errorId = currentErrorIds[i];
                        movePackageToPipe(addSeconds(errorEvent.time, 0.1), errorId, {
                            type: PackagePositionInfoType.Pipe,
                            fromSiteNodeId: pipe.fromNodeId,
                            toSiteNodeId: pipe.toNodeId,
                            interpolationAmount: (2 + i) / (currentErrorIds.length + 3)
                        });
                    }

                    errorEvent.emitOwnEvents();
                    errorEvent.applyToList();

                    currentErrorIds.sort();
                    currentErrorIds.reverse();

                    for (let i = 0; i < currentErrorIds.length; i++) {
                        const errorId = currentErrorIds[i];
                        movePackageToPipe(addSeconds(errorEvent.time, 0.2), errorId, {
                            type: PackagePositionInfoType.Pipe,
                            fromSiteNodeId: pipe.fromNodeId,
                            toSiteNodeId: pipe.toNodeId,
                            interpolationAmount: (2 + i) / (currentErrorIds.length + 3)
                        });
                    }
                }
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