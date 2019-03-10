import {inDfsOrder} from './trees';

export interface HGraphNode {
    readonly id: number;
    readonly children: ReadonlyArray<HGraphNode>;
}

export interface HGraphArrow<TNode> {
    readonly from: TNode
    readonly to: TNode
}

export class HGraph<TNode, TArrow> {
    private nodes: ReadonlyArray<TNode>;
    private getId: (node: TNode) => number;
    private arrows: ReadonlyArray<HGraphArrow<TNode>>;

    constructor(options: {
        treeRoot: TNode,
        getId: (node: TNode) => number,
        getChildren: (parent: TNode) => ReadonlyArray<TNode>,
        arrows: ReadonlyArray<HGraphArrow<TNode>>,
    })
    {
        this.nodes = inDfsOrder(options.treeRoot, options.getChildren);
        this.getId = options.getId;
        this.arrows = options.arrows.slice();
    }

    public inDfsOrder(): ReadonlyArray<TNode> {
        return this.nodes;
    }

    public getNeighbors(node: TNode): ReadonlyArray<TNode> {
        const result = [];
        for (let arrow of this.arrows) {
            if (arrow.from === node)
                result.push(arrow.to);
            if (arrow.to === node)
                result.push(arrow.from);
        }
        return result;
    }

    public getNext(node: TNode): ReadonlyArray<TNode> {
        return this.arrows.filter(x => x.from === node).map(x => x.to);
    }

    public findPath(from: TNode, to: TNode): ReadonlyArray<TNode> | undefined {
        const backtracks: {[id: number]:TNode} = {};
        const marked: {[id: number]:true} = {};
        const queue: TNode[] = [];

        const toId = this.getId(to);

        queue.push(from);
        marked[this.getId(from)] = true;
        while (queue.length > 0)
        {
            const node = queue.shift()!;
            for (let neighbor of this.getNext(node))
            {
                const neighborId = this.getId(neighbor);
                if (marked.hasOwnProperty(neighborId))
                    continue;
                marked[neighborId] = true;
                backtracks[neighborId] = node;
                queue.push(neighbor);

                if (neighborId === toId)
                {
                    const rpath: TNode[] = [];
                    let pathNode = neighbor;
                    let pathNodeId = this.getId(pathNode);
                    rpath.push(pathNode);
                    while (backtracks[pathNodeId]) {
                        let prev = backtracks[pathNodeId];
                        rpath.push(prev);
                        pathNode = prev;
                        pathNodeId = this.getId(pathNode);
                    }
                    rpath.reverse();
                    return rpath;
                }
            }
        }
        return undefined;
    }
}