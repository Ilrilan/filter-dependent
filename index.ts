/*
 * Атеншен!
 * Этот пакет, на данный момент, работат весьма неоптимально, но всё же быстро.
 * Что можно ускорить:
 * 1. Строить дерево зависимостей не на каждый файл, а сразу на все
 * 2. Завершать traverse дерева в тот момент, когда мы уткнулись в один из targetFiles
 * 3. Переписать всё на компилируемый язык программирования
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const precinct = require("precinct");
const cabinet = require("filing-cabinet");

const debug = require("debug");

const log = debug("fd");
const depslog = debug("fd:deps");
const tlog = debug("fd:traverse");

const core = new Set(["fs", "path", "http", "child_process", "util"]);

type Filename = string;

type Tree = {
  parents?: Set<Tree>;
  children: Record<Filename, Tree>;
  value: Filename;
};

type Options = {
  tsConfig?: Filename;
};

/*
 * Takes two array of files, and returns filtered version of the first one.
 * Filter condition is simple: leave a file if it dependent on any of the files from the second list.
 *
 * @example:
 * a.js: require('./b')
 * b.ts: import './c'
 * c.ts: // no imports
 * d.js: require('./c')
 * filterDependent(['a.js', 'd.js'], ['b.ts'])
 *  –> ['a.js']
 */
function filterDependent(
  sourceFiles: string[],
  targetFiles: string[],
  options: Options = {}
): string[] {
  const map = new Map();
  const rootNode = Object.create(null);

  // resolving abs and symlinks
  const sources = sourceFiles.map((f: string) =>
    fs.realpathSync(path.resolve(f))
  );
  const targets = targetFiles.map((f: string) =>
    fs.realpathSync(path.resolve(f))
  );
  const deadends = new Set(targets);

  const result = sources.filter((s: Filename) => {
    const fnode = {
      // parents: never, // no link to the pseodu tree's root
      children: Object.create(null),
      value: s
    };

    rootNode[s] = fnode;

    return hasSomeTransitiveDeps(s, deadends, fnode, map, options);
  });

  return result;
}

function markParentsAsDeadends(subtree: Tree, deadends: Set<Filename>): void {
  if (!subtree) {
    console.trace();
  }
  if (typeof subtree.parents === "undefined") {
    return;
  }

  for (let parent of subtree.parents) {
    deadends.add(parent.value);
    markParentsAsDeadends(parent, deadends);
  }
}

/*
 * Traversing a filename's dependencies and append them to the `subtree` and `map`.
 * Traverse process is limited by `deadends` – every file in it is a deadend.
 * If deadend is reached, `true` is returned, `false` otherwise.
 */
function hasSomeTransitiveDeps(
  filename: Filename,
  deadends: Set<Filename>,
  subtree: Tree,
  map: Map<Filename, Tree>,
  options: Options
) {
  tlog(`Start of process "${filename}"`, subtree);

  if (deadends.has(filename)) {
    markParentsAsDeadends(subtree, deadends);

    tlog(`Deadend reached, returning true`);

    return true;
  }

  // map.set for any filename must be called only after this if
  if (map.has(filename)) {
    tlog(`Already processed, returning`);

    return deadends.has(filename);
  }

  map.set(filename, subtree);

  const deps = getDeps(filename, options);
  const result = deps.some((dep: Filename) => {
    const parentnode = subtree;
    const fnode: Tree = map.has(dep)
      ? (map.get(dep) as Tree)
      : {
          parents: new Set(),
          children: Object.create(null),
          value: dep
        };

    if (typeof fnode.parents !== "undefined") {
      fnode.parents.add(parentnode);
    }
    parentnode.children[dep] = fnode;

    return hasSomeTransitiveDeps(dep, deadends, fnode, map, options);
  });

  tlog(`End of process "${filename}"`);

  return result;
}

function getDeps(filename: Filename, options: Options): Filename[] {
  depslog(`Processing "${filename}"`);

  const dependencies: string[] = precinct.paperwork(filename);

  depslog(`Extracted dependencies are`, dependencies);

  const resolved = dependencies
    .filter((dep: string) => !core.has(dep) && !dep.endsWith(".css"))
    .map((dep: Filename) => {
      const result = cabinet({
        partial: dep,
        filename,
        directory: path.dirname(filename),
        tsConfig: options.tsConfig
      });

      if (!result) {
        throw new Error(`Cannot resolve "${dep}"`);
      }

      return fs.realpathSync(result);
    })
    .filter((dep: Filename) => {
      return (
        dep.indexOf("node_modules") === -1 &&
        fs.existsSync(dep) &&
        fs.lstatSync(dep).isFile()
      );
    });

  depslog(`Resolved dependencies are`, resolved);

  return resolved;
}

// setTimeout(() => {

// }, 2000)

// const result = filterDependent([
//   './tests/cases/tree/ab.js',
//   './tests/cases/tree/ac.js',
// ], [
//   './tests/cases/tree/a.js',
//   './tests/cases/tree/acc.js',
// ])
// console.log('result', result)

module.exports = filterDependent;