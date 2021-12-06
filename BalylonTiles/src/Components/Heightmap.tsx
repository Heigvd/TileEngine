import {
  ActionManager,
  Color3,
  ExecuteCodeAction,
  Mesh,
  MeshBuilder,
  MultiMaterial,
  Scene,
  Sprite,
  SpriteManager,
  StandardMaterial,
  SubMesh,
  Texture,
  Vector3,
  VertexData,
} from "@babylonjs/core";
import * as React from "react";
import mergeImages from "merge-images";
import { HEIGHTS_ROW } from "../hooks/useHeights";

interface HeightmapProps {
  scene: Scene;
  heights: Vector3[];
  zoom: number;
  xFirstTile: number;
  zLastTile: number;
  subdivisions: {
    w: number;
    h: number;
  };
}

export function Heightmap({
  scene,
  heights,
  zoom,
  xFirstTile,
  zLastTile,
  subdivisions,
}: HeightmapProps) {
  React.useEffect(() => {
    // debugger;
    if (heights.length > 0) {
      // https://stackoverflow.com/questions/22823752/creating-image-from-array-in-javascript-and-html5
      const positions = heights.flatMap((height) => [
        height.x,
        height.y,
        height.z,
      ]);

      // const indices: number[] = [];
      // for (let col = 0; col < HEIGHTS_COLS; col += 1) {
      //   for (let row = 0; row < HEIGHTS_ROW; row += 1) {
      //     const index = col * HEIGHTS_ROW + row;
      //     const nextRowIndex = (col + 2) * HEIGHTS_ROW - row;
      //     if (col % 2 === 0) {
      //       indices.push(index);
      //       indices.push(nextRowIndex - 1);
      //       indices.push(index + 1);

      //       // indices.push(index + 1);
      //       // indices.push(nextRowIndex - 1);
      //       // indices.push(nextRowIndex - 2);
      //     } else {
      //       // indices.push(index);
      //       // indices.push(index + 1);
      //       // indices.push(nextRowIndex - 1);
      //       // indices.push(index + 1);
      //       // indices.push(nextRowIndex - 2);
      //       // indices.push(nextRowIndex - 1);
      //     }
      //   }
      // }

      const indices: number[] = [];
      const nbSubdivisions = subdivisions.h * subdivisions.w;
      for (let sub = 0; sub < nbSubdivisions; sub += 1) {
        for (let i = 0; i < heights.length / nbSubdivisions; i += 1) {
          // const index = col * HEIGHTS_ROW + row;
          const col = Math.floor(i / HEIGHTS_ROW);
          const row = Math.round(i % HEIGHTS_ROW);
          const nextRowIndex = (col + 2) * HEIGHTS_ROW - row;
          if (col % 2 === 0) {
            indices.push(i);
            indices.push(nextRowIndex - 1);
            indices.push(i + 1);

            indices.push(i + 1);
            indices.push(nextRowIndex - 1);
            indices.push(nextRowIndex - 2);
          } else {
            indices.push(i);
            indices.push(i + 1);
            indices.push(nextRowIndex - 1);

            indices.push(i + 1);
            indices.push(nextRowIndex - 2);
            indices.push(nextRowIndex - 1);
          }
        }
      }

      const minX = Math.min(...heights.map((h) => h.x));
      const maxX = Math.max(...heights.map((h) => h.x));
      const minZ = Math.min(...heights.map((h) => h.z));
      const maxZ = Math.max(...heights.map((h) => h.z));

      const uvs: number[] = [];
      for (let p = 0; p < positions.length / 3; p++) {
        uvs.push(
          (positions[3 * p] - minX) / (maxX - minX),
          (positions[3 * p + 2] - minZ) / (maxZ - minZ)
        );
      }
      const customMesh = new Mesh("custom", scene);
      const vertexData = new VertexData();
      //Empty array to contain calculated values or normals added
      const normals: number[] = [];
      vertexData.positions = positions;
      vertexData.indices = indices;
      vertexData.normals = normals; //Assignment of normal to vertexData added
      vertexData.uvs = uvs;
      vertexData.applyToMesh(customMesh);
      customMesh.convertToFlatShadedMesh();

      /////////////////////////////////////////////////////////////////////
      const verticesCount = customMesh.getTotalVertices();
      const tileIndicesLength =
        (customMesh.getIndices()?.length || 0) /
        (subdivisions.w * subdivisions.h);

      // // Set subMeshes of the tiled ground
      // customMesh.subMeshes = [];
      // let index = 0;
      // let base = 0;
      // for (let row = 0; row < subdivisions.h; row++) {
      //   for (let col = 0; col < subdivisions.w; col++) {
      //     const submesh = new SubMesh(
      //       index++,
      //       0,
      //       verticesCount,
      //       base,
      //       tileIndicesLength,
      //       customMesh
      //     );
      //     customMesh.subMeshes.push(submesh);
      //     base += tileIndicesLength;
      //   }
      // }

      const images: { src: string; x: number; y: number }[] = [];

      const multimat = new MultiMaterial("multi", scene);

      for (let row = 1; row <= subdivisions.h; row++) {
        for (let col = 0; col < subdivisions.w; col++) {
          const material = new StandardMaterial(
            "material" + row + "-" + col,
            scene
          );
          material.diffuseTexture = new Texture(
            // "http://b.tile.openstreetmap.org/" +
            "https://a.tile.openstreetmap.fr/osmfr/" +
              zoom +
              "/" +
              (xFirstTile + col) +
              "/" +
              (zLastTile - row) +
              ".png",
            scene
          );
          material.diffuseTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
          material.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
          material.specularColor = new Color3(0, 0, 0);
          material.backFaceCulling = false;
          multimat.subMaterials.push(material);

          //   images.push({
          //     src:
          //       "https://a.tile.openstreetmap.fr/osmfr/" +
          //       zoom +
          //       "/" +
          //       (xFirstTile + col) +
          //       "/" +
          //       (zLastTile - row) +
          //       ".png",
          //     x: col * 256,
          //     y: subdivisions.h * 256 - row * 256,
          //   });
        }
      }
      customMesh.subdivide(subdivisions.h * subdivisions.w);
      customMesh.material = multimat;

      // console.log(images);
      // mergeImages(images, {
      //   crossOrigin: "anonymous",
      //   height: 256 * subdivisions.h,
      //   width: 256 * subdivisions.w,
      // })
      //   .then((b64) => {
      //     debugger;

      //     console.log(b64);
      //     (document.getElementById("hello") as HTMLImageElement).src = b64;
      //     const mat = new StandardMaterial("Test", scene);
      //     mat.diffuseTexture = new Texture(b64, scene);
      //     // mat.diffuseTexture = new Texture("./textures/tree.png", scene);
      //     mat.diffuseTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
      //     mat.diffuseTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
      //     customMesh.material = mat;
      //   })
      //   .catch((e) => {
      //     debugger;
      //     console.log(e);
      //   });
    }
  }, [
    heights,
    scene,
    subdivisions.h,
    subdivisions.w,
    xFirstTile,
    zLastTile,
    zoom,
  ]);

  return (
    <div>
      <img id="hello" />
      {/* <canvas ref={canvas} width="200px" height="200px" /> */}
      {/* <img src={dataUri} /> */}
    </div>
  );
}
