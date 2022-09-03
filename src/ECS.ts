export type Entity = number;
export abstract class Component {}
export abstract class System {
  public abstract componentsRequired: Set<ComponentClass>;
  public abstract update(
    entities: Set<Entity>,
    context: { event?: object }
  ): void;
  public ecs: ECS;
}

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
    this.entities.get(entity).add(component);
    this.checkE(entity);
  }

  public getComponents(entity: Entity): ComponentContainer {
    return this.entities.get(entity);
  }

  public removeComponent(entity: Entity, componentClass: ComponentClass): void {
    this.entities.get(entity).delete(componentClass);
    this.checkE(entity);
  }

  // API: Systems

  public addSystem(system: System): void {
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
  }

  public removeSystem(system: System): void {
    this.systems.delete(system);
  }

  /**
   * This is ordinarily called once per tick (e.g., every frame). It
   * updates all Systems, then destroys any Entities that were marked
   * for removal.
   */
  public update(context): void {
    // Update all systems. (Later, we'll add a way to specify the
    // update order.)
    for (let [system, entities] of this.systems.entries()) {
      system.update(entities, context);
    }

    // Remove any entities that were marked for deletion during the
    // update.
    while (this.entitiesToDestroy.length > 0) {
      this.destroyEntity(this.entitiesToDestroy.pop());
    }
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
    let have = this.entities.get(entity);
    let need = system.componentsRequired;
    if (have.hasAll(need)) {
      // should be in system
      this.systems.get(system).add(entity); // no-op if in
    } else {
      // should not be in system
      this.systems.get(system).delete(entity); // no-op if out
    }
  }
}
