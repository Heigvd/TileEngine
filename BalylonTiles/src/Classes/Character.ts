import { BaseTexture, Texture } from "@pixi/core";
import { AStarFinder } from "astar-typescript";
import { Projectable, Segment } from "ink-geom2d";
import {
  Polygon,
  Rectangle,
  AnimatedSprite,
  Container,
  Point,
  Graphics,
} from "pixi.js";
import { drawPoint } from "../Components/PixiWorld";
import { drawLine } from "../helpers/pixi";
import { computeVisionPolygon, VisionPoint } from "../helpers/vision";
import {
  generateSpeedPathway,
  nodeToPoint,
  optimizePathway,
  pointToI,
  pointToJ,
} from "../helpers/worldGrid";
import { Building } from "../hooks/useBuildings.js";

interface CharacterSprite {
  texturePath: string;
  frameWidth: number;
  frameHeight: number;
  startFrame: number;
  stopFrame: number;
  nbFramePerLine: number;
  animationSpeed: number;
}

export class Character {
  private animation: AnimatedSprite | undefined;
  private point: Graphics | undefined;
  private movementTimer: number | undefined = undefined;
  private radius: number;
  private sprite: CharacterSprite;
  private visible: boolean = true;
  private position: { x: number; y: number };

  private stage: Container;
  private visualPath: Graphics[] = [];

  private buildings: Building[];

  private onStopListeners: (() => void)[] = [];
  private onPositionChangeListeners: ((postion: Projectable) => void)[] = [];

  private debugging: boolean = false;

  private randomMoveFN: () => void = () => {};

  constructor(
    stage: Container,
    sprite: CharacterSprite,
    radius: number,
    characterPosition: Projectable = { x: 0, y: 0 },
    buildings: Building[] = []
  ) {
    this.radius = radius;
    this.sprite = sprite;
    this.stage = stage;
    this.buildings = buildings;
    this.position = characterPosition;

    // create character graphics
    this.draw();

    // set character position
    this.setPosition(new Point(characterPosition.x, characterPosition.y));
  }

  private draw() {
    const playerTexture: BaseTexture = new BaseTexture(this.sprite.texturePath);
    const playerFrames = [];

    for (let i = this.sprite.startFrame; i < this.sprite.stopFrame; i++) {
      const animatedTexture = new Texture(
        playerTexture,
        new Rectangle(
          (i % this.sprite.nbFramePerLine) * this.sprite.frameWidth,
          Math.floor(i / this.sprite.nbFramePerLine) * this.sprite.frameHeight,
          this.sprite.frameWidth,
          this.sprite.frameHeight
        )
      );
      playerFrames.push(animatedTexture);
    }

    // create an AnimatedSprite
    if (this.animation) {
      this.animation.destroy();
    }
    this.animation = new AnimatedSprite(playerFrames);
    this.animation.width = this.radius * 5;
    this.animation.height = this.radius * 5;
    this.animation.animationSpeed = 0.1;
    this.animation.play();

    this.stage.addChild(this.animation);

    this.point = drawPoint(
      this.stage,
      this.animation.x,
      this.animation.y,
      0x00ffff,
      this.radius
    );
  }

  setPosition(pos: Projectable): void {
    if (this.animation) {
      this.position.x = pos.x - this.animation.width / 2;
      this.position.y = pos.y - this.animation.height / 2;

      this.point?.destroy();
      this.point = drawPoint(this.stage, pos.x, pos.y, 0x00ffff, this.radius);

      if (this.visible) {
        this.animation.position.x = this.position.x;
        this.animation.position.y = this.position.y = pos.y;
        this.onPositionChangeListeners.forEach((listener) => {
          if (this.animation?.position) {
            listener(this.animation.position);
          }
        });
      }
    }
  }

  getPosition(): Projectable | undefined {
    return this.animation?.position;
  }

