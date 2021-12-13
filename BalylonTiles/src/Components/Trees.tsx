import { Scene, Sprite, SpriteManager, Vector3 } from "@babylonjs/core";
import * as React from "react";
import { Tree } from "../hooks/useTrees";

interface TreesProps {
  scene: Scene;
  treesData: Tree[];
}

// Problem with logarithmic depth
//https://www.html5gamedevs.com/topic/30500-uselogarithmicdepth-and-sprite/#comment-261590

export function Trees({ scene, treesData }: TreesProps) {
  const treesRef = React.useRef<Sprite[]>([]);

  React.useEffect(() => {
    treesRef.current.forEach((tree) => tree.dispose());
    treesRef.current = [];

    const spriteManagerPlayer = new SpriteManager(
      "treeManager",
      "textures/tree.png",
      2000,
      { width: 841, height: 1032 },
      scene
    );
    spriteManagerPlayer.isPickable = true;

    treesData.forEach(({ point }) => {
      const tree = new Sprite("tree", spriteManagerPlayer);
      tree.size = 5;
      tree.position = new Vector3(point[0], point[1] + tree.size / 2, point[2]);

      treesRef.current.push(tree);

      // const sphere = MeshBuilder.CreateSphere(
      //   "sphere",
      //   { diameter: 10 },
      //   scene
      // );
      // sphere.setAbsolutePosition(point);
      // const material = new StandardMaterial("SphereColor", scene);
      // material.alpha = 0.2;
      // material.diffuseColor = new Color3(0.2, 1, 0);
      // material.useLogarithmicDepth = true;
      // sphere.material = material;
    });
  }, [scene, treesData]);

  return null;
}
