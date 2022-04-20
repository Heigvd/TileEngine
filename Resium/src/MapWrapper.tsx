// react
import React, { useState, useEffect, useRef } from "react";

// openlayers
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { transform, transformExtent } from "ol/proj";
import { Coordinate } from "ol/coordinate";
import { Feature } from "ol";
import { Geometry } from "ol/geom";

import { css } from "@emotion/css";

import OLCesium from "olcs/OLCesium.js";
import olSourceOSM from "ol/source/OSM.js";
import olFormatGeoJSON, { GeoJSONObject } from "ol/format/GeoJSON.js";
import { StyleLike } from "ol/style/Style";
import olLayerTile from "ol/layer/Tile.js";
import olStyleText from "ol/style/Text.js";
import olStyleStyle from "ol/style/Style.js";
import olStyleCircle from "ol/style/Circle.js";
import olStyleStroke from "ol/style/Stroke.js";
import olStyleFill from "ol/style/Fill.js";
import TileLayer from "ol/renderer/canvas/TileLayer";
import XYZ from "ol/source/XYZ";
import GeoJSON from "ol/format/GeoJSON.js";
import { bbox, tile, all } from "ol/loadingstrategy";
import { createXYZ } from "ol/tilegrid";
import osmtogeojson from "osmtogeojson";

import * as Cesium from "cesium";
// import Hgt from "node-hgt";

// import { addElevation } from "geojson-elevation";

import json from "./testBuildingData.json";
import { geojsonAltitudes } from "./geojsonAltitudes";
import { FeatureCollection, GeoJsonObject } from "geojson";
import { lv95ToWGS84 } from "./proj";

const image = new olStyleCircle({
  radius: 5,
  fill: undefined,
  stroke: new olStyleStroke({ color: "red", width: 1 }),
});

const styles = {
  Point: [
    new olStyleStyle({
      image,
    }),
  ],
  LineString: [
    new olStyleStyle({
      stroke: new olStyleStroke({
        color: "green",
        // lineDash: [12],
        width: 5,
      }),
    }),
  ],
  MultiLineString: [
    new olStyleStyle({
      stroke: new olStyleStroke({
        color: "green",
        width: 10,
      }),
    }),
  ],
  MultiPoint: [
    new olStyleStyle({
      image,
      text: new olStyleText({
        text: "MP",
        stroke: new olStyleStroke({
          color: "purple",
        }),
      }),
    }),
  ],
  MultiPolygon: [
    new olStyleStyle({
      stroke: new olStyleStroke({
        color: "yellow",
        width: 1,
      }),
      fill: new olStyleFill({
        color: "rgba(255, 255, 0, 0.1)",
      }),
    }),
  ],
  Polygon: [
    new olStyleStyle({
      stroke: new olStyleStroke({
        color: "blue",
        lineDash: [4],
        width: 3,
      }),
      fill: new olStyleFill({
        color: "rgba(0, 0, 255, 0.1)",
      }),
    }),
  ],
  GeometryCollection: [
    new olStyleStyle({
      stroke: new olStyleStroke({
        color: "magenta",
        width: 2,
      }),
      fill: new olStyleFill({
        color: "magenta",
      }),
      image: new olStyleCircle({
        radius: 10, // pixels
        fill: undefined,
        stroke: new olStyleStroke({
          color: "magenta",
        }),
      }),
    }),
  ],
  Circle: [
    new olStyleStyle({
      stroke: new olStyleStroke({
        color: "red",
        width: 2,
      }),
      fill: new olStyleFill({
        color: "rgba(255,0,0,0.2)",
      }),
    }),
  ],
};

const styleFunction: StyleLike = function (feature, _resolution) {
  const geo = feature.getGeometry();
  // always assign a style to prevent feature skipping
  return geo ? styles[geo.getType() as keyof typeof styles] : styles["Point"];
};