  moveTo(
    pos: Projectable,
    obstacleGrid: { grid: number[][]; width: number; height: number },
    world: { height: number; width: number },
    walls: Segment[]
  ): void {
    // Calculate pathway
    const aStarInstance = new AStarFinder({
      grid: {
        matrix: obstacleGrid.grid,
      },
      diagonalAllowed: false,
      heuristic: "Euclidean",
    });

    const characterPosition = this.getPosition.bind(this)();

    if (characterPosition) {
      const neighbors = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
      let pathway: number[][] = [];

      for (const neighbor of neighbors) {
        let offsetX = 0;
        let offsetY = 0;
        switch (neighbor) {
          case "TOP":
            offsetY = -1;
            break;
          case "LEFT":
            offsetX = -1;
            break;
          case "BOTTOM":
            offsetY = +1;
            break;
          case "RIGHT":
            offsetX = +1;
            break;
        }
        pathway = aStarInstance.findPath(
          {
            x:
              pointToI(characterPosition, obstacleGrid.width, world.width) +
              offsetX,
            y:
              pointToJ(characterPosition, obstacleGrid.height, world.height) +
              offsetY,
          },
          {
            x: pointToI(pos, obstacleGrid.width, world.width),
            y: pointToJ(pos, obstacleGrid.height, world.height),
          }
        );

        if (pathway.length > 0) {
          break;
        }
      }

      // Optimize pathway
      const optimizedPathway = optimizePathway(
        pathway,
        obstacleGrid.width,
        obstacleGrid.height,
        world.width,
        world.height,
        this.radius,
        walls
      );

      if (this.debugging) {
        // Show path
        this.visualPath.forEach((graph) => graph.destroy());
        this.visualPath = [];
        optimizedPathway.forEach((point, i, arr) => {
          if (i < arr.length - 1) {
            const nextPoint = arr[i + 1];
            this.visualPath.push(
              drawLine(
                this.stage,
                point.toPoint,
                nextPoint.toPoint,
                0x0ff000,
                0.2,
                0.8
              )
            );
          }
        });
      }

      const speedPathway = generateSpeedPathway(optimizedPathway);

      let i = 0;
      clearInterval(this.movementTimer);
      this.movementTimer = window.setInterval(() => {
        if (i === speedPathway.length) {
          clearInterval(this.movementTimer);
          this.onStopListeners.forEach((listener) => listener());
        } else {
          const point = speedPathway[i];

          this.setPosition.bind(this)({ x: point.x, y: point.y });
          i++;
        }
      }, 50);
    }
  }

  private randomMoveTo(
    obstacleGrid: { grid: number[][]; width: number; height: number },
    world: { height: number; width: number },
    walls: Segment[]
  ) {
    const moveTo = this.moveTo.bind(this);
    return function () {
      moveTo(
        nodeToPoint(
          Math.floor(Math.random() * obstacleGrid.width * obstacleGrid.height),
          obstacleGrid.width,
          obstacleGrid.height,
          world.width,
          world.height
        ),
        obstacleGrid,
        world,
        walls
      );
    };
  }

  randomMovement(
    obstacleGrid: { grid: number[][]; width: number; height: number },
    world: { height: number; width: number },
    walls: Segment[]
  ): void {
    this.randomMoveFN = this.randomMoveTo(obstacleGrid, world, walls);
    this.randomMoveFN();
    this.addOnStopListener(this.randomMoveFN);
  }

  stopRandomMovement(): void {
    this.removeOnStopListener(this.randomMoveFN);
  }

  addOnPositionChangeListener(listener: (position: Projectable) => void): void {
    this.onPositionChangeListeners.push(listener);
  }

  removeOnPositionChangeListener(listener: () => void): void {
    this.onPositionChangeListeners = this.onPositionChangeListeners.filter(
      (fn) => fn === listener
    );
  }

  addOnStopListener(listener: () => void): void {
    this.onStopListeners.push(listener);
  }

  removeOnStopListener(listener: () => void): void {
    this.onStopListeners = this.onStopListeners.filter((fn) => fn === listener);
  }

  setDebugging(debugging: boolean): void {
    this.debugging = debugging;
  }

  getVision(): VisionPoint[] {
    const characterPosition = this.getPosition.bind(this)();
    if (characterPosition) {
      return computeVisionPolygon(
        { x: characterPosition.x, y: 0 - characterPosition.y },
        this.buildings
      );
    } else {
      return [];
    }
  }

  getBuildings(): Building[] {
    return this.buildings;
  }

  setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
  }

  show() {
    this.visible = true;
    if (this.animation) {
      this.animation.alpha = 1.0;
    }
  }

  hide() {
    this.visible = false;
    if (this.animation) {
      this.animation.alpha = 0.1;
    }
  }
}
