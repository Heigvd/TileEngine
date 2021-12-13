import { Scene, Sprite, SpriteManager, Vector3 } from "@babylonjs/core";
import * as React from "react";
import { ExportedValues } from "../DataApp";

interface PlayerProps {
  scene: Scene;
  exportedData: ExportedValues;
  onPlayerMove?: (newPosition: Vector3) => void;
}

export function Player({ scene, exportedData, onPlayerMove }: PlayerProps) {
  const { initialPosition } = exportedData;

  const [position, setPosition] = React.useState(
    new Vector3(...initialPosition)
  );

  const playerRef = React.useRef<Sprite>();

  React.useEffect(() => {
    //Create a manager for the player's sprite animation
    const spriteManagerPlayer = new SpriteManager(
      "playerManager",
      "textures/player.png",
      2,
      64,
      scene
    );
    spriteManagerPlayer.isPickable = true;

    // First animated player
    const player = new Sprite("player", spriteManagerPlayer);
    player.playAnimation(0, 40, true, 100);
    player.position.y = 0.3;
    player.size = 0.3;
    player.isPickable = true;

    // click action for player (not working)
    // player.actionManager = new ActionManager(scene);
    // player.actionManager.registerAction(
    //   new ExecuteCodeAction(ActionManager.OnPickUpTrigger, function () {
    //     console.log("CLICKED");
    //     alert("player clicked");
    //   })
    // );
    playerRef.current = player;

    // Manage player position (Bad performance, should be done elsewhere )
    scene.onPointerDown = function (event, pickResult) {
      const vector: Vector3 = new Vector3();

      if (pickResult.pickedPoint) {
        //left mouse click
        // if (event.button == 0) {
        //   vector = pickResult.pickedPoint;
        //   console.log(
        //     "left mouse click: " + vector.x + "," + vector.y + "," + vector.z
        //   );

        //   const newPosition = new Vector3(vector.x, vector.y + 0.15, vector.z);

        //   setPosition(newPosition);
        //   onPlayerMove && onPlayerMove(newPosition);
        // }
        // //right mouse click
        if (event.button == 2 && vector) {
          vector.x = pickResult.pickedPoint.x;
          vector.y = pickResult.pickedPoint.y;
          vector.z = pickResult.pickedPoint.z;
          console.log(
            "right mouse click: " + vector.x + "," + vector.y + "," + vector.z
          );

          const newPosition = new Vector3(vector.x, vector.y + 0.15, vector.z);

          setPosition(newPosition);
          onPlayerMove && onPlayerMove(newPosition);
        }
        // //Wheel button or middle button on mouse click
        // if (event.button == 1) {
        //   vector["x"] = pickResult.pickedPoint["x"];
        //   vector["y"] = pickResult.pickedPoint["y"];
        //   vector["z"] = pickResult.pickedPoint["z"];
        //   console.log(
        //     "middle mouse click: " + vector.x + "," + vector.y + "," + vector.z
        //   );
        // }
      }
    };
  }, [onPlayerMove, scene]);

  React.useEffect(() => {
    const player = playerRef.current;
    if (player) {
      player.position = position;
    }
  }, [position]);

  return null;
}
