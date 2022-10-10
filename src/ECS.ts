import { EventBus } from "./eventBus";
import { Timer } from "./Timer";

// entity is an identifier of a 'thing' in an app
export type Entity = number;
// components are attached to thing
export abstract class Component {}
// contains all your application logic
// applies to entities based on their components e.g. those which have position and velocity for movement
// this means you don't care what the entities are as a whole, just the traits they have
export abstract class System {
  public abstract componentsRequired: Set<ComponentClass>;
  public abstract update(
    entities: Set<Entity>,
    event: object,
    context: object
  ): void;
  public ecs: ECS;
}

// this is a simulation - it does things based on logic based on events

type ComponentClass<T extends Component = Component> = new (
  ...args: any[]
) => T;

class ComponentContainer {
  private map = new Map<ComponentClass, Component>();

  public add(component: Component): void {
    this.map.set(component.constructor as ComponentClass, component);
  }

  public get<T extends Component>(componentClass: ComponentClass<T>): T {
    return this.map.get(componentClass) as T;
  }

  public has(componentClass: ComponentClass): boolean {
    return this.map.has(componentClass);
  }

  public hasAll(componentClasses: Iterable<ComponentClass>): boolean {
    for (let cls of componentClasses) {
      if (!this.map.has(cls)) {
        return false;
      }
    }
    return true;
  }

  public delete(componentClass: ComponentClass): void {
    this.map.delete(componentClass);
  }
}

export class ECS {
  private timer = new Timer();
  private eventBus = new EventBus();
  private entities = new Map<Entity, ComponentContainer>();
  private systems = new Map<System, Set<Entity>>();

  // Bookkeeping for entities.
  private nextEntityID = 0;
  private entitiesToDestroy = new Array<Entity>();

  // API: Entities
  public addEntity(): Entity {
    let entity = this.nextEntityID;
    this.nextEntityID++;
    this.entities.set(entity, new ComponentContainer());
    return entity;
  }

  public removeEntity(entity: Entity): void {
    this.entitiesToDestroy.push(entity);
  }

  // API: Components
  public addComponent(entity: Entity, component: Component): void {
    this.entities.get(entity)!.add(component);
    this.checkE(entity);
  }

  public getComponents(entity: Entity): ComponentContainer {
    return this.entities.get(entity)!;
  }

  public removeComponent(entity: Entity, componentClass: ComponentClass): void {
    this.entities.get(entity)!.delete(componentClass);
    this.checkE(entity);
  }

  // API: Systems
  public addSystem(system: System, eventKey?: string | string[]): void {
    // Checking invariant: systems should not have an empty
    // Components list, or they'll run on every entity. Simply remove
    // or special case this check if you do want a System that runs
    // on everything.
    if (system.componentsRequired.size === 0) {
      console.warn("System not added: empty Components list.");
      console.warn(system);
      return;
    }

    // Give system a reference to the ECS so it can actually do
    // anything.
    system.ecs = this;

    // Save system and set who it should track immediately.
    this.systems.set(system, new Set());
    for (let entity of this.entities.keys()) {
      this.checkES(entity, system);
    }

    if (!eventKey) {
      return;
    }

    for (const k of typeof eventKey === "string" ? [eventKey] : eventKey) {
      this.connectSystemToEvent(k, system);
    }
  }

  public removeSystem(system: System): void {
    for (const [eventKey, cb] of this.listenersBySystem.get(system) ?? []) {
      this.eventBus.removeListener(eventKey, cb);
    }
    this.listenersBySystem.delete(system);

    this.systems.delete(system);
  }

  /**
   * This is ordinarily called once per tick (e.g., every frame). It
   * updates all Systems, then destroys any Entities that were marked
   * for removal.
   */
  public update(event): void {
    // enqueue then dequeue event
    this.eventBus.enqueueEvent(event);
    while (this.eventBus.dequeueEvent()) {} // dequeue event triggers logic
    // system has settled, so draw

    // Update all systems. (Later, we'll add a way to specify the
    // update order.)
    // for (const system of this.systems.keys()) {
    //   this.updateSystem(system, event);
    // }

    // Remove any entities that were marked for deletion during the
    // update.
    while (this.entitiesToDestroy.length > 0) {
      this.destroyEntity(this.entitiesToDestroy.pop()!);
    }
  }

  private updateSystem(system: System, event) {
    const entities = this.systems.get(system)!;

    const n = system.constructor.name;
    this.timer.time(n);
    system.update(entities, event, { enqueueEvent: this.enqueueEvent });
    this.timer.timeEnd(n);
  }

  // Private methods for doing internal state checks and mutations.

  private destroyEntity(entity: Entity): void {
    this.entities.delete(entity);
    for (let entities of this.systems.values()) {
      entities.delete(entity); // no-op if doesn't have it
    }
  }

  private checkE(entity: Entity): void {
    for (let system of this.systems.keys()) {
      this.checkES(entity, system);
    }
  }

  private checkES(entity: Entity, system: System): void {
    let have = this.entities.get(entity)!;
    let need = system.componentsRequired;
    if (have.hasAll(need)) {
      // should be in system
      this.systems.get(system)!.add(entity); // no-op if in
    } else {
      // should not be in system
      this.systems.get(system)!.delete(entity); // no-op if out
    }
  }

  public enqueueEvent = (event) => this.eventBus.enqueueEvent(event);

  private listenersBySystem = new Map<System, [string, any][]>();
  public connectSystemToEvent = (eventKey: string, system: System) => {
    const cb = (event) => {
      this.updateSystem(system, event);
    };
    this.eventBus.addListener(eventKey, cb);

    if (!this.listenersBySystem.has(system)) {
      this.listenersBySystem.set(system, []);
    }
    this.listenersBySystem.get(system)!.push([eventKey, cb]);
  };
}
