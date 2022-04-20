import React from "react";
import MapWrapper from "./MapWrapper";
import * as Cesium from "cesium";

Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYmYxYzM3My1hYjYxLTRkOTEtOGEwMy00NjRkYzJmYWZmYTUiLCJpZCI6ODI3ODksImlhdCI6MTY0NTYxMzkwNH0.unXWUAVEoYQd8n4J7PyTp8nsslF3CoD5w8l4Z61saOE";

export default function App() {
  return <MapWrapper />;

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
