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
    IVisualInfo,
    PackageEventType,
    PackagePositionInfoType,
    PipeType
} from '../../shared/dataInfo';
import {CesiumTransform} from '../cesiumTransform';
import {inDfsOrder} from '../../shared/trees';
import {HGraph} from '../../shared/hgraph';

interface IPipeInfoWithDistance extends IPipeInfo {
    distanceFactor: number;
}

enum RegularTransferType {
    Plane = "PLANE",
    Truck = "TRUCK",
    Car = "CAR",
}

interface RegularTransferInfo {
    type: RegularTransferType,
    fromId: number;
    toId: number;
    departureTime: Date;
    arrivalTime: Date;
}

export class DeliveryDataProvider implements IDataProvider {
    private meta: IMetaInfo;
    private root: ISpatialNodeInfo;
    private events: IEventInfo[];

    constructor() {
        this.meta = {
            rootNodeId: 1,
            startTime: new Date(2019, 2, 1, 0, 0, 0),
            endTime: new Date(2019, 2, 8, 0, 0, 0),
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

        const rootId = this.meta.rootNodeId;

        function newArcPipe(fromName: string, toName: string, distanceFactor: number = 5) {
            return {
                type: PipeType.Arc,
                width: 1,
                fromNodeId: nodeIdByName(fromName),
                toNodeId: nodeIdByName(toName),
                biDirectional: true,
                customProps: {},
                distanceFactor: distanceFactor,
            }
        }

        function newLinePipe(fromName: string, toName: string, distanceFactor: number = 5) {
            return {
                type: PipeType.Line,
                width: 1,
                fromNodeId: nodeIdByName(fromName),
                toNodeId: nodeIdByName(toName),
                biDirectional: true,
                customProps: {},
                distanceFactor: distanceFactor,
            }
        }

        this.root = newNode({
            id: rootId,
            name: 'Root',
            transform: transformZero(),
            children: [
                newNode({
                    name: 'Israel',
                    transform: posAbsDeg(35.1004859, 31.653486),
                    children: [
                        newNode({
                            name: "Tel Aviv (TLV)",
                            transform: posAbsDeg(34.8709946, 32.000953),
                            site: {
                                name: "Tel Aviv (TLV)",
                                description: `<p></p>`,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        }),
                        newNode({
                            name: "Haifa",
                            transform: posAbsDeg(34.9901201, 32.7941799),
                            children: [
                                newNode({
                                    name: "Haifa - DLH",
                                    transform: posAbsDeg(35.0366101, 32.7821981),
                                    site: {
                                        name: "Haifa - DLH",
                                        description: ``,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                }),
                                newNode({
                                    name: 'TechnionCS',
                                    transform: posAbsDeg(35.0215658, 32.7776437),
                                    pipes: [
                                        //pipe_TechnionCS_First,
                                        //pipe_TechnionCS_Second,
                                        //pipe_TechnionCS_Third,
                                    ],
                                    collapsedVisuals: [dataCenterBillboard]
                                }),
                            ]
                        }),
                        newNode({
                            name: 'Medina Square',
                            transform: posAbsDeg(34.789813, 32.0867595)
                        }),
                    ],
                    pipes: [
                        newLinePipe("Tel Aviv (TLV)", "Haifa - DLH")
                    ]
                }),
                newNode({
                    name: 'United Kingdom',
                    transform: posAbsDeg(-2.5091442, 54.4338846),
                    children: [
                        newNode({
                            name: "London",
                            transform: posAbsDeg(-0.1280508, 51.5080475),
                            site: {
                                name: "London",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        }),
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
                            name: 'Berlin University - CS',
                            transform: posAbsDeg(13.2971595, 52.4559518),
                            site: {
                                name: "University of Cambridge - Computer Laboratory",
                                description: `<p></p>`,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "Japan",
                    transform: posAbsDeg(137.9962074, 35.3659505),
                    children: [
                        newNode({
                            name: "Kantou",
                            transform: posAbsDeg(140.4666173, 36.9512372),
                            children: [
                                newNode({
                                    name: "Tokyo (NRT)",
                                    transform: posAbsDeg(140.3856677, 35.7721535),
                                    site: {
                                        name: "Tokyo (NRT)",
                                        description: `<p></p>`,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                }),
                                newNode({
                                    name: "Tokyo",
                                    transform: posAbsDeg(139.7617401, 35.6823494),
                                    site: {
                                        name: "Tokyo",
                                        description: `<p></p>`,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                }),
                            ]
                        })
                    ],
                    pipes: [
                        newLinePipe("Tokyo (NRT)", "Tokyo"),
                    ]
                }),
                newNode({
                    name: "Russia",
                    transform: posAbsDeg(99.4458262, 61.7724599),
                    children: [
                        newNode({
                            name: "Moscow Region",
                            transform: posAbsDeg(38.1116047, 55.5862353),
                            children: [
                                newNode({
                                    name: "Moscow",
                                    transform: posAbsDeg(37.6194674, 55.7543369),
                                    children: [
                                        newNode({
                                            name: "Moscow (SVO)",
                                            transform: posAbsDeg(37.4155512, 55.9665638),
                                            site: {
                                                name: "Moscow (SVO)",
                                                description: `<p></p>`,
                                                customProps: {}
                                            },
                                            collapsedVisuals: [dataCenterBillboard]
                                        })
                                    ]
                                })
                            ]
                        }),
                        newNode({
                            name: "St Petersburg Region",
                            transform: posAbsDeg(31.9720931, 59.8250029),
                            children: [
                                newNode({
                                    name: "St Petersburg",
                                    transform: posAbsDeg(30.3176633, 59.9267214),
                                    site: {
                                        name: "St Petersburg",
                                        description: `<p></p>`,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                })
                            ]
                        }),
                        newNode({
                            name: "Sverdlov Region",
                            transform: posAbsDeg(62.0043498, 58.1801338),
                            children: [
                                newNode({
                                    name: "Yekaterinburg",
                                    transform: posAbsDeg(60.6040868, 56.8380923),
                                    children: [
                                        newNode({
                                            name: "Yekaterinburg (SVX)",
                                            transform: posAbsDeg(60.8012783, 56.7500524),
                                            site: {
                                                name: "Yekaterinburg (SVX)",
                                                description: `<p></p>`,
                                                customProps: {}
                                            },
                                            collapsedVisuals: [dataCenterBillboard]
                                        }),
                                        newNode({
                                            name: "Yekaterinburg - DLH",
                                            transform: posAbsDeg(60.6280362, 56.8142513),
                                            site: {
                                                name: "Yekaterinburg - DLH",
                                                description: `<p></p>`,
                                                customProps: {}
                                            },
                                            collapsedVisuals: [dataCenterBillboard]
                                        })
                                    ],
                                    pipes: [
                                        newLinePipe("Yekaterinburg (SVX)", "Yekaterinburg - DLH")
                                    ]
                                })
                            ]
                        })
                    ],
                    pipes: [
                        newArcPipe("Moscow (SVO)", "Yekaterinburg (SVX)"),
                        newArcPipe("Moscow (SVO)", "St Petersburg")
                    ]
                }),
                newNode({
                    name: "Netherlands",
                    transform: posAbsDeg(5.7910034, 52.1656177),
                    children: [
                        newNode({
                            name: "Amsterdam",
                            transform: posAbsDeg(4.8980809, 52.3742936),
                            children: [
                                newNode({
                                    name: "Amsterdam (AMS)",
                                    transform: posAbsDeg(4.7679968, 52.295412),
                                    site: {
                                        name: "Amsterdam (AMS)",
                                        description: `<p></p>`,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                })
                            ]
                        })
                    ]
                }),
                newNode({
                    name: "United States",
                    transform: posAbsDeg(-101.451485, 39.6265289),
                    children: [
                        newNode({
                            name: "New York State",
                            transform: posAbsDeg(-74.4323981, 40.9684236),
                            children: [
                                newNode({
                                    name: "New York",
                                    transform: posAbsDeg(-73.9762281, 40.7657356),
                                    site: {
                                        name: "New York",
                                        description: `<p></p>`,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                })
                            ]
                        }),
                        newNode({
                            name: "Washington State",
                            transform: posAbsDeg(-119.9696018, 47.2613147),
                            children: [
                                newNode({
                                    name: "Seattle",
                                    transform: posAbsDeg(-122.3302379, 47.6076121),
                                    site: {
                                        name: "Seattle",
                                        description: `<p></p>`,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                })
                            ]
                        }),
                        newNode({
                            name: "California State",
                            transform: posAbsDeg(-119.7175874, 36.4997247),
                            children: [
                                newNode({
                                    name: "Los Angeles",
                                    transform: posAbsDeg(-118.243048, 34.0537799),
                                    site: {
                                        name: "Los Angeles",
                                        description: `<p></p>`,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                })
                            ]
                        }),
                        newNode({
                            name: "Texas State",
                            transform: posAbsDeg(-119.7175874, 36.4997247),
                            children: [
                                newNode({
                                    name: "Austin",
                                    transform: posAbsDeg(-97.743011, 30.2663667),
                                    site: {
                                        name: "Austin",
                                        description: `<p></p>`,
                                        customProps: {}
                                    },
                                    collapsedVisuals: [dataCenterBillboard]
                                })
                            ]
                        }),
                    ],
                    pipes: [
                        newArcPipe("New York", "Seattle"),
                        newArcPipe("New York", "Austin"),
                        newArcPipe("Austin", "Los Angeles"),
                        newArcPipe("Seattle", "Los Angeles"),
                        newArcPipe("Seattle", "Austin"),
                        newArcPipe("New York", "Los Angeles"),
                    ]
                }),
                newNode({
                    name: "China",
                    transform: posAbsDeg(103.6641291, 34.7328017),
                    children: [
                        newNode({
                            name: "Hong Kong",
                            transform: posAbsDeg(114.1695104, 22.3191516),
                            site: {
                                name: "Hong Kong",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "India",
                    transform: posAbsDeg(79.5285308, 22.9335156),
                    children: [
                        newNode({
                            name: "New Delhi",
                            transform: posAbsDeg(77.2309776, 28.6128066),
                            site: {
                                name: "New Delhi",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "United Arab Emirates",
                    transform: posAbsDeg(54.0456952, 23.5979261),
                    children: [
                        newNode({
                            name: "Dubai (DBX)",
                            transform: posAbsDeg(55.3608195, 25.2488502),
                            site: {
                                name: "Dubai (DBX)",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "Singapore",
                    transform: posAbsDeg(103.9864475, 1.356063),
                    site: {
                        name: "Singapore",
                        description: ``,
                        customProps: {}
                    },
                    collapsedVisuals: [dataCenterBillboard]
                }),
                newNode({
                    name: "Australia",
                    transform: posAbsDeg(134.3093259, -25.0540066),
                    children: [
                        newNode({
                            name: "Sydney",
                            transform: posAbsDeg(151.1668654, -33.9366321),
                            site: {
                                name: "Syndey",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "Chilie",
                    transform: posAbsDeg(-70.301593, -26.7489973),
                    children: [
                        newNode({
                            name: "Santiago",
                            transform: posAbsDeg(-70.6505682, -33.4378638),
                            site: {
                                name: "Santiago",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "Brazil",
                    transform: posAbsDeg(-53.1983445, -8.5506167),
                    children: [
                        newNode({
                            name: "Sao Paulo",
                            transform: posAbsDeg(-46.6321814, -23.5476812),
                            site: {
                                name: "Sao Paulo",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "Egypt",
                    transform: posAbsDeg(29.7973324, 26.5900134),
                    children: [
                        newNode({
                            name: "Cairo",
                            transform: posAbsDeg(31.2366855, 30.0455103),
                            site: {
                                name: "Cairo",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "Mexico",
                    transform: posAbsDeg(-102.3549214, 23.9573819),
                    children: [
                        newNode({
                            name: "Mexico City",
                            transform: posAbsDeg(-99.1320339, 19.4323195),
                            site: {
                                name: "Mexico City",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "South Africa",
                    transform: posAbsDeg(24.2509729, -30.9142809),
                    children: [
                        newNode({
                            name: "Johannesburg",
                            transform: posAbsDeg(28.0464845, -26.204223),
                            site: {
                                name: "Johannesburg",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                }),
                newNode({
                    name: "Morocco",
                    transform: posAbsDeg(-6.330829, 31.8906017),
                    children: [
                        newNode({
                            name: "Casablanca",
                            transform: posAbsDeg(-7.5904349, 33.5728316),
                            site: {
                                name: "Casablanca",
                                description: ``,
                                customProps: {}
                            },
                            collapsedVisuals: [dataCenterBillboard]
                        })
                    ]
                })
            ],
            pipes: [
                //pipe_Cambridge_Machba,
                //pipe_Technion_Berlin,
                newArcPipe("Tokyo (NRT)", "Moscow (SVO)"),
                newArcPipe("Tokyo (NRT)", "Seattle"),
                //newArcPipe("Tokyo (NRT)", "St Petersburg"),
                //newArcPipe("Tokyo (NRT)", "London"),
                newArcPipe("London", "Tel Aviv (TLV)"),
                newArcPipe("London", "Moscow (SVO)"),
                newArcPipe("Tel Aviv (TLV)", "Moscow (SVO)"),
                newArcPipe("New York", "London"),
                newArcPipe("London", "Dubai (DBX)"),
                newArcPipe("Dubai (DBX)", "Singapore"),
                //newArcPipe("Dubai (DBX)", "Tokyo (NRT)"),
                newArcPipe("Singapore", "Tokyo (NRT)"),
                newArcPipe("Singapore", "Sydney"),
                newArcPipe("Tokyo (NRT)", "Sydney"),
                newArcPipe("Sydney", "Santiago"),
                newArcPipe("Santiago", "Sao Paulo"),
                newArcPipe("Santiago", "Mexico City"),
                newArcPipe("Sao Paulo", "Mexico City"),
                newArcPipe("Los Angeles", "Mexico City"),
                newArcPipe("Austin", "Mexico City"),
                newArcPipe("Sao Paulo", "Johannesburg"),
                //newArcPipe("Johannesburg", "Casablanca"),
                newArcPipe("Dubai (DBX)", "Johannesburg"),
                newArcPipe("London", "Casablanca"),
                //newArcPipe("Dubai (DBX)", "Casablanca"),
                //newArcPipe("Tel Aviv (TLV)", "Hong Kong"),
                newArcPipe("Tel Aviv (TLV)", "New Delhi"),
                //newArcPipe("Dubai (DBX)", "Hong Kong"),
                newArcPipe("Dubai (DBX)", "New Delhi"),
                newArcPipe("Singapore", "Hong Kong"),
                newArcPipe("Tokyo (NRT)", "Hong Kong"),
                newArcPipe("Singapore", "Sydney"),
                newArcPipe("Hong Kong", "New Delhi"),
                newArcPipe("Hong Kong", "Moscow (SVO)"),
                //newArcPipe("Tel Aviv (TLV)", "Cairo"),
                newArcPipe("Dubai (DBX)", "Cairo"),
                newArcPipe("Cairo", "Casablanca"),
                newArcPipe("Cairo", "Johannesburg"),
            ],
        });

        function addSeconds(date: Date, seconds: number): Date {
            return new Date(date.getTime() + seconds * 1000);
        }

        function addMinutes(date: Date, minutes: number): Date {
            return new Date(date.getTime() + minutes * 1000 * 60);
        }

        function addHours(date: Date, hours: number): Date {
            return new Date(date.getTime() + hours * 1000 * 60 * 60);
        }

        const regularTransfers: RegularTransferInfo[] = [];

        function addFlight(fromName: string, toName: string, departure: Date, arrival: Date) {
            regularTransfers.push({
                type: RegularTransferType.Plane,
                fromId: nodeIdByName(fromName),
                toId: nodeIdByName(toName),
                departureTime: departure,
                arrivalTime: arrival
            })
        }

        function addTruck(fromName: string, toName: string, departure: Date, arrival: Date) {
            regularTransfers.push({
                type: RegularTransferType.Truck,
                fromId: nodeIdByName(fromName),
                toId: nodeIdByName(toName),
                departureTime: departure,
                arrivalTime: arrival
            })
        }

        for (let date = this.meta.startTime; date < this.meta.endTime; date = addHours(date, 24)) {
            addFlight("Moscow (SVO)", "Tokyo (NRT)", addHours(date, 20.1), addHours(date, 30.2));
            addFlight("Tokyo (NRT)", "Moscow (SVO)", addHours(date, 32.1), addHours(date, 42.2));

            addFlight("Moscow (SVO)", "Tel Aviv (TLV)", addHours(date, 1.5), addHours(date, 5));
            addFlight("Moscow (SVO)", "Tel Aviv (TLV)", addHours(date, 7.1), addHours(date, 10.75));
            addFlight("Moscow (SVO)", "Tel Aviv (TLV)", addHours(date, 8.5), addHours(date, 11.9));
            addFlight("Moscow (SVO)", "Tel Aviv (TLV)", addHours(date, 19.3), addHours(date, 23));

            addFlight("Tel Aviv (TLV)", "Moscow (SVO)", addHours(date, 0.55), addHours(date, 6.1));
            addFlight("Tel Aviv (TLV)", "Moscow (SVO)", addHours(date, 7.1), addHours(date, 12.75));
            addFlight("Tel Aviv (TLV)", "Moscow (SVO)", addHours(date, 11.8), addHours(date, 24 + 5.45));
            addFlight("Tel Aviv (TLV)", "Moscow (SVO)", addHours(date, 13.3), addHours(date, 18.9));

            addFlight("Moscow (SVO)", "Yekaterinburg (SVX)", addHours(date, 0.66), addHours(date, 3.1));
            addFlight("Moscow (SVO)", "Yekaterinburg (SVX)", addHours(date, 13), addHours(date, 13.5));
            addFlight("Moscow (SVO)", "Yekaterinburg (SVX)", addHours(date, 23.1), addHours(date, 25.66));

            addFlight("Yekaterinburg (SVX)", "Moscow (SVO)", addHours(date, 4.1), addHours(date, 6.55));
            addFlight("Yekaterinburg (SVX)", "Moscow (SVO)", addHours(date, 14.4), addHours(date, 19.3));
            addFlight("Yekaterinburg (SVX)", "Moscow (SVO)", addHours(date, 19.2), addHours(date, 21.75));

            for (let i = 7.12; i < 24; i += 1) {
                addFlight("Moscow (SVO)", "St Petersburg", addHours(date, i), addHours(date, i + 1.5));
                addFlight("St Petersburg", "Moscow (SVO)", addHours(date, i + 0.5), addHours(date, i + 0.5 + 1.5));
            }

            for (let i = 0.23; i < 24; i += 1.1 + Math.random() * 3) {
                addFlight("Seattle", "New York", addHours(date, i), addHours(date, i + 5.4));
                addFlight("New York", "Seattle", addHours(date, i + 0.2), addHours(date, i + 0.2 + 5.5));
            }

            for (let i = 0.33; i < 24; i += 1.1 + Math.random() * 3) {
                addFlight("Seattle", "Austin", addHours(date, i), addHours(date, i + 5.4));
                addFlight("Austin", "Seattle", addHours(date, i + 0.2), addHours(date, i + 0.2 + 5.5));
            }

            for (let i = 0.43; i < 24; i += 1.1 + Math.random() * 3) {
                addFlight("New York", "Austin", addHours(date, i), addHours(date, i + 4.2));
                addFlight("Austin", "New York", addHours(date, i + 0.2), addHours(date, i + 0.2 + 4.2));
            }

            for (let i = 0.53; i < 24; i += 1.1 + Math.random() * 3) {
                addFlight("New York", "Los Angeles", addHours(date, i), addHours(date, i + 5.4));
                addFlight("Los Angeles", "New York", addHours(date, i + 0.2), addHours(date, i + 0.2 + 5.5));
            }

            for (let i = 0.63; i < 24; i += 1.1 + Math.random() * 3) {
                addFlight("Seattle", "Los Angeles", addHours(date, i), addHours(date, i + 2.8));
                addFlight("Los Angeles", "Seattle", addHours(date, i + 0.2), addHours(date, i + 0.2 + 2.8));
            }

            for (let i = 0.1; i < 24; i += 2.2 + Math.random() * 3) {
                addFlight("New York", "London", addHours(date, i), addHours(date, i + 6.9));
                addFlight("London", "New York", addHours(date, i + 0.6), addHours(date, i + 0.6 + 8.1));
            }

            addFlight("London", "Moscow (SVO)", addHours(date, 1.5), addHours(date, 5.2));
            addFlight("London", "Moscow (SVO)", addHours(date, 13.66), addHours(date, 17.7));
            addFlight("London", "Moscow (SVO)", addHours(date, 16.5), addHours(date, 20.45));

            addFlight("Moscow (SVO)", "London", addHours(date, 8), addHours(date, 8 + 4.4));
            addFlight("Moscow (SVO)", "London", addHours(date, 14.8), addHours(date, 14.8 + 4.4));
            addFlight("Moscow (SVO)", "London", addHours(date, 19.5), addHours(date, 19.5 + 4.4));

            for (let i = 1; i < 24; i += 8.2 + Math.random() * 3) {
                addFlight("Tokyo (NRT)", "Seattle", addHours(date, i), addHours(date, i + 10));
                addFlight("Seattle", "Tokyo (NRT)", addHours(date, i + 2), addHours(date, i + 2 + 10));
            }

            for (let i = 1.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Tel Aviv (TLV)", "London", addHours(date, i), addHours(date, i + 5));
                addFlight("London", "Tel Aviv (TLV)", addHours(date, i + 2), addHours(date, i + 2 + 5));
            }

            for (let i = 2; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Dubai (DBX)", "London", addHours(date, i), addHours(date, i + 7));
                addFlight("London", "Dubai (DBX)", addHours(date, i + 2), addHours(date, i + 2 + 7));
            }

            for (let i = 2.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Dubai (DBX)", "Singapore", addHours(date, i), addHours(date, i + 8));
                addFlight("Singapore", "Dubai (DBX)", addHours(date, i + 2), addHours(date, i + 2 + 8));
            }

            for (let i = 3; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Tokyo (NRT)", "Singapore", addHours(date, i), addHours(date, i + 7));
                addFlight("Singapore", "Tokyo (NRT)", addHours(date, i + 2), addHours(date, i + 2 + 7));
            }

            for (let i = 3.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Sydney", "Singapore", addHours(date, i), addHours(date, i + 8));
                addFlight("Singapore", "Sydney", addHours(date, i + 2), addHours(date, i + 2 + 8));
            }

            for (let i = 4; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Sydney", "Tokyo (NRT)", addHours(date, i), addHours(date, i + 9.5));
                addFlight("Tokyo (NRT)", "Sydney", addHours(date, i + 2), addHours(date, i + 2 + 9.5));
            }

            for (let i = 4.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Sydney", "Santiago", addHours(date, i), addHours(date, i + 14));
                addFlight("Santiago", "Sydney", addHours(date, i + 2), addHours(date, i + 2 + 14));
            }

            for (let i = 5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Santiago", "Sao Paulo", addHours(date, i), addHours(date, i + 3.9));
                addFlight("Sao Paulo", "Santiago", addHours(date, i + 2), addHours(date, i + 2 + 3.9));
            }

            for (let i = 5.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Santiago", "Mexico City", addHours(date, i), addHours(date, i + 8.2));
                addFlight("Mexico City", "Santiago", addHours(date, i + 2), addHours(date, i + 2 + 8.2));
            }

            for (let i = 6; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Sao Paulo", "Mexico City", addHours(date, i), addHours(date, i + 9.9));
                addFlight("Mexico City", "Sao Paulo", addHours(date, i + 2), addHours(date, i + 2 + 9.9));
            }

            for (let i = 6.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Los Angeles", "Mexico City", addHours(date, i), addHours(date, i + 3.6));
                addFlight("Mexico City", "Los Angeles", addHours(date, i + 2), addHours(date, i + 2 + 3.6));
            }

            for (let i = 7; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Austin", "Mexico City", addHours(date, i), addHours(date, i + 2.4));
                addFlight("Mexico City", "Austin", addHours(date, i + 2), addHours(date, i + 2 + 2.4));
            }

            for (let i = 7.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Sao Paulo", "Johannesburg", addHours(date, i), addHours(date, i + 9));
                addFlight("Johannesburg", "Sao Paulo", addHours(date, i + 2), addHours(date, i + 2 + 9));
            }

            for (let i = 8; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Dubai (DBX)", "Johannesburg", addHours(date, i), addHours(date, i + 9.5));
                addFlight("Johannesburg", "Dubai (DBX)", addHours(date, i + 2), addHours(date, i + 2 + 9.5));
            }

            for (let i = 8.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("London", "Casablanca", addHours(date, i), addHours(date, i + 3.6));
                addFlight("Casablanca", "London", addHours(date, i + 2), addHours(date, i + 2 + 3.6));
            }

            for (let i = 9; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("London", "Casablanca", addHours(date, i), addHours(date, i + 3.6));
                addFlight("Casablanca", "London", addHours(date, i + 2), addHours(date, i + 2 + 3.6));
            }

            for (let i = 9.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("New Delhi", "Tel Aviv (TLV)", addHours(date, i), addHours(date, i + 6.5));
                addFlight("Tel Aviv (TLV)", "New Delhi", addHours(date, i + 2), addHours(date, i + 2 + 6.5));
            }

            for (let i = 9.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Dubai (DBX)", "New Delhi", addHours(date, i), addHours(date, i + 3.75));
                addFlight("New Delhi", "Dubai (DBX)", addHours(date, i + 2), addHours(date, i + 2 + 3.75));
            }

            for (let i = 10; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Singapore", "Hong Kong", addHours(date, i), addHours(date, i + 3.9));
                addFlight("Hong Kong", "Singapore", addHours(date, i + 2), addHours(date, i + 2 + 3.9));
            }

            for (let i = 10.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Tokyo (NRT)", "Hong Kong", addHours(date, i), addHours(date, i + 5.8));
                addFlight("Hong Kong", "Tokyo (NRT)", addHours(date, i + 2), addHours(date, i + 2 + 5.8));
            }

            for (let i = 11; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Tokyo (NRT)", "Hong Kong", addHours(date, i), addHours(date, i + 5.8));
                addFlight("Hong Kong", "Tokyo (NRT)", addHours(date, i + 2), addHours(date, i + 2 + 5.8));
            }

            for (let i = 11.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Singapore", "Sydney", addHours(date, i), addHours(date, i + 7.9));
                addFlight("Sydney", "Singapore", addHours(date, i + 2), addHours(date, i + 2 + 7.9));
            }

            for (let i = 12; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Hong Kong", "New Delhi", addHours(date, i), addHours(date, i + 6));
                addFlight("New Delhi", "Hong Kong", addHours(date, i + 2), addHours(date, i + 2 + 6));
            }

            for (let i = 12.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Moscow (SVO)", "Hong Kong", addHours(date, i), addHours(date, i + 9.5));
                addFlight("Hong Kong", "Moscow (SVO)", addHours(date, i + 2), addHours(date, i + 2 + 9.5));
            }

            for (let i = 13; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Dubai (DBX)", "Cairo", addHours(date, i), addHours(date, i + 4));
                addFlight("Cairo", "Dubai (DBX)", addHours(date, i + 2), addHours(date, i + 2 + 4));
            }

            for (let i = 13.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Cairo", "Marrakech", addHours(date, i), addHours(date, i + 5.6));
                addFlight("Marrakech", "Cairo", addHours(date, i + 2), addHours(date, i + 2 + 5.6));
            }

            for (let i = 13.5; i < 24; i += 5.2 + Math.random() * 3) {
                addFlight("Cairo", "Johannesburg", addHours(date, i), addHours(date, i + 8.1));
                addFlight("Johannesburg", "Cairo", addHours(date, i + 2), addHours(date, i + 2 + 8.1));
            }

            // ==== TRUCKS ====

            for (let i = 6 + 6; i < 22 + 6; i += 2) {
                addTruck("Tokyo", "Tokyo (NRT)", addHours(date, i), addHours(date, i + 1.5));
                addTruck("Tokyo (NRT)", "Tokyo", addHours(date, i + 2), addHours(date, i + 3.5));
            }

            addTruck("Yekaterinburg - DLH", "Yekaterinburg (SVX)", addHours(date, 7 + 2), addHours(date, 8 + 2));
            addTruck("Yekaterinburg (SVX)", "Yekaterinburg - DLH", addHours(date, 9 + 2), addHours(date, 10 + 2));
            addTruck("Yekaterinburg - DLH", "Yekaterinburg (SVX)", addHours(date, 14 + 2), addHours(date, 15 + 2));
            addTruck("Yekaterinburg (SVX)", "Yekaterinburg - DLH", addHours(date, 16 + 2), addHours(date, 17 + 2));

            addTruck("Haifa - DLH", "Tel Aviv (TLV)", addHours(date, 7 + 2), addHours(date, 8 + 2));
            addTruck("Tel Aviv (TLV)", "Haifa - DLH", addHours(date, 9 + 2), addHours(date, 10 + 2));
            addTruck("Haifa - DLH", "Tel Aviv (TLV)", addHours(date, 14 + 2), addHours(date, 15 + 2));
            addTruck("Tel Aviv (TLV)", "Haifa - DLH", addHours(date, 16 + 2), addHours(date, 17 + 2));
        }

        const goods: Array<{name: string, sourceId: number}> = [
            {
                name: "Books",
                sourceId: nodeIdByName("Tokyo")
            },
            {
                name: "Electronics",
                sourceId: nodeIdByName("Seattle")
            },
            {
                name: "Clothes",
                sourceId: nodeIdByName("Hong Kong")
            },
            {
                name: "Games",
                sourceId: nodeIdByName("Singapore")
            },
        ];

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

            // NEW
            {
                const planeVisual: IVisualInfo = {
                    model: {
                        uri: "/models/Cesium_Air.glb",
                        color: Cesium.Color.add(Cesium.Color.YELLOW, Cesium.Color.GRAY, new Cesium.Color()),
                        //scale: 1,
                        minimumPixelSize: 96,
                        maximumScale : 20000,
                        //silhouetteColor: Cesium.Color.ORANGE,
                        //silhouetteSize: 2
                    },
                };

                const truckVisual: IVisualInfo = {
                    model: {
                        uri: "/models/GroundVehicle.glb",
                        color: Cesium.Color.add(Cesium.Color.YELLOW, Cesium.Color.GRAY, new Cesium.Color()),
                        //scale: 1,
                        minimumPixelSize: 96,
                        maximumScale : 2000
                    },
                };

                const carVisual: IVisualInfo = {
                    model: {
                        uri: "/models/CesiumMilkTruck-kmc.glb",
                        //uri: "/models/GroundVehicle.glb",
                        color: Cesium.Color.add(Cesium.Color.YELLOW, Cesium.Color.GRAY, new Cesium.Color()),
                        //scale: 1,
                        minimumPixelSize: 96,
                        maximumScale : 200
                    },
                };

                const wrappedVisual: IVisualInfo = {
                    billboard: {
                        image: "/images/packet2.png",
                        color: Cesium.Color.BLACK,
                        width: 1,
                        height: 1,
                        eyeOffset: {x: 0, y: 0, z: 0}
                    }
                };

                function getRegularVisualByType(type: RegularTransferType) : IVisualInfo {
                    switch (type) {
                        case RegularTransferType.Plane: return planeVisual;
                        case RegularTransferType.Truck: return truckVisual;
                        case RegularTransferType.Car: return carVisual;
                        default: throw "OutOfRangeException";
                    }
                }

                function findNextRegularTransfer(fromId: number, toId: number, time: Date) : RegularTransferInfo | undefined {
                    let allTransfers = regularTransfers
                        .filter(x => x.fromId == fromId && x.toId == toId && x.departureTime > time);
                    return allTransfers.length > 0
                        ? allTransfers.reduce((x, y) => x.departureTime <= y.departureTime ? x : y)
                        : undefined;
                }

                interface RegularPackageInfo {
                    transfer: RegularTransferInfo,
                    packageId: number,
                    creationEvent: IPackageCreatedEventInfo,
                    itemInfos: RegularPackageItemInfo[]
                }

                interface RegularPackageItemInfo {
                    id: number,
                    shortDesc: string,
                    fromName: string,
                    toName: string
                }

                const regularPackages: RegularPackageInfo[] = [];

                function buildDescription(itemInfos: RegularPackageItemInfo[]) {
                    let result = '<style>table {width: 100%;border-collapse: collapse;} table td {border: 1px solid white; text-align: center;}</style>\n';
                    result += "<table><tr><th>ID</th><th>CONTENT</th><th>FROM</th><th>TO</th></tr>\n";
                    for (let itemInfo of itemInfos) {
                        result += `<tr><td>${itemInfo.id}</td><td>${itemInfo.shortDesc}</td><td>${itemInfo.fromName}</td><td>${itemInfo.toName}</td></tr>\n`
                    }
                    result += "</table>";
                    return result;
                }

                function registerItemForRegularTransfer(transfer: RegularTransferInfo, itemInfo: RegularPackageItemInfo): number {
                    const existing = regularPackages.filter(x =>
                        x.transfer.fromId == transfer.fromId &&
                        x.transfer.toId == transfer.toId &&
                        x.transfer.departureTime == transfer.departureTime);
                    if (existing.length > 0) {
                        const existingPackage = existing[0];
                        existingPackage.itemInfos.push(itemInfo);
                        existingPackage.creationEvent.package.description = buildDescription(existingPackage.itemInfos);
                        return existingPackage.packageId;
                    }

                    const packageId = generateId();

                    const creationEvent = createPackage(addHours(transfer.departureTime, -0.01), packageId, {
                        name: `Transfer ${packageId} from ${nodesById[transfer.fromId].name} to ${nodesById[transfer.toId].name}`,
                        description: buildDescription([itemInfo]),
                        visual: getRegularVisualByType(transfer.type),
                        customProps: {}
                    });

                    movePackageToPipe(transfer.departureTime, packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: transfer.fromId,
                        toSiteNodeId: transfer.toId,
                        interpolationAmount: 0
                    });

                    movePackageToPipe(transfer.arrivalTime, packageId, {
                        type: PackagePositionInfoType.Pipe,
                        fromSiteNodeId: transfer.fromId,
                        toSiteNodeId: transfer.toId,
                        interpolationAmount: 1
                    });

                    destroyPackage(addHours(transfer.arrivalTime, 0.01), packageId);

                    const newPackage = {
                        packageId: packageId,
                        transfer: transfer,
                        creationEvent: creationEvent,
                        itemInfos: [itemInfo]
                    };

                    regularPackages.push(newPackage);
                    return newPackage.packageId;
                }

                function emitWrappedPackageEvents(pathIds: number[], itemInfo: RegularPackageItemInfo) {
                    const packageId = itemInfo.id;
                    const packageCreationTime = currentTime;
                    createPackage(packageCreationTime, packageId, {
                        name: `Package ${itemInfo.id}`,
                        description: `${itemInfo.shortDesc} from ${itemInfo.fromName} to ${itemInfo.toName}`,
                        visual: wrappedVisual,
                        customProps: {}
                    });

                    let packageCurrentTime = addHours(packageCreationTime, 0.01);

                    for (let j = 1; j < pathIds.length; j++) {
                        const transferFromId = pathIds[j - 1];
                        const transferToId = pathIds[j];

                        movePackageToSite(packageCurrentTime, packageId, {
                            type: PackagePositionInfoType.Site,
                            siteNodeId: transferFromId
                        });

                        packageCurrentTime = addHours(packageCurrentTime, 0.5);

                        const transfer = findNextRegularTransfer(transferFromId, transferToId, packageCurrentTime);
                        if (!transfer)
                            continue;

                        const transferPackageId = registerItemForRegularTransfer(transfer, itemInfo);

                        packageCurrentTime = transfer.departureTime;
                        movePackageToPackage(packageCurrentTime, packageId, {
                            type: PackagePositionInfoType.ParentPackage,
                            parentPackageId: transferPackageId
                        });
                        packageCurrentTime = transfer.arrivalTime;
                    }

                    packageCurrentTime = addHours(packageCurrentTime, 0.01);

                    destroyPackage(packageCurrentTime, packageId);
                }

                let currentTime = this.meta.startTime;

                for (let i = 0; i < 1000; i++) {
                    const good = randomElem(goods);
                    const fromId = good.sourceId;
                    const toId = randomElem(connectedNodeIds);
                    if (fromId === toId)
                        continue;
                    const path = hgraph.findPath(nodesById[fromId], nodesById[toId]);
                    if (!path)
                        continue;
                    const pathIds = path.map(x => x.id);
                    const packageId = generateId();

                    emitWrappedPackageEvents(pathIds, {
                        id: packageId,
                        shortDesc: good.name,
                        fromName: nodesById[fromId].name,
                        toName: nodesById[toId].name
                    });

                    currentTime = addHours(currentTime, Math.random() * 0.5 + 0.01);
                }

                currentTime = this.meta.startTime;

                for (let i = 0; i < 500; i++) {
                    const fromId = randomElem(connectedNodeIds);
                    const toId = randomElem(connectedNodeIds);
                    if (fromId === toId)
                        continue;
                    const path = hgraph.findPath(nodesById[fromId], nodesById[toId]);
                    if (!path)
                        continue;
                    const pathIds = path.map(x => x.id);
                    const packageId = generateId();

                    emitWrappedPackageEvents(pathIds, {
                        id: packageId,
                        shortDesc: "Personal Item",
                        fromName: nodesById[fromId].name,
                        toName: nodesById[toId].name
                    });

                    currentTime = addHours(currentTime, Math.random() * 0.5 + 0.01);
                }

                currentTime = addHours(this.meta.startTime, 8);
                {
                    const unidocsPackageId = generateId();
                    const toEkbDhlPackageId = generateId();
                    const fromHaifaDhlPackageId = generateId();

                    createPackage(currentTime, unidocsPackageId, {
                        name: "Unidocs " + unidocsPackageId,
                        description: "Documents UrFU to Technion",
                        visual: wrappedVisual,
                        customProps: {}
                    });

                    const unidocsItemInfo = {
                        id: unidocsPackageId,
                        shortDesc: "Unidocs",
                        fromName: "UrFU",
                        toName: "Technion"
                    };

                    createPackage(currentTime, toEkbDhlPackageId, {
                        name: "Courier from UrFU to Ekb DLH",
                        description: buildDescription([unidocsItemInfo]),
                        visual: carVisual,
                        customProps: {}
                    });

                    function cartoFromDegs(lon: number, lat: number, height: number = 0) {
                        return {
                            longitude: lon,
                            latitude: lat,
                            height: height
                        };
                    }

                    const toEkbJumpTime = addSeconds(currentTime, 0.1);

                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6143005, 56.8414756)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6139361, 56.8423644)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6103551, 56.8419486)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6112224, 56.8393848)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.611123, 56.8394831)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6122294, 56.8358302)
                    });
                    currentTime = addMinutes(currentTime, 0.25);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6117021, 56.8354782)
                    });
                    currentTime = addMinutes(currentTime, 5);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6138751, 56.8284304)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6131364, 56.8276767)
                    });
                    currentTime = addMinutes(currentTime, 5);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6142996, 56.8236099)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.617832, 56.8238848)
                    });
                    currentTime = addMinutes(currentTime, 6);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6201651, 56.8166614)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6259905, 56.8172906)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6275606, 56.8165373)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6281081, 56.815427)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime, toEkbDhlPackageId, {
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(60.6284029, 56.8135078)
                    });
                    currentTime = addSeconds(currentTime, 1);
                    destroyPackage(currentTime, toEkbDhlPackageId);

                    const toEkbUnjumpTime = addSeconds(currentTime, -0.1);

                    movePackageToPackage(toEkbJumpTime, unidocsPackageId, {
                        type: PackagePositionInfoType.ParentPackage,
                        parentPackageId: toEkbDhlPackageId
                    });
                    movePackageToSite(toEkbUnjumpTime, unidocsPackageId, {
                        type: PackagePositionInfoType.Site,
                        siteNodeId: idsByName["Yekaterinburg - DLH"]
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageToSite(toEkbUnjumpTime, unidocsPackageId, {
                        type: PackagePositionInfoType.Site,
                        siteNodeId: idsByName["Yekaterinburg - DLH"]
                    });

                    function doTransfer(fromName: string, toName: string) {
                        const transfer = findNextRegularTransfer(idsByName[fromName], idsByName[toName], currentTime)!;
                        const transferId = registerItemForRegularTransfer(transfer, unidocsItemInfo);
                        currentTime = addSeconds(transfer.departureTime, 1);
                        movePackageToPackage(currentTime, unidocsPackageId, {
                            type: PackagePositionInfoType.ParentPackage,
                            parentPackageId: transferId
                        });
                        currentTime = addSeconds(transfer.arrivalTime, -1);
                        movePackageToSite(currentTime, unidocsPackageId, {
                            type: PackagePositionInfoType.Site,
                            siteNodeId: idsByName[toName]
                        });
                    }

                    doTransfer("Yekaterinburg - DLH", "Yekaterinburg (SVX)");
                    doTransfer("Yekaterinburg (SVX)", "Moscow (SVO)");
                    doTransfer("Moscow (SVO)", "Tel Aviv (TLV)");
                    doTransfer("Tel Aviv (TLV)", "Haifa - DLH");

                    currentTime = addMinutes(currentTime, 15);

                    const jumpToHaifaCarTime = addSeconds(currentTime, 1);

                    createPackage(currentTime, fromHaifaDhlPackageId, {
                        name: "Courier to Technion",
                        description: buildDescription([unidocsItemInfo]),
                        customProps: {},
                        visual: carVisual
                    });

                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0365043, 32.782102)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0355572, 32.7827574)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0340848, 32.7814994)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0324232, 32.782787)
                    });
                    currentTime = addMinutes(currentTime, 4);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0276275, 32.7887333)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.025865, 32.7911906)
                    });
                    currentTime = addMinutes(currentTime, 5);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0173127, 32.7994779)
                    });
                    currentTime = addMinutes(currentTime, 4);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0109814, 32.8048415)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.010417, 32.8029869)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0105027, 32.8016252)
                    });
                    currentTime = addMinutes(currentTime, 4);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0187561, 32.7938905)
                    });
                    currentTime = addMinutes(currentTime, 5/60);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0183611, 32.7937967)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0126989, 32.7971569)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.007877, 32.7986283)
                    });
                    currentTime = addMinutes(currentTime, 0.5);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0072401, 32.797112)
                    });
                    currentTime = addMinutes(currentTime, 0.5);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0075829, 32.7957714)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0103335, 32.7948019)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0132148, 32.7912697)
                    });
                    currentTime = addMinutes(currentTime, 0.5);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0138308, 32.7901442)
                    });
                    currentTime = addMinutes(currentTime, 2);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0168614, 32.7867345)
                    });
                    currentTime = addMinutes(currentTime, 0.5);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0176935, 32.7851741)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0144698, 32.7830445)
                    });
                    currentTime = addMinutes(currentTime, 1);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0134658, 32.7803359)
                    });
                    currentTime = addMinutes(currentTime, 10 / 60);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0134462, 32.7797771)
                    });
                    currentTime = addMinutes(currentTime, 20 / 60);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0147309, 32.7792574)
                    });
                    currentTime = addMinutes(currentTime, 20 / 60);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0155722, 32.7783684)
                    });
                    currentTime = addMinutes(currentTime, 20 / 60);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.017483, 32.7788016)
                    });
                    currentTime = addMinutes(currentTime, 30 / 60);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0211449, 32.7786902)
                    });
                    currentTime = addMinutes(currentTime, 10 / 60);
                    movePackageAbsolute(currentTime,fromHaifaDhlPackageId,{
                        type: PackagePositionInfoType.Absolute,
                        carto: cartoFromDegs(35.0219216, 32.7779038)
                    });
                    destroyPackage(currentTime, fromHaifaDhlPackageId);

                    const unjumpHaifaTime = addSeconds(currentTime, -1);

                    movePackageToPackage(jumpToHaifaCarTime, unidocsPackageId, {
                        type: PackagePositionInfoType.ParentPackage,
                        parentPackageId: fromHaifaDhlPackageId
                    });
                    destroyPackage(unjumpHaifaTime, unidocsPackageId);
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