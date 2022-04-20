import { Projectable, Segment } from "ink-geom2d";
import { Point } from "pixi.js";

export function nodeToX(
  node: number,
  gridWidth: number,
  worldWidth: number
): number {
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
export function nodeToPoint(
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

export function pointToI(
  point: Projectable,
  gridWidth: number,
  worldWidth: number
) {
  const nodeI = Math.floor(
    ((point.x + worldWidth / 2) / worldWidth) * gridWidth
  );
  return nodeI < 0 ? 0 : nodeI;
}
export function pointToJ(
  point: Projectable,
  gridHeight: number,
  worldHeight: number
) {
  const nodeJ = Math.floor(
    ((point.y + worldHeight / 2) / worldHeight) * gridHeight
  );
  return nodeJ < 0 ? 0 : nodeJ;
}
export function pointToNode(
  point: Projectable,
  gridWidth: number,
  gridHeight: number,
  worldWidth: number,
  worldHeight: number
): number {
  return (
    pointToI(point, gridWidth, worldWidth) +
    pointToJ(point, gridHeight, worldHeight) * gridWidth
  );
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

export function pointLOS(
  startPoint: Projectable,
  endPoint: Projectable,
  objectRadius: number,
  walls: Segment[]
): { weight: number; point: Projectable } {
  const straitLine = new Segment(startPoint, endPoint);
  const leftLine = straitLine.parallelAtDistance(objectRadius * 2);
  const rightLine = straitLine.parallelAtDistance(-objectRadius * 2);

  const intersections: LOSIntersection[] = walls
    .map((wall) => {
      let intersection = rightLine.intersectionWithSegment(wall);
      let intersectionPoint = intersection.point;
      if (!(intersection && intersectionPoint)) {
        intersection = leftLine.intersectionWithSegment(wall);
        intersectionPoint = intersection.point;
      }

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

    const newSegmentLength = intersectedSegment.length - objectRadius;
    const intersectionPoint = intersectedSegment.directionVector.scaledToLength(
      newSegmentLength < 0 ? intersectedSegment.length : newSegmentLength
    );

    return {
      weight: Math.sqrt(closestIntersection.sqDistance),
      point: intersectionPoint,
    };
  } else {
    return { weight: straitLine.length, point: endPoint };
  }
}

function nodeLOS(
  startNode: number,
  endNode: number,
  gridWidth: number,
  gridHeight: number,
  worldWidth: number,
  worldHeight: number,
  walls: Segment[],
  objectRadius: number
): { weight: number; node: number } {
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

  const losValue = pointLOS(startPoint, endPoint, objectRadius, walls);
  return {
    weight: losValue.weight,
    node: pointToNode(
      losValue.point,
      gridWidth,
      gridHeight,
      worldWidth,
      worldHeight
    ),
  };
}

export interface PathwayPoint {
  toPoint: Point;
  speed: number;
}

export function optimizePathway(
  pathway: number[][],
  gridWidth: number,
  gridHeight: number,
  worldWidth: number,
  worldHeight: number,
  objectRadius: number,
  walls: Segment[]
): PathwayPoint[] {
  const optimizedPathway: PathwayPoint[] = [];
  for (let i = 0; i < pathway.length - 1; i++) {
    const currentNode = pathway[i];
    const currentPoint = nodeToPoint(
      currentNode[0] + currentNode[1] * gridWidth,
      gridWidth,
      gridHeight,
      worldWidth,
      worldHeight
    );

    for (let j = pathway.length - 1; j >= i; j--) {
      const furtherNode = pathway[j];
      const furtherPoint = nodeToPoint(
        furtherNode[0] + furtherNode[1] * gridWidth,
        gridWidth,
        gridHeight,
        worldWidth,
        worldHeight
      );
      const los = pointLOS(currentPoint, furtherPoint, objectRadius, walls);

      if (furtherPoint.equals(los.point)) {
        optimizedPathway.push({ toPoint: currentPoint, speed: 1 });
        i = j;
        break;
      }
    }
  }

  if (pathway.length > 0) {
    const lastSpotNode = pathway[pathway.length - 1];
    const lastSpotPoint = nodeToPoint(
      lastSpotNode[0] + lastSpotNode[1] * gridWidth,
      gridWidth,
      gridHeight,
      worldWidth,
      worldHeight
    );
    optimizedPathway.push({ toPoint: lastSpotPoint, speed: 1 });
  }
  return optimizedPathway;
}

function sqDistance(fromPoint: Projectable, toPoint: Projectable) {
  const distanceX = toPoint.x - fromPoint.x;
  const distanceY = toPoint.y - fromPoint.y;
  return distanceX * distanceX + distanceY * distanceY;
}

function movementPath(
  fromPoint: Projectable,
  toPoint: Projectable,
  speed: number
) {
  const movementSegment = new Segment(fromPoint, toPoint);
  const movementSqDistance = sqDistance(fromPoint, toPoint);
  const movementVector = movementSegment.directionVector.scaledToLength(speed);

  const speedPath: Projectable[] = [fromPoint];
  let newPoint = fromPoint;

  do {
    newPoint = {
      x: newPoint.x + movementVector.x,
      y: newPoint.y + movementVector.y,
    };
    speedPath.push(newPoint);
  } while (sqDistance(fromPoint, newPoint) < movementSqDistance);

  return speedPath;
}

export function generateSpeedPathway(pathway: PathwayPoint[]) {
  return pathway.flatMap((path, i, arr) => {
    if (i < arr.length - 1) {
      const fromPoint = path.toPoint;
      const toPoint = arr[i + 1].toPoint;
      return movementPath(fromPoint, toPoint, path.speed);
    } else {
      return [];
    }
  });
}
