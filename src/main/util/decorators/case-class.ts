type Constructor<T> = { new (...args: any[]): T };

export interface CaseClass {
  copy(overrides?: Partial<this>): this;
}

export function CaseClass<T extends Constructor<{}>>(constructor: T): T & Constructor<CaseClass> {
  return class extends constructor implements CaseClass {
    public copy(overrides: Partial<this> = {}): this {
      return Object.assign(Object.create(Object.getPrototypeOf(this)), this, overrides);
    }
  };
}
