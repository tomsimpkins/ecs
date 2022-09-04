type ECSEvent = { type: string };
type Listener = (event: ECSEvent) => void;

export class EventBus {
  private eventQueue: ECSEvent[] = [];

  private listenersByType: Record<string, Listener[]> = {};
  addListener = (type: string, listener: Listener): void => {
    this.listenersByType[type] ??= [];
    this.listenersByType[type].push(listener);
  };
  removeListener = (type: string, listener: Listener): boolean => {
    if (!this.listenersByType[type]) {
      return false;
    }

    const i = this.listenersByType[type].indexOf(listener);
    if (i === -1) {
      return false;
    }

    this.listenersByType[type].splice(i, 1);
    return true;
  };

  enqueueEvent = (event: ECSEvent): void => {
    this.eventQueue.push(event);
  };

  dequeueEvent = (): boolean => {
    if (!this.eventQueue.length) {
      return false;
    }

    const event = this.eventQueue.shift()!;
    this.listenersByType[event.type]?.forEach((listener) => listener(event));
    return true;
  };
}
