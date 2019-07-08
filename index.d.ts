declare const fs: any;
declare const path: any;
declare const execSync: any;
declare const precinct: any;
declare const cabinet: any;
declare const debug: any;
declare const log: any;
declare const depslog: any;
declare const tlog: any;
declare const core: Set<string>;
declare type Filename = string;
declare type Tree = {
    parents?: Set<Tree>;
    children: Record<Filename, Tree>;
    value: Filename;
};
declare type Options = {
    tsConfig?: Filename;
};
declare function filterDependent(sourceFiles: string[], targetFiles: string[], options?: Options): string[];
declare function markParentsAsDeadends(subtree: Tree, deadends: Set<Filename>): void;
declare function hasSomeTransitiveDeps(filename: Filename, deadends: Set<Filename>, subtree: Tree, map: Map<Filename, Tree>, options: Options): boolean;
declare function getDeps(filename: Filename, options: Options): Filename[];