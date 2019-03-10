export function inDfsOrder<T>(root: T, getChildren: (node: T) => ReadonlyArray<T>) {
    const result: T[] = [];

    function addWithChildrenRecursive(subroot: T) {
        result.push(subroot);
        for (let child of getChildren(subroot))
            addWithChildrenRecursive(child);
    }

    addWithChildrenRecursive(root);
    return result;
}

