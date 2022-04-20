import { Projectable } from "ink-geom2d";
import { Container, Graphics, Polygon } from "pixi.js";

export function drawLine(
  stage: Container,
  startPos: Projectable,
  endPos: Projectable,
  color = 0xff0000,
  width = 1,
  opacity = 0.6
) {
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
  stage.addChild(graphicLine);

  return graphicLine;
}

export function drawPolygon(
  stage: Container,
  polygonPoints: Projectable[]
): Graphics {
  const visionPolygon = new Polygon(polygonPoints);
  const visionGraphics = new Graphics();
  visionGraphics.beginFill(0x00ff00);
  visionGraphics.alpha = 0.2;
  visionGraphics.drawPolygon(visionPolygon);
  visionGraphics.endFill();
  stage.addChild(visionGraphics);
  return visionGraphics;
}