const treesVector = new VectorSource({
  format: new olFormatGeoJSON(),
  loader: function () {
    fetch("data/geojson/arbres.geojson")
      .then((res) => res.json())
      .then((file: FeatureCollection) => {
        const features = new GeoJSON().readFeatures(file);

        features.forEach((feature) =>
          feature.set("altitudeMode", "clampToGround")
        );

        treesVector.addFeatures(features);
      });
  },
});

const treesVectorLayer = new VectorLayer({
  style: styleFunction,
  source: treesVector,
});

const testVectorSource = new VectorSource({
  format: new GeoJSON(),
  useSpatialIndex: true,
  loader: function () {
    const geojson = osmtogeojson(json, {
      flatProperties: false,
      deduplicator: undefined,
      polygonFeatures: undefined,
      uninterestingTags: undefined,
      verbose: false,
    });

    var features = new GeoJSON().readFeatures(geojson);

    features.forEach((feature) => feature.set("altitudeMode", "clampToGround"));

    console.log(geojson);

    testVectorSource.addFeatures(features);
  },
  strategy: bbox,
});

const testStyleFunction: StyleLike = function (feature, _resolution) {
  if (geo?.getType() === "LineString") {
    debugger;
  }
  const geo = feature.getGeometry();
  const type = geo?.getType() as keyof typeof styles;
  // always assign a style to prevent feature skipping
  return geo ? styles[type] : styles["Point"];
};

const testVectorLayer = new VectorLayer({
  style: testStyleFunction,
  source: testVectorSource,
});
testVectorLayer.set("altitudeMode", "clampToGround");

const defaultFeatures = [new Feature(new Geometry())];

