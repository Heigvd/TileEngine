import {
  Scene,
  Engine,
  ArcRotateCamera,
  HemisphericLight,
  Nullable,
  Vector3,
} from "@babylonjs/core";
import * as React from "react";
import { SceneComponent, SceneComponentProps } from "./SceneComponent";

export interface ReactSceneProps extends SceneComponentProps {
  containerProps?: React.CanvasHTMLAttributes<HTMLDivElement>;
  children?: (
    ...arg: Parameters<NonNullable<SceneComponentProps["onSceneReady"]>>
  ) => React.ReactNode;
}

export function ReactScene({
  onSceneReady,
  onSceneDispose,
  containerProps,
  children,
  ...sceneProps
}: ReactSceneProps) {
  const [state, setState] = React.useState<{
    canvas: HTMLCanvasElement;
    scene: Scene;
    engine: Engine;
    camera: ArcRotateCamera;
    light: HemisphericLight;
  }>();

  const managedOnSceneReady = React.useCallback<
    NonNullable<SceneComponentProps["onSceneReady"]>
  >(
    (canvas, scene, engine, camera, light) => {
      onSceneReady && onSceneReady(canvas, scene, engine, camera, light);
      setState({ canvas, scene, engine, camera, light });
    },
    [onSceneReady]
  );

  const manageOnSceneDispose = React.useCallback<
    NonNullable<SceneComponentProps["onSceneDispose"]>
  >(
    (canvas, scene, engine, camera, light) => {
      onSceneDispose && onSceneDispose(canvas, scene, engine, camera, light);
      setState(undefined);
    },
    [onSceneDispose]
  );

  return (
    <div {...containerProps}>
      <SceneComponent
        {...sceneProps}
        onSceneReady={managedOnSceneReady}
        onSceneDispose={manageOnSceneDispose}
      />
      {children &&
        state != null &&
        children(
          state.canvas,
          state.scene,
          state.engine,
          state.camera,
          state.light
        )}
    </div>
  );
}
