const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const appDirectory = fs.realpathSync(process.cwd());
const webpack = require("webpack");

module.exports = {
  entry: {
    world: path.resolve(appDirectory, "src/entries/index.tsx"),
    data: path.resolve(appDirectory, "src/entries/data.tsx"),
    test: path.resolve(appDirectory, "src/entries/test.tsx"),
  },

  output: {
    // path: "./dist/js/",
    // filename: "js/bundleName.js", //name for the javascript file that is created/compiled in memory
    clean: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new webpack.ProvidePlugin({
      earcut: "earcut",
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: path.resolve(appDirectory, "public/index.html"),
      inject: true,
      chunks: ["world"],
    }),
    new HtmlWebpackPlugin({
      filename: "data/index.html",
      template: path.resolve(appDirectory, "public/index.html"),
      inject: true,
      chunks: ["data"],
    }),
    new HtmlWebpackPlugin({
      filename: "test/index.html",
      template: path.resolve(appDirectory, "public/index.html"),
      inject: true,
      chunks: ["test"],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.xml$/i,
        use: "raw-loader",
      },
    ],
  },
  mode: "development",
  devServer: {
    host: "0.0.0.0",
    port: 3003, //port that we're using for local host (localhost:8080)
    static: path.resolve(appDirectory, "public"), //tells webpack to serve from the public folder
    hot: true,
    devMiddleware: {
      publicPath: "/",
    },
  },
};
