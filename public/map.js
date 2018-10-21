var updateLayerWithData;
(function () {
    'use strict';

    var app_id = "GS8ZQ0QJgrckueJm97D6";
    var app_code = "4JXuyZg7MDF1mw8HP03Icg";

    // Initialize communication with the platform, to access your own data, change the values below
    // https://developer.here.com/documentation/geovisualization/topics/getting-credentials.html

    // We recommend you use the CIT environment. Find more details on our platforms below
    // https://developer.here.com/documentation/map-tile/common/request-cit-environment-rest.html

    const platform = new H.service.Platform({
        app_id,
        app_code,
        useCIT: true,
        useHTTPS: true
    });

    const pixelRatio = devicePixelRatio > 1 ? 2 : 1;
    let defaultLayers = platform.createDefaultLayers({
        tileSize: 256 * pixelRatio
    });
    const layers = platform.createDefaultLayers({
        tileSize: 256 * pixelRatio,
        ppi: pixelRatio > 1 ? 320 : 72
    });

    // initialize a map  - not specifying a location will give a whole world view.
    let map = new H.Map(
        document.getElementsByClassName('dl-map')[0],
        defaultLayers.normal.xbase, {
            pixelRatio,
            center: new H.geo.Point(39.8283, -98.5795),
            zoom: 4
        }
    );

    // make the map interactive
    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
    let ui = H.ui.UI.createDefault(map, layers);
    ui.removeControl('mapsettings');

    // resize map on window resize
    window.addEventListener('resize', function () {
        map.getViewPort().resize();
    });

    let provider = new H.datalens.RawDataProvider({
        dataUrl: './parks.csv',
        dataToFeatures: (data, helpers) => {
            let parsed = helpers.parseCSV(data);
            let features = [];
            for (let i = 1; i < parsed.length; i++) {
                let row = parsed[i];
                let feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [Number(row[4]), Number(row[5])]
                    },
                    "properties": {
                        "acreage": Number(row[3])
                    }
                };
                features.push(feature);
            }
            return features;
        },
        featuresToRows: (features, x, y, z, tileSize, helpers) => {
            let counts = {};
            for (let i = 0; i < features.length; i++) {
                let feature = features[i];
                let coordinates = feature.geometry.coordinates;
                let lat = coordinates[1];
                let lng = coordinates[0];
                
                let p = helpers.latLngToPixel(lat, lng, z, tileSize);

                let px = p[0];
                let py = p[1];
                let tx = px % tileSize;
                let ty = py % tileSize;
                let key = tx + '-' + ty;

                if (counts[key]) {
                    counts[key] += 1;
                } else {
                    counts[key] = 1;
                }
            }

            let rows = [];
            for (let key in counts) {
                let t = key.split('-');
                let tx = Number(t[0]);
                let ty = Number(t[1]);
                let count = 3000 * counts[key];
                rows.push({
                    tx,
                    ty,
                    count: count * 25,
                    value: count
                });
            }
            return rows;
        }
    });

    const colorScale = d3.scaleLinear().range([
        'rgba(30, 68, 165, 0.03)',
        'rgba(255, 183, 0, 0.8)',
        'rgba(231, 4, 15, 0.8)'
    ]).domain([0, .5, 1]);

    let baseCount = 10000;
    let nonLinearity = 2;

    // heatmap layer
    let layer = new H.datalens.HeatmapLayer(provider, {
        rowToTilePoint: function (row) {
            return {
                x: row.tx,
                y: row.ty,
                count: row.count,
                value: row.count
            };
        },
        bandwidth: [{
            value: 42,
            zoom: 4
        }],
        valueRange: z => [0, baseCount / Math.pow(z, 2 * nonLinearity)],
        countRange: [0, 0],
        opacity: 1,
        colorScale,
        aggregation: H.datalens.HeatmapLayer.Aggregation.SUM,
        inputScale: H.datalens.HeatmapLayer.InputScale.LINEAR
    });

    // add layer to map
    map.addLayer(layer);

    updateLayerWithData = function (coordinates) {
        const rows = coordinates;
        let csvContent = "data:text/csv;charset=utf-8,";
        rows.forEach(function(rowArray){
            let row = rowArray.join(",");
            csvContent += row + "\r\n";
        });
        map.removeLayer(layer);
        let newProvider = new H.datalens.RawDataProvider({
            dataUrl: csvContent,
            dataToFeatures: (data, helpers) => {
                let parsed = helpers.parseCSV(data);
                let features = [];
                for (let i = 1; i < parsed.length; i++) {
                    let row = parsed[i];
                    let feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [Number(row[0]), Number(row[1])]
                        },
                        "properties": {
                            "acreage": 10
                        }
                    };
                    features.push(feature);
                }
                return features;
            },
            featuresToRows: (features, x, y, z, tileSize, helpers) => {
                let counts = {};
                for (let i = 0; i < features.length; i++) {
                    let feature = features[i];
                    let coordinates = feature.geometry.coordinates;
                    let lat = coordinates[1];
                    let lng = coordinates[0];
                    
                    let p = helpers.latLngToPixel(lat, lng, z, tileSize);

                    let px = p[0];
                    let py = p[1];
                    let tx = px % tileSize;
                    let ty = py % tileSize;
                    let key = tx + '-' + ty;

                    if (counts[key]) {
                        counts[key] += 1;
                    } else {
                        counts[key] = 1;
                    }
                }

                let rows = [];
                for (let key in counts) {
                    let t = key.split('-');
                    let tx = Number(t[0]);
                    let ty = Number(t[1]);
                    let count = 3000 * counts[key];
                    rows.push({
                        tx,
                        ty,
                        count: count * 25,
                        value: count
                    });
                }
                return rows;
            }
        });
        let newLayer = new H.datalens.HeatmapLayer(newProvider, {
            rowToTilePoint: function (row) {
                return {
                    x: row.tx,
                    y: row.ty,
                    count: row.count,
                    value: row.count
                };
            },
            bandwidth: [{
                value: 42,
                zoom: 4
            }],
            valueRange: z => [0, baseCount / Math.pow(z, 2 * nonLinearity)],
            countRange: [0, 0],
            opacity: 1,
            colorScale,
            aggregation: H.datalens.HeatmapLayer.Aggregation.SUM,
            inputScale: H.datalens.HeatmapLayer.InputScale.LINEAR
        });
        map.addLayer(newLayer);
        layer = newLayer;
    }

}());