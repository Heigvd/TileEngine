import * as React from "react";
import {
  Application,
  Texture,
  Sprite,
  Polygon,
  BaseTexture,
  Rectangle,
  AnimatedSprite,
  IPointData,
  Point,
  Graphics,
  Text,
} from "pixi.js";
import JSZip from "jszip";
import JSZipUtils from "jszip-utils";
import { readJSONZipFile } from "../helpers/jszip";
import { Buffer } from "buffer";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import { css, Input } from "@mui/material";
import { SharedValues } from "../App";
import { SpriteManager, Vector3 } from "@babylonjs/core";
import { wgs84ToLV95 } from "../helpers/utils";
import {
  Segment,
  Vector,
  Polygon as GeoPolygon,
  Circle,
  Vector as GeoVector,
  Projectable,
} from "ink-geom2d";

const PLAYER_NB_FRAMES = 11;
const PLAYER_NB_FRAMES_PER_LINE = 22;
const PLAYER_FRAME_SIZE = 64;
const PLAYER_SIZE = 10;
const PLAYER_RADIUS = 0.5;
const PLAYER_ANIMATION_SPEED = 0.3;

const ZOOM = 1.0;

function drawPoint(
  app: Application,
  x: number,
  y: number,
  color = 0xff0000,
  size = 1
) {
  const gr = new Graphics();
  gr.beginFill(color);
  gr.drawCircle(x, y, size);
  gr.endFill();
  app.stage.addChild(gr);
  return gr;
}

function isRightClick(e: React.MouseEvent<HTMLElement>) {
  return e.button === 2;
}

interface NodeRecord {
  node: number;
  connections: number[];
  costSoFar: number;
  estimatedTotalCost: number;
}

