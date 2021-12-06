import {
  ActionManager,
  ExecuteCodeAction,
  Scene,
  Sprite,
  SpriteManager,
  Vector3,
} from "@babylonjs/core";
import * as React from "react";

interface PlayerProps {
  scene: Scene;
  position?: Vector3;
}

export function Player({ scene, position }: PlayerProps) {
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
  }, [scene]);

  React.useEffect(() => {
    const player = playerRef.current;
    if (player && position) {
      player.position = position;
    }
  }, [position]);

  return null;
}
