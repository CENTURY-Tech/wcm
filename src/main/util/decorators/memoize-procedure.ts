
export function MemoizeProcedure(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...args: any[]) => any>) {
  const map = new Map();
  const fn = descriptor.value as any;

  descriptor.value = function() {
    const key = Array.from(arguments).toString();
    
    if (!map.has(key)) {
      map.set(key, fn.apply(this, arguments));
    }

    return map.get(key);
  };
}
