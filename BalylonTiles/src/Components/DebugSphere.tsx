import * as React from "react";
import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

interface DebugSphere {
  x?: number;
  y?: number;
  z?: number;
  scene: Scene;
  color?: Color3;
}

export function DebugSphere({
  scene,
  x = 0,
  y = 0,
  z = 0,
  color,
}: DebugSphere) {
  const sphereRef = React.useRef<Mesh | undefined>();

  React.useLayoutEffect(() => {
    if (scene != null) {
      sphereRef.current = MeshBuilder.CreateSphere(
        "sphere",
        { diameter: 1 },
        scene
      );
    }
  }, [scene]);

  React.useEffect(() => {
    if (sphereRef.current != null) {
      sphereRef.current.setAbsolutePosition(new Vector3(x, y, z));
    }
  }, [y, x, z]);

  React.useEffect(() => {
    if (sphereRef.current != null && color != null) {
      const material = new StandardMaterial("SphereColor", scene);
      material.alpha = 1;
      material.diffuseColor = color;
      sphereRef.current.material = material;
    }
  }, [color, scene]);

  return null;
}
