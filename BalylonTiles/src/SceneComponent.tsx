import * as React from "react";

import {
  ArcRotateCamera,
  Engine,
  EngineOptions,
  HemisphericLight,
  Scene,
  SceneOptions,
  Vector3,
} from "@babylonjs/core";

export interface SceneComponentProps {
  antialias?: boolean;
  engineOptions?: EngineOptions;
  adaptToDeviceRatio?: boolean;
  sceneOptions?: SceneOptions;
  onRender?: (
    canvas: HTMLCanvasElement,
    scene: Scene,
    engine: Engine,
    camera: ArcRotateCamera,
    light: HemisphericLight
  ) => void;
  onSceneReady?: (
    canvas: HTMLCanvasElement,
    scene: Scene,
    engine: Engine,
    camera: ArcRotateCamera,
    light: HemisphericLight
  ) => void;
  onSceneDispose?: (
    canvas: HTMLCanvasElement,
    scene: Scene,
    engine: Engine,
    camera: ArcRotateCamera,
    light: HemisphericLight
  ) => void;
  canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
}

export function SceneComponent({
  antialias,
  engineOptions,
  adaptToDeviceRatio,
  sceneOptions,
  onRender,
  onSceneReady,
  onSceneDispose,
  canvasProps,
}: SceneComponentProps) {
  const reactCanvas = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    console.log("REALOAD SCENE");

    const canvas = reactCanvas.current;
    if (canvas) {
      const engine = new Engine(
        canvas,
        antialias,
        engineOptions,
        adaptToDeviceRatio
      );
      const scene = new Scene(engine, sceneOptions);

      // Create a rotating camera
      const camera = new ArcRotateCamera(
        "Camera",
        -Math.PI / 2,
        Math.PI / 3,
        20,
        Vector3.Zero(),
        scene
      );

      // Attach it to handle user inputs (keyboard, mouse, touch)
      camera.attachControl(canvas, true);

      // Add a light
      const light = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);

      if (scene.isReady()) {
        onSceneReady && onSceneReady(canvas, scene, engine, camera, light);
      } else {
        scene.onReadyObservable.addOnce((scene) => {
          onSceneReady && onSceneReady(canvas, scene, engine, camera, light);
        });
      }
      scene.onDisposeObservable.addOnce((scene) => {
        onSceneDispose && onSceneDispose(canvas, scene, engine, camera, light);
      });

      engine.runRenderLoop(() => {
        onRender && onRender(canvas, scene, engine, camera, light);
        scene.render();
      });

      const resize = () => {
        scene.getEngine().resize();
      };

      if (window) {
        window.addEventListener("resize", resize);
      }

      return () => {
        scene.getEngine().dispose();

        if (window) {
          window.removeEventListener("resize", resize);
        }
      };
    }
  }, [
    adaptToDeviceRatio,
    antialias,
    engineOptions,
    onRender,
    onSceneDispose,
    onSceneReady,
    reactCanvas,
    sceneOptions,
  ]);

  return <canvas ref={reactCanvas} {...canvasProps} />;
}
