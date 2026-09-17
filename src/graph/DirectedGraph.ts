export default class DirectedGraph<T> {
  private forward = new Map<T, Set<T>>(); // node -> nodes it points to
  private reverse = new Map<T, Set<T>>(); // node -> nodes that point to it

  addNode(node: T): void {
    if (!this.forward.has(node)) {
      this.forward.set(node, new Set());
      this.reverse.set(node, new Set());
    }
  }

  addEdge(from: T, to: T): void {
    this.addNode(from);
    this.addNode(to);
    this.forward.get(from)!.add(to);
    this.reverse.get(to)!.add(from);
  }

  removeEdge(from: T, to: T): void {
    this.forward.get(from)?.delete(to);
    this.reverse.get(to)?.delete(from);
  }

  removeNode(node: T): void {
    for (const to of this.forward.get(node) ?? []) {
      this.reverse.get(to)?.delete(node);
    }
    for (const from of this.reverse.get(node) ?? []) {
      this.forward.get(from)?.delete(node);
    }
    this.forward.delete(node);
    this.reverse.delete(node);
  }

  /** Cubes this node feeds directly into (one hop forward). */
  children(node: T): T[] {
    return [...(this.forward.get(node) ?? [])];
  }

  /** Cubes that feed directly into this node (one hop back). */
  predecessors(node: T): T[] {
    return [...(this.reverse.get(node) ?? [])];
  }

  hasNode(node: T): boolean {
    return this.forward.has(node);
  }

  hasEdge(from: T, to: T): boolean {
    return this.forward.get(from)?.has(to) ?? false;
  }

  nodes(): T[] {
    return [...this.forward.keys()];
  }

  dfs(start: T): T[] {
    const visited = new Set<T>();
    const order: T[] = [];
    const stack: T[] = [start];

    while (stack.length) {
      const node = stack.pop()!;
      if (visited.has(node)) continue;
      visited.add(node);
      order.push(node);
      for (const n of this.children(node)) {
        if (!visited.has(n)) stack.push(n);
      }
    }
    return order;
  }

  bfs(start: T): T[] {
    const visited = new Set<T>([start]);
    const order: T[] = [];
    const queue: T[] = [start];

    while (queue.length) {
      const node = queue.shift()!;
      order.push(node);
      for (const n of this.children(node)) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    return order;
  }

  topologicalSort(): T[] | null {
    const inDegree = new Map<T, number>();
    for (const node of this.nodes()) inDegree.set(node, 0);
    for (const neighbors of this.forward.values()) {
      for (const n of neighbors) {
        inDegree.set(n, (inDegree.get(n) ?? 0) + 1);
      }
    }

    const queue: T[] = [...inDegree.entries()]
      .filter(([, deg]) => deg === 0)
      .map(([node]) => node);
    const order: T[] = [];

    while (queue.length) {
      const node = queue.shift()!;
      order.push(node);
      for (const n of this.children(node)) {
        inDegree.set(n, inDegree.get(n)! - 1);
        if (inDegree.get(n) === 0) queue.push(n);
      }
    }

    return order.length === this.forward.size ? order : null;
  }

  hasCycle(): boolean {
    return this.topologicalSort() === null;
  }

  /** All nodes reachable from `start` (excluding start itself). Alias: forward transitive closure. */
  reachableFrom(start: T): T[] {
    return this.dfs(start).filter(n => n !== start);
  }

  /** All cubes downstream of `node` — everything it transitively feeds into. */
  descendants(node: T): T[] {
    const visited = new Set<T>([node]);
    const stack: T[] = [node];
    const result: T[] = [];

    while (stack.length) {
      const current = stack.pop()!;
      for (const child of this.children(current)) {
        if (!visited.has(child)) {
          visited.add(child);
          result.push(child);
          stack.push(child);
        }
      }
    }
    return result;
  }

  /** All cubes `node` transitively depends on (its full upstream chain). */
  ancestors(node: T): T[] {
    const visited = new Set<T>([node]);
    const stack: T[] = [node];
    const result: T[] = [];

    while (stack.length) {
      const current = stack.pop()!;
      for (const pred of this.predecessors(current)) {
        if (!visited.has(pred)) {
          visited.add(pred);
          result.push(pred);
          stack.push(pred);
        }
      }
    }
    return result;
  }

  /** Returns the shortest path from `from` to `to` as an array of nodes, or null if none exists. */
  findPath(from: T, to: T): T[] | null {
    if (!this.forward.has(from) || !this.forward.has(to)) return null;
    if (from === to) return [from];

    const visited = new Set<T>([from]);
    const queue: T[] = [from];
    const cameFrom = new Map<T, T>();

    while (queue.length) {
      const node = queue.shift()!;
      for (const n of this.children(node)) {
        if (visited.has(n)) continue;
        visited.add(n);
        cameFrom.set(n, node);

        if (n === to) {
          const path: T[] = [to];
          let current = to;
          while (current !== from) {
            current = cameFrom.get(current)!;
            path.push(current);
          }
          return path.reverse();
        }

        queue.push(n);
      }
    }
    return null;
  }

  /** Groups of nodes connected ignoring edge direction. */
  weaklyConnectedComponents(): T[][] {
    const visited = new Set<T>();
    const components: T[][] = [];

    for (const start of this.nodes()) {
      if (visited.has(start)) continue;
      const component: T[] = [];
      const stack: T[] = [start];
      visited.add(start);

      while (stack.length) {
        const node = stack.pop()!;
        component.push(node);
        const allNeighbors = [
          ...(this.forward.get(node) ?? []),
          ...(this.reverse.get(node) ?? []),
        ];
        for (const n of allNeighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            stack.push(n);
          }
        }
      }
      components.push(component);
    }
    return components;
  }
}