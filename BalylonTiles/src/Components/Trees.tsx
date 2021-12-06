import {
  ActionManager,
  ExecuteCodeAction,
  Scene,
  Sprite,
  SpriteManager,
  Vector3,
} from "@babylonjs/core";
import * as React from "react";
import { Tree } from "../hooks/useTrees";

interface TreesProps {
  scene: Scene;
  treesData: Tree[];
}

export function Trees({ scene, treesData }: TreesProps) {
  React.useEffect(() => {
    //Create a manager for the player's sprite animation
    const spriteManagerPlayer = new SpriteManager(
      "playerManager",
      "textures/tree.png",
      2000,
      { width: 841, height: 1032 },
      scene
    );
    spriteManagerPlayer.isPickable = true;

    treesData.forEach(({ point }) => {
      const player = new Sprite("tree", spriteManagerPlayer);
      player.size = 1.5;
      player.position = point;
    });
  }, [scene, treesData]);

  return null;
}
