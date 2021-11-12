import * as React from "react";
import {
  Application,
  Sprite,
  Texture,
  Graphics,
  Renderer,
  Polygon,
  Loader,
} from "pixi.js";
import { menuCTX } from "./Menu";

interface WorldProps {
  tiles: { [id: string]: string };
  map: string[][];
}

// function setup() {
//   const sheet = Loader.shared.resources["tiles"];
//   // const test = new Sprite(sheet.data["frames"]["grass.png"]);
//   // eslint-disable-next-line no-debugger
//   debugger;
// }

export function World({ tiles, map }: WorldProps): JSX.Element {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const movingTimer = React.useRef<NodeJS.Timer>();
  const [sprites, setSprites] = React.useState<Sprite[][]>([[]]);
  const menu = React.useContext(menuCTX);

  const [position, setPosition] = React.useState({
    x: map[Math.round(map.length / 2)].length / 2,
    y: -map.length / 2,
  });

  const moveWorld = React.useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case "a":
        setPosition((o) => ({ x: o.x + 10, y: o.y }));
        break;
      case "w":
        setPosition((o) => ({ x: o.x, y: o.y + 10 }));
        break;
      case "s":
        setPosition((o) => ({ x: o.x, y: o.y - 10 }));
        break;
      case "d":
        setPosition((o) => ({ x: o.x - 10, y: o.y }));
        break;
    }
  }, []);

  const startMoving = React.useCallback(
    (event: KeyboardEvent) => {
      if (movingTimer.current == null) {
        movingTimer.current = setInterval(() => moveWorld(event), 10);
      }
      menu.hideMenu();
    },
    [menu, moveWorld]
  );

  const stopMoving = React.useCallback(() => {
    if (movingTimer.current != null) {
      clearInterval(movingTimer.current);
      movingTimer.current = undefined;
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener("keydown", startMoving, false);
    window.addEventListener("keyup", stopMoving, false);
    return () => {
      stopMoving();
      window.removeEventListener("keydown", startMoving, false);
      window.addEventListener("keyup", stopMoving, false);
    };
  }, [startMoving, stopMoving]);

  const posX = position.x * 0.5 - position.y * 0.5;
  const posY = position.x * 0.25 + position.y * 0.25;

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

      // Loader.shared.add("tiles", "./tiles/test.json").load(setup);

      setSprites(
        map.map((tileRaw) =>
          tileRaw.map((tileId) => {
            const tile: Sprite = Sprite.from(tiles[tileId]);
            // const tile: Sprite = Sprite.from(sheet?.textures["grass.png"]);
            tile.interactive = true;
            tile.on("mousedown", (event) => {
              menu.showMenu(
                {
                  x: event.data.originalEvent.clientX,
                  y: event.data.originalEvent.clientY,
                },
                (event, itemId) => {
                  event.stopPropagation();
                  Texture.fromURL(tiles[itemId]).then((texture) => {
                    tile.texture = texture;
                    menu.hideMenu();
                  });
                }
              );
              console.log(event);
            });
            tile.hitArea = new Polygon([50, 0, 0, 25, 50, 50, 100, 25, 50, 0]); //[x,y, x,y, x,y, ...] OR [new Point(), new Point(), ...]
            app.stage.addChild(tile);
            return tile;
          })
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, tiles]);

  React.useEffect(() => {
    sprites.forEach((_, i) =>
      sprites[i].forEach((sprite, j) => {
        sprite.x = posX + i * 50 - j * 50;
        sprite.y = posY + i * 25 + j * 25;
        return sprite;
      })
    );
  }, [posX, posY, sprites]);

  return <canvas ref={ref} onClick={() => menu.hideMenu()} />;
}
