import * as React from "react";
import {
  Application,
  Texture,
  Sprite,
  Polygon,
  BaseTexture,
  AnimatedSprite,
  IPointData,
  Point,
  Graphics,
  Container,
} from "pixi.js";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import { Input } from "@mui/material";
import { SharedValues } from "../App";
import { Projectable, Segment } from "ink-geom2d";
import {
  nodeToPoint,
  pointToI,
  pointToJ,
  pointToNode,
} from "../helpers/worldGrid";
import { drawPolygon } from "../helpers/pixi";
import { Character } from "../Classes/Character";
import { isPointInPolygon } from "../helpers/geo";

const PLAYER_NB_FRAMES = 11;
const PLAYER_NB_FRAMES_PER_LINE = 22;
const PLAYER_FRAME_SIZE = 64;
const PLAYER_SIZE = 10;
const PLAYER_RADIUS = 1;
const PLAYER_ANIMATION_SPEED = 0.3;

const ZOOM = 1.0;

export function drawPoint(
  stage: Container,
  x: number,
  y: number,
  color = 0xff0000,
  size = 1
) {
  const gr = new Graphics();
  gr.beginFill(color);
  gr.drawCircle(x, y, size);
  gr.endFill();
  stage.addChild(gr);
  return gr;
}

function isRightClick(e: React.MouseEvent<HTMLElement>) {
  return e.button === 2;
}

function getNodeNeighbors(
  node: number,
  gridWidth: number,
  passed: number[],
  obstacleGrid: boolean[]
): number[] {
  const gridSize = obstacleGrid.length;
  const topNode = node - gridWidth;
  const leftNode = node - 1;
  const bottomNode = node + gridWidth;
  const rightNode = node + 1;
  const allNeighbors = [];
  if (topNode >= 0) {
    allNeighbors.push(topNode);
  }
  if (leftNode >= 0) {
    allNeighbors.push(leftNode);
  }
  if (bottomNode < gridSize) {
    allNeighbors.push(bottomNode);
  }
  if (rightNode < gridSize) {
    allNeighbors.push(rightNode);
  }
  const neighbors = allNeighbors.filter(
    (neighbor) => !passed.includes(neighbor) && !obstacleGrid[neighbor]
  );
  passed.push(...neighbors);
  return neighbors;
}

interface WeightedPath {
  path: number[];
  weight: number;
}

function isWeightedPath(path: WeightedPath | undefined): path is WeightedPath {
  return path != null;
}

function modifyLandTilesSize(
  landTile: Sprite,
  sizeX: number,
  sizeY: number,
  i: number,
  subdivisionW: number,
  subdivisionH: number
) {
  const totatWidth = sizeX * subdivisionW;
  const totatHeight = sizeY * subdivisionH;
  landTile.width = sizeX;
  landTile.height = sizeY;
  landTile.x = (i % subdivisionW) * sizeX - totatWidth / 2;
  landTile.y =
    sizeY * (subdivisionH - 1) -
    Math.floor(i / subdivisionW) * sizeY -
    totatHeight / 2;
}

function preventScroll(e: MouseEvent) {
  e.preventDefault();
}

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

interface PixiWorldProps extends SharedValues {
  exportedValues: ExportedValues;
}

