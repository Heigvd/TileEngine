import * as React from "react";
import { StrictMode } from "react";
import ReactDOM from "react-dom";

import App from "../DataApp2";

const rootElement = document.getElementById("root");
ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  rootElement
);
