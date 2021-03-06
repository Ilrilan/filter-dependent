import path from 'path'
// @ts-ignore
import { filterDependentSync } from '../src/index.ts'
import { pathToUnixPath } from '../src/utils'

function mf(fns: string[]) {
  return fns.map((f) => pathToUnixPath(path.resolve(process.cwd(), '__tests__', '__fixtures__', f)))
}

describe('Common', () => {
  it('Must remove duplicate sources', () => {
    const sources = mf(['tree/a.js', 'tree/a.js'])
    const result = filterDependentSync(sources, mf(['tree/ab.js']))

    expect(result).toEqual(mf(['tree/a.js']))
  })
})

describe('onMiss', () => {
  it('Must not throw if onMiss', () => {
    const sources = mf(['missing/a.js'])
    const targets = mf(['missing/b.js'])
    const onMiss = () => null

    expect(() => filterDependentSync(sources, targets, { onMiss })).not.toThrow()
  })

  it('Must throw if no onMiss', () => {
    const sources = mf(['missing/a.js'])
    const targets = mf(['missing/b.js'])

    expect(() => filterDependentSync(sources, targets)).toThrow()
  })

  it('Must call onMiss with args', () => {
    const sources = mf(['missing/a.js'])
    const targets = mf(['missing/b.js'])
    let fn
    let dep
    const onMiss = (f: string, d: string) => {
      fn = f.replace(pathToUnixPath(process.cwd()), '')
      dep = d
    }
    filterDependentSync(sources, targets, { onMiss })

    expect(fn).toEqual('/__tests__/__fixtures__/missing/a.js')
    expect(dep).toEqual('missing-lib')
  })
})

describe('externals', () => {
  it('Must not process thru externals', () => {
    const sources = mf(['externals/a.js'])
    let result = filterDependentSync(sources, mf(['externals/c.js']))

    expect(result).toEqual(mf(['externals/a.js']))

    result = filterDependentSync(sources, mf(['externals/c.js']), { externals: ['./b'] })

    expect(result).toEqual([])
  })
})
