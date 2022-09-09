import { Component, Entity } from "../ECS";

// components are independent,
// but there are archetypes which represent common groups of components
export class Positionable extends Component {
  constructor(public x: number, public y: number, public z: number) {
    super();
  }
}
export class Velocityable extends Component {
  constructor(public vx: number, public vy: number) {
    super();
  }
}
export class BoundingBoxable extends Component {
  constructor(public w: number, public h: number) {
    super();
  }
}
export class Drawable extends Component {}
export class Selectable extends Component {}
export class Selected extends Component {}
export class Clickable extends Component {}
export class Transparent extends Component {}

export class Nameable extends Component {
  constructor(public name: string) {
    super();
  }
}

export class Dragging extends Component {
  constructor(public entityRef: Entity) {
    super();
  }
}

export class Transform extends Component {
  constructor(public matrix: DOMMatrix) {
    super();
  }
}

export class Scrollable extends Component {}
export class Pannable extends Component {
  constructor(public x: number, public y: number) {
    super();
  }
}
export class Zoomable extends Component {
  constructor(public d: number) {
    super();
  }
}

export class SelectionDragBox extends Component {}

export class Animated extends Component {
  constructor(
    public fromX: number,
    public fromY: number,
    public fromT: number,
    public toX: number,
    public toY: number,
    public toT: number
  ) {
    super();
  }
}
