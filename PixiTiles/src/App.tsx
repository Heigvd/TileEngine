import "./styles.css";
import * as React from "react";
import { World } from "./World";
import { MenuProvider } from "./Menu";
import { testTiles, testMap } from "./testData";

export default function App(): JSX.Element {
  return (
    <div className="App">
      <h2>Pixi tiles engine</h2>
      <MenuProvider
        items={Object.entries(testTiles).map(([tile, path]) => ({
          id: tile,
          label: (
            <div style={{ display: "flex", flexDirection: "row" }}>
              <div style={{ flex: "1 1 auto" }}>{tile}</div>
              <img src={path} style={{ height: "20px" }} />
            </div>
          ),
          value: tile,
        }))}
      >
        <World tiles={testTiles} map={testMap} />
      </MenuProvider>
    </div>
  );
}
