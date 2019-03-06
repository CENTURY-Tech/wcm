const map = new WeakMap();

export function MemoizeProcedure(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<() => any>) {
  const fn: any = descriptor.value;

  descriptor.value = function() {
    if (!map.has(this)) {
      map.set(this, fn.apply(this, arguments));
    }

    return map.get(this);
  };
}
