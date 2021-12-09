import * as BABYLON from "@babylonjs/core";

export class SpriteManager extends BABYLON.SpriteManager {
  constructor(...args) {
    super(...args);

    if (!BABYLON.Effect.ShadersStore.spritesDepthVertexShader) {
      SpriteManager.init();
    }

    // Effects
    this._effectBase = this._scene
      .getEngine()
      .createEffect(
        "spritesDepth",
        [
          BABYLON.VertexBuffer.PositionKind,
          "options",
          "cellInfo",
          BABYLON.VertexBuffer.ColorKind,
        ],
        ["view", "projection", "textureInfos", "alphaTest"],
        ["diffuseSampler"],
        ""
      );
  }

  render() {
    // Check
    if (
      !this._effectBase.isReady() ||
      !this._effectFog.isReady() ||
      !this._spriteTexture ||
      !this._spriteTexture.isReady()
    ) {
      return;
    }

    const engine = this._scene.getEngine();
    const baseSize = this._spriteTexture.getBaseSize();

    // Sprites
    const deltaTime = engine.getDeltaTime();
    const max = Math.min(this._capacity, this.sprites.length);
    const rowSize = baseSize.width / this.cellWidth;

    let offset = 0;
    for (let index = 0; index < max; index++) {
      const sprite = this.sprites[index];
      if (!sprite) {
        continue;
      }

      sprite._animate(deltaTime);

      this._appendSpriteVertex(offset++, sprite, 0, 0, rowSize);
      this._appendSpriteVertex(offset++, sprite, 1, 0, rowSize);
      this._appendSpriteVertex(offset++, sprite, 1, 1, rowSize);
      this._appendSpriteVertex(offset++, sprite, 0, 1, rowSize);
    }

    this._buffer.update(this._vertexData);

    // Render
    let effect = this._effectBase;

    if (
      this._scene.fogEnabled &&
      this._scene.fogMode !== BABYLON.Scene.FOGMODE_NONE &&
      this.fogEnabled
    ) {
      effect = this._effectFog;
    }

    engine.enableEffect(effect);

    const viewMatrix = this._scene.getViewMatrix();
    effect.setTexture("diffuseSampler", this._spriteTexture);
    effect.setMatrix("view", viewMatrix);
    effect.setMatrix("projection", this._scene.getProjectionMatrix());

    effect.setFloat2(
      "textureInfos",
      this.cellWidth / baseSize.width,
      this.cellHeight / baseSize.height
    );

    // Fog
    if (
      this._scene.fogEnabled &&
      this._scene.fogMode !== BABYLON.Scene.FOGMODE_NONE &&
      this.fogEnabled
    ) {
      effect.setFloat4(
        "vFogInfos",
        this._scene.fogMode,
        this._scene.fogStart,
        this._scene.fogEnd,
        this._scene.fogDensity
      );
      effect.setColor3("vFogColor", this._scene.fogColor);
    }

    // Log. depth
    effect.setFloat(
      "logarithmicDepthConstant",
      2.0 / (Math.log(this._scene.activeCamera.maxZ + 1.0) / Math.LN2)
    );

    // VBOs
    engine.bindBuffers(this._vertexBuffers, this._indexBuffer, effect);

    // Draw order
    engine.setDepthFunctionToLessOrEqual();
    effect.setBool("alphaTest", true);
    engine.setColorWrite(false);
    engine.draw(true, 0, max * 6);
    engine.setColorWrite(true);
    effect.setBool("alphaTest", false);

    engine.setAlphaMode(BABYLON.Engine.ALPHA_COMBINE);
    engine.draw(true, 0, max * 6);
    engine.setAlphaMode(BABYLON.Engine.ALPHA_DISABLE);
  }

  // Need to be called once
  static init() {
    BABYLON.Effect.ShadersStore.spritesDepthVertexShader =
      "attribute vec4 position;\nattribute vec4 options;\nattribute vec4 cellInfo;\nattribute vec4 color;\n\nuniform vec2 textureInfos;\nuniform mat4 view;\nuniform mat4 projection;\n\nletying vec2 vUV;\nletying vec4 vColor;\n#include<fogVertexDeclaration>\nuniform float logarithmicDepthConstant;\nletying float vFragmentDepth;\nvoid main(void) { \nvec3 viewPos=(view*vec4(position.xyz,1.0)).xyz; \nvec2 cornerPos;\nfloat angle=position.w;\nvec2 size=vec2(options.x,options.y);\nvec2 offset=options.zw;\nvec2 uvScale=textureInfos.xy;\ncornerPos=vec2(offset.x-0.5,offset.y-0.5)*size;\n\nvec3 rotatedCorner;\nrotatedCorner.x=cornerPos.x*cos(angle)-cornerPos.y*sin(angle);\nrotatedCorner.y=cornerPos.x*sin(angle)+cornerPos.y*cos(angle);\nrotatedCorner.z=0.;\n\nviewPos+=rotatedCorner;\ngl_Position=projection*vec4(viewPos,1.0); \nvFragmentDepth = 1.0 + gl_Position.w;\ngl_Position.z = log2(max(0.000001, vFragmentDepth)) * logarithmicDepthConstant;\n\nvColor=color;\n\nvec2 uvOffset=vec2(abs(offset.x-cellInfo.x),1.0-abs(offset.y-cellInfo.y));\nvUV=(uvOffset+cellInfo.zw)*uvScale;\n\n#ifdef FOG\nvFogDistance=viewPos;\n#endif\n}";
    BABYLON.Effect.ShadersStore.spritesDepthPixelShader =
      "uniform bool alphaTest;\nletying vec4 vColor;\n#extension GL_EXT_frag_depth : enable\nuniform float logarithmicDepthConstant;\nletying float vFragmentDepth;\n\nletying vec2 vUV;\nuniform sampler2D diffuseSampler;\n\n#include<fogFragmentDeclaration>\nvoid main(void) {\nvec4 color=texture2D(diffuseSampler,vUV);\nif (alphaTest) \n{\nif (color.a<0.95)\ndiscard;\n}\ncolor*=vColor;\n#include<fogFragment>\ngl_FragDepthEXT = log2(vFragmentDepth) * logarithmicDepthConstant * 0.5;\ngl_FragColor=color;\n}";
  }
}
