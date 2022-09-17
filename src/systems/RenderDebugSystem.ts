import { Transform, PanZoomable } from "./../components/index";
import { System, Entity } from "../ECS";
import { TRANSFORM_ELEMENT } from "../constants";

export class RenderDebugSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  private fps: number = 0;
  private frameCount: number = 0;
  private frameCountStart: number = NaN;
  private tick() {
    const now = Date.now();
    if (isNaN(this.frameCountStart)) {
      this.frameCountStart = Date.now();
    }
    this.frameCount++;

    const dt = now - this.frameCountStart;
    if (dt >= 1000) {
      this.fps = (1000 / dt) * this.frameCount;
      this.frameCount = 0;
      this.frameCountStart = now;
    }
  }

  componentsRequired = new Set([PanZoomable]);
  update(entities: Set<Entity>, event) {
    this.tick();

    const matrix = this.ecs
      .getComponents(TRANSFORM_ELEMENT)
      .get(Transform).matrix;

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const pan = comps.get(PanZoomable);

      this.ctx.save();
      this.ctx.resetTransform();
      this.ctx.fillText(`Pan: ${pan.x.toFixed(2)},${pan.y.toFixed(2)}`, 5, 12);
      this.ctx.fillText(
        `Zoom: ${matrix.a.toFixed(2)},${matrix.d.toFixed(2)}`,
        5,
        24
      );
      this.ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 5, 36);

      this.ctx.restore();

      break;
    }
  }
}
