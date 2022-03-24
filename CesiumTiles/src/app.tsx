import React from "react";
import {
  Cartesian3,
  Color,
  Cesium3DTile,
  Ion,
  createOsmBuildings,
} from "cesium";
import { Viewer, Entity, Scene, Primitive, Cesium3DTileset } from "resium";

Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2ZjNhNDkyNi04Zjk2LTRmOWYtODg2OS01Y2FhNTM0NjY4ZTciLCJpZCI6ODI3ODksImlhdCI6MTY0NTA4NDY5NX0.bLL5id7hBYbftY4GRNk1gMYOHoyO6ez9OdLBH8t8Ijc";

export default function App() {
  return (
    <Viewer full useBrowserRecommendedResolution>
      {/* <Cesium3DTileset> */}
      {/* {createOsmBuildings()} */}
      <Entity
        description="test"
        name="tokyo"
        point={{ pixelSize: 10 }}
        position={Cartesian3.fromDegrees(139.767052, 35.681167, 100)}
      />
      {/* </Cesium3DTileset> */}
    </Viewer>
  );
  // return (
  //   <Viewer full>
  //     <Entity
  //       name="Tokyo"
  //       position={Cartesian3.fromDegrees(139.767052, 35.681167, 100)}
  //       point={{ pixelSize: 10, color: Color.WHITE }}
  //       description="hoge"
  //     />
  //   </Viewer>
  // );
}