function pathfindAStar(
  graph: NodeRecord[],
  start: number,
  goal: number,
  heuristic: (start: number, end: number) => number
) {
  // This structure is used to keep track of the
  // information we need for each node
  // Initialize the record for the start node
  const startRecord: NodeRecord = {
    node: start,
    connections: [],
    costSoFar: 0,
    estimatedTotalCost: heuristic(start, goal),
  };

  // Initialize the open and closed lists
  const open = [startRecord];
  const closed = [];

  // Iterate through processing each node
  while (open.length > 0) {
    // Find the smallest element in the open list
    // (using the estimatedTotalCost)
    const current = open
      .sort(
        (nodeRecordA, nodeRecordB) =>
          nodeRecordB.estimatedTotalCost - nodeRecordA.estimatedTotalCost
      )
      .pop()!;

    // If it is the goal node, then terminate
    if (current.node === goal) {
      break;
    }

    // Otherwise get its outgoing connections
    const connections = graph[current.node].connections;

    for (const connection of connections) {
    }
  }
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

function nodeToX(node: number, gridWidth: number, worldWidth: number): number {
  return (((node % gridWidth) + 0.5) * worldWidth) / gridWidth - worldWidth / 2;
}
function nodeToY(
  node: number,
  gridWidth: number,
  gridHeight: number,
  worldHeight: number
): number {
  return (
    ((Math.floor(node / gridWidth) + 0.5) * worldHeight) / gridHeight -
    worldHeight / 2
  );
}
function nodeToPoint(
  node: number,
  gridWidth: number,
  gridHeight: number,
  worldWidth: number,
  worldHeight: number
): Point {
  return new Point(
    nodeToX(node, gridWidth, worldWidth),
    nodeToY(node, gridWidth, gridHeight, worldHeight)
  );
}
function pointToNode(
  point: Projectable,
  gridWidth: number,
  gridHeight: number,
  worldWidth: number,
  worldHeight: number
): number {
  const nodeX = Math.floor(
    ((point.x + worldWidth / 2) / worldWidth) * gridWidth
  );
  const nodeY =
    Math.floor(((point.y + worldHeight / 2) / worldHeight) * gridHeight) *
    gridWidth;
  return nodeX + nodeY;
}

interface LOSIntersection {
  sqDistance: number;
  point: Projectable;
}

function isLOSIntersection(
  item: LOSIntersection | undefined
): item is LOSIntersection {
  return item != null;
}

function LOS(
  startNode: number,
  endNode: number,
  gridWidth: number,
  gridHeight: number,
  worldWidth: number,
  worldHeight: number,
  walls: Segment[]
): { weight: number; node: number } | undefined {
  const startPoint = nodeToPoint(
    startNode,
    gridWidth,
    gridHeight,
    worldWidth,
    worldHeight
  );
  const endPoint = nodeToPoint(
    endNode,
    gridWidth,
    gridHeight,
    worldWidth,
    worldHeight
  );
  const straitLine = new Segment(startPoint, endPoint);

  const intersections: LOSIntersection[] = walls
    .map((wall) => {
      const intersection = straitLine.intersectionWithSegment(wall);
      const intersectionPoint = intersection.point;
      if (intersection && intersectionPoint) {
        const sqDistanceX = intersectionPoint.x - startPoint.x;
        const sqDistanceY = intersectionPoint.y - startPoint.y;
        return {
          sqDistance: sqDistanceX * sqDistanceX + sqDistanceY * sqDistanceY,
          point: intersectionPoint as Projectable,
        };
      }
    })
    .filter(isLOSIntersection)
    .sort((a, b) => b.sqDistance - a.sqDistance);

  const closestIntersection = intersections.pop();
  if (closestIntersection != null) {
    const intersectedSegment = new Segment(
      startPoint,
      closestIntersection.point
    );

    const newSegmentLength = intersectedSegment.length - PLAYER_RADIUS;
    const intersectionPointNode = pointToNode(
      intersectedSegment.directionVector.scaledToLength(
        newSegmentLength < 0 ? intersectedSegment.length : newSegmentLength
      ),
      gridWidth,
      gridHeight,
      worldWidth,
      worldHeight
    );

    return {
      weight: Math.sqrt(closestIntersection.sqDistance),
      node: intersectionPointNode,
    };
  } else {
    return { weight: straitLine.length, node: endNode };
  }
}

interface WeightedPath {
  path: number[];
  weight: number;
}

function isWeightedPath(path: WeightedPath | undefined): path is WeightedPath {
  return path != null;
}

const speed = 100;
let thetaRunning = false;
let visitedNodes = 0;
function myThetaStar(
  app: Application,
  startNode: number,
  goalNode: number,
  gridWidth: number,
  gridHeight: number,
  worldWidth: number,
  worldHeight: number,
  walls: Segment[],
  obstacleGrid: boolean[],
  passed: number[] = [],
  weight: number = 0
): Promise<WeightedPath | undefined> {
  return new Promise<WeightedPath | undefined>((res) => {
    if (weight === 0) {
      thetaRunning = true;
      visitedNodes = 0;
    }
    visitedNodes += 1;
    if (thetaRunning) {
      const LOSNode = LOS(
        startNode,
        goalNode,
        gridWidth,
        gridHeight,
        worldWidth,
        worldHeight,
        walls
      );

      if (LOSNode == null || LOSNode.node === startNode) {
        res(undefined);
      } else {
        if (LOSNode.node === goalNode) {
          console.log(visitedNodes);
          thetaRunning = false;
          const finalPath = [startNode, goalNode];
          // finalPath.map((node, i, path) => {
          //   const pathLength = path.length;
          //   if (i < pathLength - 1) {
          //     const nextNode = path[i + 1];
          //     const nodePoint = nodeToPoint(
          //       node,
          //       gridWidth,
          //       gridHeight,
          //       worldWidth,
          //       worldHeight
          //     );
          //     const nextNodePoint = nodeToPoint(
          //       nextNode,
          //       gridWidth,
          //       gridHeight,
          //       worldWidth,
          //       worldHeight
          //     );
          //     drawLine(app, nodePoint, nextNodePoint);
          //   }
          // });
          res({ path: finalPath, weight: weight + LOSNode.weight });
        } else {
          const newStartNode = passed.includes(LOSNode.node)
            ? startNode
            : LOSNode.node;
          // const newStartNode = LOSNode.node;

          const neighbors = getNodeNeighbors(
            newStartNode,
            gridWidth,
            passed,
            obstacleGrid
          );
          if (neighbors.length === 0) {
            res(undefined);
          } else {
            setTimeout(() => {
              neighbors.forEach((neightbor) => {
                const neightborPoint = nodeToPoint(
                  neightbor,
                  gridWidth,
                  gridHeight,
                  worldWidth,
                  worldHeight
                );
                const point = drawPoint(
                  app,
                  neightborPoint.x,
                  neightborPoint.y,
                  0x0fff00
                  // PLAYER_RADIUS
                );
                setTimeout(() => {
                  point.destroy();
                }, speed);
              });

              const promises = neighbors.map((neightbor) => {
                const newPassed = [...passed];
                return myThetaStar(
                  app,
                  neightbor,
                  goalNode,
                  gridWidth,
                  gridHeight,
                  worldWidth,
                  worldHeight,
                  walls,
                  obstacleGrid,
                  // passed,
                  newPassed,
                  weight + 1
                );
              });

              Promise.all(promises).then((weightedPaths) => {
                const bestPath = weightedPaths
                  .filter(isWeightedPath)
                  .sort((pathA, pathB) => pathB.weight - pathA.weight)
                  .pop();

                if (weight === 0) {
                  debugger;
                }

                if (bestPath != null) {
                  // debugger;
                  res({
                    weight: bestPath.weight + weight,
                    path: [newStartNode, ...bestPath.path],
                  });
                } else {
                  res(undefined);
                }
              });
            }, speed);
          }
        }
      }
    } else {
      res(undefined);
    }
  });
}

function drawLine(
  pixiApp: Application,
  startPos: Projectable,
  endPos: Projectable,
  color = 0xff0000,
  width = 1,
  opacity = 0.6
) {
  // https://jsfiddle.net/bigtimebuddy/h85a7f0b/
  const graphicLine = new Graphics();
  // graphicLine.lineStyle(1, Math.random() * 0xffffff, 1);
  graphicLine.lineStyle(width, color, opacity);
  // join:"round" ,
  // cap: "round",
  // miterLimit: 198

  graphicLine.moveTo(startPos.x, startPos.y);
  graphicLine.lineTo(endPos.x, endPos.y);
  // .moveTo(firstPath.start.x, firstPath.start.y)
  // .lineTo(firstPath.end.x, firstPath.end.y);
  pixiApp.stage.addChild(graphicLine);

  return graphicLine;
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
  const pixiApp = React.useRef<Application>();

  const { xmin, zmin, xmax, zmax } = exportedValues.worldData;

  const worldWidth = xmax - xmin;
  const worldHeight = zmax - zmin;

  const gridWidth = Math.round(worldWidth / (PLAYER_RADIUS * 2));
  const gridHeight = Math.round(worldHeight / (PLAYER_RADIUS * 2));

  const obstacleGrid = React.useRef<boolean[]>([]);
  React.useEffect(() => {
    const buildingWalls: Segment[][] = [];

    for (let j = 0; j < gridHeight; j += 1) {
      for (let i = 0; i < gridWidth; i += 1) {
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
              break;
            }
          }
        }
      }
    }
  }, [
    exportedValues.buildings,
    gridHeight,
    gridWidth,
    worldHeight,
    worldWidth,
  ]);

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
      // if (pixiApp.current) {
      //   findPath(
      //     new Vector(playerPosition.x, playerPosition.z),
      //     new Vector(
      //       (event.data.global.x - pixiApp.current.stage.position.x) /
      //         inertZoom.current,
      //       (event.data.global.y - pixiApp.current.stage.position.y) /
      //         inertZoom.current
      //     ),
      //     exportedValues.buildings,
      //     pixiApp.current
      //     // undefined
      //   );
      const app = pixiApp.current;
      if (app) {
        const playerPos = new Point(playerPosition.x, playerPosition.z);
        const clickPos = new Point(
          (event.data.global.x - app.stage.position.x) / inertZoom.current,
          (event.data.global.y - app.stage.position.y) / inertZoom.current
        );

        const playerNode = pointToNode(
          playerPos,
          gridWidth,
          gridHeight,
          worldWidth,
          worldHeight
        );
        const clickNode = pointToNode(
          clickPos,
          gridWidth,
          gridHeight,
          worldWidth,
          worldHeight
        );

        myThetaStar(
          app,
          playerNode,
          clickNode,
          gridWidth,
          gridHeight,
          worldWidth,
          worldHeight,
          walls.current,
          obstacleGrid.current
        ).then((path) => {
          if (isWeightedPath(path)) {
            path.path.forEach((node, i, arr) => {
              if (i < arr.length - 1) {
                const nextNode = arr[i + 1];
                const startNode = nodeToPoint(
                  node,
                  gridWidth,
                  gridHeight,
                  worldWidth,
                  worldHeight
                );
                const endNode = nodeToPoint(
                  nextNode,
                  gridWidth,
                  gridHeight,
                  worldWidth,
                  worldHeight
                );

                drawLine(app, startNode, endNode);
              }
            });
          }
        });
      }
    },
    [
      gridHeight,
      gridWidth,
      playerPosition.x,
      playerPosition.z,
      worldHeight,
      worldWidth,
    ]
  );

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

        const playerTexture: BaseTexture = new BaseTexture(
          "./textures/player.png"
        );
        const playerFrames = [];

        for (let i = 0; i < PLAYER_NB_FRAMES; i++) {
          const animatedTexture = new Texture(
            playerTexture,
            new Rectangle(
              (i % PLAYER_NB_FRAMES_PER_LINE) * PLAYER_FRAME_SIZE,
              Math.floor(i / PLAYER_NB_FRAMES_PER_LINE) * PLAYER_FRAME_SIZE,
              PLAYER_FRAME_SIZE,
              PLAYER_FRAME_SIZE
            )
          );
          // magically works since the spritesheet was loaded with the pixi loader
          playerFrames.push(animatedTexture);
        }

        // create an AnimatedSprite (brings back memories from the days of Flash, right ?)
        const anim = new AnimatedSprite(playerFrames);
        anim.height = PLAYER_SIZE;
        anim.width = PLAYER_SIZE;
        anim.animationSpeed = PLAYER_ANIMATION_SPEED;
        anim.play();

        app.stage.addChild(anim);
        playerSprite.current = anim;

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

        ///////////////////////// BIG BUILDINGS ////////////////////////////////////777

        // bigBuildings.current.forEach((building) => {
        //   const points: IPointData[] = building.points.map(
        //     ([x, _y, z]) => new Point(x, 0 - z)
        //   );
        //   const polygon = new Polygon(points);
        //   const g = new Graphics();
        //   g.beginFill(0x0fff00);
        //   g.alpha = 0.7;
        //   g.drawPolygon(polygon);
        //   g.endFill();
        //   app.stage.addChild(g);
        // });

        /////////////////////////// OBSTACLE GRID ////////////////////////////////////

        // obstacleGrid.current.forEach((obstacle, i) => {
        //   if (obstacle) {
        //     const obstacleXY = nodeToPoint(
        //       i,
        //       gridWidth,
        //       gridHeight,
        //       worldWidth,
        //       worldHeight
        //     );
        //     drawPoint(app, obstacleXY.x, obstacleXY.y, 0xff0000, PLAYER_RADIUS);
        //   }
        // });

        //////////////////////////////// WALLS ///////////////////////////
        // walls.current.forEach((wall) => drawLine(app, wall.start, wall.end));
      }
    }
  }, [exportedValues, onClick]);

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
