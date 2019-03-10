export interface ReadOnlyIntDictionary<T> {
    readonly [key:number]: T;
}

export interface IntDictionary<T> {
    [key:number]: T;
}

export class IntDictionaryMethods {
    static getOrAdd<T>(dict: IntDictionary<T>, key: number, create: (key: number) => T) : T {
        if (dict[key])
            return dict[key];
        const newVal = create(key);
        dict[key] = newVal;
        return newVal;
    }
}

export class NaiveSetMethods {
    static add<T>(set: T[], item: T) {
        if (set.indexOf(item) < 0)
            set.push(item);
    }
}
