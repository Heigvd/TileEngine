import * as React from "react";
import { Application, Texture, Sprite, Polygon, BaseTexture } from "pixi.js";
import JSZip from "jszip";
import JSZipUtils from "jszip-utils";
import { readJSONZipFile } from "./helpers/jszip";
import { Buffer } from "buffer";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import { Input } from "@mui/material";

interface Tree {
  point: [number, number, number];
}

interface Building {
  height: number;
  points: [number, number, number][];
}

interface Terrain {
  positions: number[];
  tiles: Blob[];
}

interface DataCoordinates {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
}

interface WorldData {
  zoom: number;
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
  rawXmin: number;
  rawZmax: number;
  xmin: number;
  zmin: number;
  xmax: number;
  zmax: number;
  offsetX: number;
  offsetZ: number;
  groundSubdivisions: { h: number; w: number };
  dataCoordinates: DataCoordinates;
}

interface ExportedValues {
  trees: Tree[];
  buildings: Building[];
  terrain: Terrain;
  worldData: WorldData;
  initialPosition: [number, number, number];
}

export default function App() {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [sprites, setSprites] = React.useState<Sprite[][]>([[]]);
  const [tileSize, setTileSize] = React.useState(200);
  const [dataFilePath, setDataFilePath] = React.useState(
    // "worlds/creuxduvanmini.zip"
    "worlds/batiments.zip"
  );

  const mouseState = React.useRef<"UP" | "DOWN">("UP");
  const lastMousePosition = React.useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const pixiApp = React.useRef<Application>();

  const [exportedValues, setExportedValues] = React.useState<ExportedValues>();

  const loadZip = React.useCallback(() => {
    JSZipUtils.getBinaryContent(
      dataFilePath,
      function (err: Error, data: Parameters<typeof JSZip.loadAsync>[0]) {
        if (err) {
          throw err; // or handle err
        }

        JSZip.loadAsync(data)
          .then(function (zip) {
            const terrainFolder = zip.folder("terrain");
            const positionFile = terrainFolder?.file("vertices.json");
            const tilesFolder = terrainFolder?.folder("tiles");

            const buildingsFolder = zip.folder("buildings");
            const buildingsFile = buildingsFolder?.file("buildings.json");

            const treesFolder = zip.folder("trees");
            const treesFile = treesFolder?.file("trees.json");

            const dataFolder = zip.folder("world");
            const dataFile = dataFolder?.file("world.json");
            const initPosFile = dataFolder?.file("initPosition.json");

            if (
              positionFile &&
              tilesFolder &&
              buildingsFile &&
              treesFile &&
              dataFile &&
              initPosFile
            ) {
              const positions = readJSONZipFile<number[]>(positionFile);

              const asyncTiles: Promise<Blob>[] = [];
              tilesFolder.forEach((_path, file) =>
                asyncTiles.push(
                  file.async("base64").then((data) => {
                    const blob = new Blob(
                      [Uint8Array.from(Buffer.from(data, "base64"))],
                      { type: "image/png" }
                    );
                    return blob;
                  })
                )
              );
              const tiles = Promise.all(asyncTiles).then((res) => res);

              const buildings = readJSONZipFile<Building[]>(buildingsFile);
              const trees = readJSONZipFile<Tree[]>(treesFile);
              const worldData = readJSONZipFile<WorldData>(dataFile);
              const initialPosition =
                readJSONZipFile<[number, number, number]>(initPosFile);

              Promise.all([
                positions,
                tiles,
                buildings,
                trees,
                worldData,
                initialPosition,
              ]).then(
                ([
                  positions,
                  tiles,
                  buildings,
                  trees,
                  worldData,
                  initialPosition,
                ]) => {
                  setExportedValues({
                    buildings,
                    trees,
                    terrain: {
                      positions,
                      tiles,
                    },
                    worldData,
                    initialPosition,
                  });
                }
              );
            }
          })
          .catch((e) => {
            console.log(e);
            debugger;
          });
      }
    );
  }, [dataFilePath]);

  React.useEffect(() => {
    loadZip();
  }, []);

  React.useEffect(() => {
    if (ref.current != null) {
      const app = new Application({
        view: ref.current as HTMLCanvasElement,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x00000,
        width: 1400,
        height: 800,
      });
      pixiApp.current = app;

      if (exportedValues) {
        // const dx =
        //   exportedValues.worldData.xmax - exportedValues.worldData.xmin;
        // const dy =
        //   exportedValues.worldData.zmax - exportedValues.worldData.zmin;
        // const ratio = dx / dy;
        // const nbTiles = exportedValues.terrain.tiles.length;
        // const dytyle = nbTiles / ratio;
        // console.log({ dx, dy, ratio, nbTiles, dytyle });

        exportedValues.terrain.tiles.forEach((tile, i) => {
          const img = URL.createObjectURL(tile);
          const texture = new Texture(new BaseTexture(img));
          const sprite: Sprite = Sprite.from(texture);

          sprite.width = tileSize;
          sprite.height = tileSize;

          sprite.x =
            (i % exportedValues.worldData.groundSubdivisions.w) * tileSize;
          sprite.y =
            tileSize * (exportedValues.worldData.groundSubdivisions.h - 1) -
            Math.floor(i / exportedValues.worldData.groundSubdivisions.w) *
              tileSize;

          //tile.interactive = true;
          // tile.hitArea = new Polygon([50, 0, 0, 25, 50, 50, 100, 25, 50, 0]); //[x,y, x,y, x,y, ...] OR [new Point(), new Point(), ...]
          app.stage.addChild(sprite);
        });
      }
    }
  }, [exportedValues, tileSize]);

  console.log(exportedValues);

  function onMouseMove(event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    if (pixiApp.current && mouseState.current === "DOWN") {
      const deltaX = event.clientX - lastMousePosition.current.x;
      const deltaY = event.clientY - lastMousePosition.current.y;

      pixiApp.current.stage.position.x += deltaX;
      pixiApp.current.stage.position.y += deltaY;
    }
    lastMousePosition.current = { x: event.clientX, y: event.clientY };
  }

  return (
    <div
      className="App"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1>Play MIMMS</h1>
      <Box sx={{ width: 250 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Typography id="input-slider" gutterBottom>
              Set tile size
            </Typography>
          </Grid>
          <Grid item xs>
            <Slider
              min={0}
              step={10}
              max={250}
              value={tileSize}
              onChange={(_evt, value) => setTileSize(Number(value))}
              aria-labelledby="Set tile size"
            />
          </Grid>
          <Grid item>
            <Input
              value={tileSize}
              size="small"
              onChange={(evt) => setTileSize(Number(evt.target.value))}
              inputProps={{
                step: 10,
                min: 0,
                max: 250,
                type: "number",
                "aria-labelledby": "input-slider",
              }}
            />
          </Grid>
        </Grid>
      </Box>
      {/* <button onClick={loadZip}>Load ZIP</button> */}

      <canvas
        ref={ref}
        onMouseDown={(event) => {
          mouseState.current = "DOWN";
          lastMousePosition.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseUp={(event) => {
          mouseState.current = "UP";
          lastMousePosition.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseLeave={(event) => {
          mouseState.current = "UP";
          lastMousePosition.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseMove={onMouseMove}
      />
    </div>
  );
}