function MapWrapper({
  features = defaultFeatures,
}: {
  features?: Feature<Geometry>[];
}) {
  const [mode3d, setmode3d] = React.useState(false);
  // set intial state
  const [map, setMap] = useState<Map>();
  const [featuresLayer, setFeaturesLayer] =
    useState<VectorLayer<VectorSource<Geometry>>>();
  const [selectedCoord, setSelectedCoord] = useState<Coordinate>();

  const [zoom, setZoom] = React.useState(0);

  // pull refs
  const mapElement = useRef<HTMLDivElement>(null);

  // create state ref that can be accessed in OpenLayers onclick callback function
  //  https://stackoverflow.com/a/60643670
  const mapRef = useRef<Map>();
  mapRef.current = map;

  // initialize map on first render - logic formerly put into componentDidMount
  useEffect(() => {
    // create and add vector source layer
    const initalFeaturesLayer = new VectorLayer({
      source: new VectorSource(),
    });

    if (mapElement.current) {
      // create map
      const initialMap = new Map({
        target: mapElement.current,
        layers: [
          // USGS Topo
          // new olLayerTile({
          //   source: new XYZ({
          //     url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
          //   }),
          // }),
          // Google Maps Terrain
          // new olLayerTile({
          //   source: new XYZ({
          //     url: "http://mt0.google.com/vt/lyrs=p&hl=en&x={x}&y={y}&z={z}",
          //   }),
          // }),
          // ovpVectorLayer,
          // initalFeaturesLayer,
          new olLayerTile({
            source: new olSourceOSM(),
          }),
          // treesVectorLayer,
          // vectorLayer,
          testVectorLayer,
        ],
        view: new View({
          // projection: "EPSG:4979",
          projection: "EPSG:4326",
          center: [6.961834028944175, 46.313121655957694],
          zoom: 16,
        }),
        controls: [],
      });

      // set map onclick handler
      initialMap.on("click", handleMapClick);

      setZoom(initialMap.getView().getZoom() || 0);

      initialMap.on("moveend", function () {
        setZoom(initialMap.getView().getZoom() || 0);
      });

      // save map and vector layer references to state
      setMap(initialMap);
      setFeaturesLayer(initalFeaturesLayer);
    }
  }, []);

  // update map if features prop changes - logic formerly put into componentDidUpdate
  useEffect(() => {
    if (featuresLayer && map && features.length) {
      // may be null on first render

      // set features to map
      featuresLayer.setSource(
        new VectorSource({
          features: features, // make sure features is an array
        })
      );

      const featureSource = featuresLayer.getSource();
      if (featureSource) {
        // fit map to feature extent (with 100px of padding)
        map.getView().fit(featureSource.getExtent(), {
          padding: [100, 100, 100, 100],
        });
      }
    }
  }, [features]);

  useEffect(() => {
    if (map != null) {
      const ol3d = new OLCesium({ map }); // ol2dMap is the ol.Map instance
      const scene = ol3d.getCesiumScene();
      scene.terrainProvider = Cesium.createWorldTerrain();

      // Cesium.IonResource.fromAssetId(96188).then(console.log);
      // scene.primitives.add(
      //   new Cesium.Cesium3DTileset({
      //     url: Cesium.IonResource.fromAssetId(96188),
      //   })
      // );

      // debugger;

      // const tileset = new Cesium.Cesium3DTileset({
      //   url: "./data/3dmodels/3dtiles/trees/trees.json",
      //   debugShowBoundingVolume: true,
      // });

      // const clippingPlanes = new Cesium.ClippingPlaneCollection({
      //   planes: [
      //     new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 0.0, -1.0), 0.0),
      //   ],
      //   edgeWidth: viewModel.edgeStylingEnabled ? 1.0 : 0.0,
      // });

      // scene.primitives.add(
      //   new Cesium.Cesium3DTileset({
      //     url: Cesium.IonResource.fromAssetId(932630),
      //     debugShowBoundingVolume: true,
      //     clippingPlanes: clippingPlanes,
      //   })
      // );

      // scene.primitives.add(tileset);

      // tileset.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      //   Cesium.Cartesian3.fromDegrees(-75.152325, 39.94704, 0.0)
      // );

      // console.log(tileset);
      // debugger;

      ///////////////////////////////////////////////
      // const offset = new Cesium.HeadingPitchRange(
      //   Cesium.Math.toRadians(-45.0),
      //   Cesium.Math.toRadians(-45.0),
      //   80.0
      // );
      // const viewer = new Cesium.Viewer("cesiumContainer");
      // viewer.zoomTo(tileset, offset);
      // viewer.scene.primitives.add(tileset);
      // viewer.scene.terrainProvider = Cesium.createWorldTerrain();
      // viewer.scene.groundPrimitives.add(tileset);

      // treesVector.forEachFeature(feature=>{
      //   feature.
      //   const position = Cesium.Cartesian3.fromDegrees(
      //     6.961834028944175,
      //     46.313121655957694,
      //     1000
      //   );
      //   ol3d.dataSourceDisplay_.defaultDataSource.entities.add({
      //     name: "Tree",
      //     position,
      //     model: {
      //       uri: "./data/3dmodels/Tree.glb",
      //     },
      //   });

      // })
      ol3d.setEnabled(mode3d);
    }
  }, [map, mode3d]);

  // map click handler
  const handleMapClick = (event: any) => {
    // get clicked coordinate using mapRef to access current React state inside OpenLayers callback
    //  https://stackoverflow.com/a/60643670
    const clickedCoord = mapRef.current?.getCoordinateFromPixel(event.pixel);

    console.log(clickedCoord);

    if (clickedCoord) {
      // transform coord to EPSG 4326 standard Lat Long
      const transormedCoord = transform(clickedCoord, "EPSG:3857", "EPSG:4326");

      // set React state
      setSelectedCoord(transormedCoord);

      console.log(transormedCoord);
    }
  };

  // render component
  return (
    <div className={css({ display: "flex", flexDirection: "row" })}>
      <div
        id="cesiumContainer"
        className={css({
          width: "500px",
          height: "500px",
        })}
      />
      <div
        ref={mapElement}
        className={css({
          width: "500px",
          height: "500px",
        })}
      ></div>
      <p>{JSON.stringify(zoom)}</p>
      <button onClick={() => setmode3d((oldMode) => !oldMode)}>
        {mode3d ? "2D" : "3D"}
      </button>
    </div>
  );
}

export default MapWrapper;