export function PixiWorld({
  exportedValues,
  playerPosition,
}: // setPlayerPosition,
//   visionPolygon,
//   setVisionPolygon,
PixiWorldProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  // const [tileSize, setTileSize] = React.useState(LAND_TILE_SIZE);
  // const [zoom, setZoom] = React.useState(ZOOM);
  const inertZoom = React.useRef(ZOOM);
  const [animationSpeed, setAnimationSpeed] = React.useState(
    PLAYER_ANIMATION_SPEED
  );
  const playerSprite = React.useRef<AnimatedSprite>();
  const landTiles = React.useRef<Sprite[]>([]);

  const mouseState = React.useRef<"UP" | "DOWN">("UP");
  const lastMousePosition = React.useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const playerPositionRef = React.useRef(playerPosition);
  const charactersRef = React.useRef<Character[]>([]);
  const playerRef = React.useRef<Character | undefined>(undefined);

  React.useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  const pixiApp = React.useRef<Application>();

  const { xmin, zmin, xmax, zmax } = exportedValues.worldData;

  const worldWidth = xmax - xmin;
  const worldHeight = zmax - zmin;

  const gridWidth = Math.round(worldWidth / (PLAYER_RADIUS * 2));
  const gridHeight = Math.round(worldHeight / (PLAYER_RADIUS * 2));

  const obstacleGrid = React.useRef<boolean[]>([]);
  const obstacleGrid2 = React.useRef<number[][]>([]);

  React.useEffect(() => {
    const buildingWalls: Segment[][] = [];

    for (let j = 0; j < gridHeight; j += 1) {
      obstacleGrid2.current[j] = [];
      for (let i = 0; i < gridWidth; i += 1) {
        obstacleGrid2.current[j][i] = 0;

        const x = (i / gridWidth) * worldWidth - worldWidth / 2;
        const y =
          0 -
          ((j / gridHeight) * worldHeight - worldHeight / 2) -
          PLAYER_RADIUS * 2;

        const pointA = new Point(x, y);
        const pointB = new Point(x, y + PLAYER_RADIUS * 2);
        const pointC = new Point(x + PLAYER_RADIUS * 2, y + PLAYER_RADIUS * 2);
        const pointD = new Point(x + PLAYER_RADIUS * 2, y);

        const wall1 = new Segment(pointA, pointB);
        const wall2 = new Segment(pointB, pointC);
        const wall3 = new Segment(pointC, pointD);
        const wall4 = new Segment(pointD, pointA);

        const node = new Polygon([pointA, pointB, pointC, pointD]);

        for (const buildingIndex in exportedValues.buildings) {
          const building = exportedValues.buildings[buildingIndex];
          const buildingPoly = new Polygon(
            building.points.map((point) => new Point(point[0], point[2]))
          );

          if (
            buildingPoly.contains(pointA.x, pointA.y) ||
            buildingPoly.contains(pointB.x, pointB.y) ||
            buildingPoly.contains(pointC.x, pointC.y) ||
            buildingPoly.contains(pointD.x, pointD.y)
          ) {
            obstacleGrid.current[i + j * gridWidth] = true;
            obstacleGrid2.current[j][i] = 1;
            break;
          }

          if (buildingWalls[buildingIndex] == null) {
            buildingWalls[buildingIndex] = building.points.map(
              (point, i, arr) => {
                const nextPoint = arr[(i + 1) % arr.length];
                return new Segment(
                  new Point(point[0], point[2]),
                  new Point(nextPoint[0], nextPoint[2])
                );
              }
            );
          }

          for (const wall of buildingWalls[buildingIndex]) {
            if (
              node.contains(wall.start.x, wall.start.y) ||
              node.contains(wall.end.x, wall.end.y) ||
              wall.intersectionWithSegment(wall1).hasIntersection ||
              wall.intersectionWithSegment(wall2).hasIntersection ||
              wall.intersectionWithSegment(wall3).hasIntersection ||
              wall.intersectionWithSegment(wall4).hasIntersection
            ) {
              obstacleGrid.current[i + j * gridWidth] = true;
              obstacleGrid2.current[j][i] = 1;
              break;
            }
          }
        }
      }
    }

    playerRef.current?.setPosition(
      nodeToPoint(
        Math.floor(Math.random() * obstacleGrid.current.length),
        gridWidth,
        gridHeight,
        worldWidth,
        worldHeight
      )
    );
  }, [
    exportedValues.buildings,
    gridHeight,
    gridWidth,
    worldHeight,
    worldWidth,
  ]);

  const playerDot = React.useRef<Graphics | undefined>(undefined);
  const walls = React.useRef<Segment[]>([]);
  React.useEffect(() => {
    walls.current = exportedValues.buildings.flatMap((building) =>
      building.points.map((point, i, arr) => {
        const nextPoint = arr[(i + 1) % arr.length];
        return new Segment(
          new Point(point[0], 0 - point[2]),
          new Point(nextPoint[0], 0 - nextPoint[2])
        );
      })
    );
  }, [exportedValues.buildings]);

  const onClick = React.useCallback(
    (event: { data: { global: { x: number; y: number } } }) => {
      const playerPosition = playerPositionRef.current;

      const app = pixiApp.current;
      if (app) {
        const playerPos = new Point(playerPosition.x, playerPosition.z);
        const clickPos = new Point(
          (event.data.global.x - app.stage.position.x) / inertZoom.current,
          (event.data.global.y - app.stage.position.y) / inertZoom.current
        );

        //////////////////////////////////777
        playerDot.current?.destroy();
        const playerNode = pointToNode(
          playerRef.current?.getPosition() || new Point(0, 0),
          gridWidth,
          gridHeight,
          worldWidth,
          worldHeight
        );
        const playerNodePoint = nodeToPoint(
          playerNode,
          gridWidth,
          gridHeight,
          worldWidth,
          worldHeight
        );
        playerDot.current = drawPoint(
          app.stage,
          playerRef.current?.getPosition()?.x || 0,
          playerRef.current?.getPosition()?.y || 0,
          0x00ff00,
          (PLAYER_RADIUS * 3) / 4
        );
        playerDot.current = drawPoint(
          app.stage,
          playerNodePoint.x,
          playerNodePoint.y,
          0x0000ff,
          PLAYER_RADIUS / 2
        );
        /////////////////////////

        playerRef.current?.moveTo(
          clickPos,
          { grid: obstacleGrid2.current, width: gridWidth, height: gridHeight },
          { width: worldWidth, height: worldHeight },
          walls.current
        );
      }
    },
    [gridHeight, gridWidth, worldHeight, worldWidth]
  );

  const visionPolygonRef = React.useRef<Graphics | undefined>(undefined);
  const lastPlayerPosition = React.useRef<Projectable | undefined>(undefined);

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
        const { worldData, terrain } = exportedValues;
        const {
          groundSubdivisions,
          maxLatitude,
          minLatitude,
          maxLongitude,
          minLongitude,
          offsetX,
          offsetZ,
          xmin,
          zmin,
          xmax,
          zmax,
        } = worldData;

        const worldWidth = xmax - xmin;
        const worldHeight = zmax - zmin;
        const tileSizeX = worldWidth / groundSubdivisions.w;
        const tileSizeY = worldHeight / groundSubdivisions.h;

        landTiles.current = terrain.tiles.map((tile, i) => {
          const img = URL.createObjectURL(tile);
          const texture = new Texture(new BaseTexture(img));
          const landTile: Sprite = Sprite.from(texture);

          modifyLandTilesSize(
            landTile,
            tileSizeX,
            tileSizeY,
            i,
            groundSubdivisions.w,
            groundSubdivisions.h
          );

          // landTile.position.x += startX;
          // landTile.position.y += startY;

          landTile.interactive = true;

          landTile.on("mousedown", onClick);
          landTile.on("touchstart", onClick);

          app.stage.addChild(landTile);

          return landTile;
        });

        /// PLAYER
        playerRef.current = new Character(
          app.stage,
          {
            texturePath: "./textures/player2.png",
            frameWidth: 120,
            frameHeight: 120,
            startFrame: 8,
            stopFrame: 16,
            nbFramePerLine: 8,
            animationSpeed: 0.1,
          },
          PLAYER_RADIUS,
          nodeToPoint(
            Math.floor(Math.random() * obstacleGrid.current.length),
            gridWidth,
            gridHeight,
            worldWidth,
            worldHeight
          ),
          exportedValues.buildings
        );

        playerRef.current.setDebugging(true);

        playerRef.current.addOnPositionChangeListener((playerPosition) => {
          if (!lastPlayerPosition.current) {
            lastPlayerPosition.current = {
              x: playerPosition.x,
              y: playerPosition.y,
            };
          }

          if (pixiApp.current) {
            const diffX = Math.abs(
              playerPosition.x - lastPlayerPosition.current.x
            );
            const diffY = Math.abs(
              playerPosition.y - lastPlayerPosition.current.y
            );

            if (diffX > 0 || diffY > 0) {
              //   debugger;
              const visionPoints = playerRef.current
                ?.getVision()
                .map(({ point }) => ({ x: point.x, y: 0 - point.y }));

              if (visionPoints) {
                /////// SHOW VISION
                if (visionPolygonRef.current) {
                  visionPolygonRef.current.destroy();
                }
                visionPolygonRef.current = drawPolygon(
                  pixiApp.current.stage,
                  visionPoints
                );
                /////////////////////////////
                charactersRef.current.forEach((character) => {
                  const characterPosition = character.getPosition();

                  if (characterPosition) {
                    if (isPointInPolygon(characterPosition, visionPoints)) {
                      character.show();
                    } else {
                      character.hide();
                    }
                  }
                });
              }
            }
          }
        });

        // other characters
        charactersRef.current = [];
        for (let i = 0; i < 20; i++) {
          const char = new Character(
            app.stage,
            {
              texturePath: "./textures/player.png",
              frameWidth: PLAYER_FRAME_SIZE,
              frameHeight: PLAYER_FRAME_SIZE,
              startFrame: 0,
              stopFrame: PLAYER_NB_FRAMES,
              nbFramePerLine: PLAYER_NB_FRAMES_PER_LINE,
              animationSpeed: PLAYER_ANIMATION_SPEED,
            },
            PLAYER_RADIUS,
            nodeToPoint(
              Math.floor(Math.random() * obstacleGrid.current.length),
              gridWidth,
              gridHeight,
              worldWidth,
              worldHeight
            )
          );

          char.randomMovement(
            {
              grid: obstacleGrid2.current,
              width: gridWidth,
              height: gridHeight,
            },
            { width: worldWidth, height: worldHeight },
            walls.current
          );

          charactersRef.current.push(char);
        }

        ///////////////////// BUILDINGS

        exportedValues.buildings.forEach((building) => {
          const points: IPointData[] = building.points.map(
            ([x, _y, z]) => new Point(x, 0 - z)
          );
          const polygon = new Polygon(points);
          const g = new Graphics();
          g.beginFill(0x5d0015);
          g.drawPolygon(polygon);
          g.endFill();
          app.stage.addChild(g);
        });

        /////////////////////////// OBSTACLE GRID ////////////////////////////////////

        obstacleGrid.current.forEach((obstacle, i) => {
          if (obstacle) {
            const obstacleXY = nodeToPoint(
              i,
              gridWidth,
              gridHeight,
              worldWidth,
              worldHeight
            );
            drawPoint(
              app.stage,
              obstacleXY.x,
              obstacleXY.y,
              0xff0000,
              PLAYER_RADIUS
            );
          }
        });

        //////////////////////////////// WALLS ///////////////////////////
        // walls.current.forEach((wall) => drawLine(app, wall.start, wall.end));
      }
    }
  }, [exportedValues, gridHeight, gridWidth, onClick]);

  React.useEffect(() => {
    if (playerSprite.current != null) {
      playerSprite.current.animationSpeed = animationSpeed;
    }
  }, [animationSpeed]);

  React.useEffect(() => {
    if (pixiApp.current && playerSprite.current) {
      playerSprite.current.position.x = playerPosition.x - PLAYER_SIZE / 2;
      playerSprite.current.position.y = playerPosition.z - PLAYER_SIZE / 2;
    }
  }, [playerPosition.x, playerPosition.y, playerPosition.z, playerSprite]);

  function onScroll(event: React.WheelEvent<HTMLCanvasElement>) {
    inertZoom.current += event.deltaY / 500;
    if (pixiApp.current) {
      pixiApp.current.stage.scale.x = inertZoom.current;
      pixiApp.current.stage.scale.y = inertZoom.current;
    }
  }

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
      <Box
        flexDirection="row"
        justifyContent="space-evenly"
        style={{ width: "100%" }}
      >
        {/* <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Typography id="input-slider" gutterBottom>
              Set zoom
            </Typography>
          </Grid>
          <Grid item xs>
            <Slider
              min={0}
              step={0.1}
              max={10}
              value={zoom}
              onChange={(_evt, value) => setZoom(Number(value))}
              aria-labelledby="Set zoom"
            />
          </Grid>
          <Grid item>
            <Input
              value={zoom}
              size="small"
              onChange={(evt) => setZoom(Number(evt.target.value))}
              inputProps={{
                step: 0.1,
                min: 0,
                max: 10,
                type: "number",
                "aria-labelledby": "input-slider",
              }}
            />
          </Grid>
        </Grid> */}
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Typography id="input-slider" gutterBottom>
              Set animation speed
            </Typography>
          </Grid>
          <Grid item xs>
            <Slider
              min={0}
              step={0.05}
              max={1}
              value={animationSpeed}
              onChange={(_evt, value) => setAnimationSpeed(Number(value))}
              aria-labelledby="Set animation speed"
            />
          </Grid>
          <Grid item>
            <Input
              value={animationSpeed}
              size="small"
              onChange={(evt) => setAnimationSpeed(Number(evt.target.value))}
              inputProps={{
                step: 0.05,
                min: 0,
                max: 1,
                type: "number",
                "aria-labelledby": "input-slider",
              }}
            />
          </Grid>
        </Grid>
      </Box>
      <canvas
        ref={ref}
        onContextMenu={(e) => {
          e.preventDefault();
          // return false;
        }}
        onMouseEnter={() => {
          // Prevent scroll when
          window.addEventListener("wheel", preventScroll, {
            passive: false,
          });
        }}
        onWheel={onScroll}
        onMouseDown={(event) => {
          if (isRightClick(event)) {
            mouseState.current = "DOWN";
            lastMousePosition.current = { x: event.clientX, y: event.clientY };
          }
        }}
        onMouseUp={(event) => {
          mouseState.current = "UP";
          lastMousePosition.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseLeave={(event) => {
          window.removeEventListener("wheel", preventScroll);
          mouseState.current = "UP";
          lastMousePosition.current = { x: event.clientX, y: event.clientY };
        }}
        onMouseMove={onMouseMove}
      />
    </div>
  );
}
