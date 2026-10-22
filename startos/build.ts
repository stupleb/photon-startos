import { healthFns, SubContainer, T } from '@start9labs/start-sdk'
import { ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readdir, rename, rm, stat, statfs } from 'node:fs/promises'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { ReadableStream } from 'node:stream/web'
import { setTimeout as sleep } from 'node:timers/promises'
import { emptyState, stateJson } from './fileModels/state.json'
import { i18n } from './i18n'
import { manifest } from './manifest'
import { regionName, regions } from './regions'
import { sdk } from './sdk'
import { dumpFile, dumpUrl, formatSize, photonJar, sameSet } from './utils'

export type Want = { regions: string[]; languages: string[]; refresh: number }

type Status =
  | { phase: 'idle' }
  | { phase: 'preparing' }
  | { phase: 'downloading'; region: string; done: number; total: number }
  | { phase: 'importing'; places: number }
  | { phase: 'failed'; error: string }

const volume = sdk.volumes.main
const dumpPath = (id: string) => volume.subpath(`dumps/${dumpFile(id)}`)

export const isBuilt = (want: Want, built: Want & { active: string | null }) =>
  !!built.active &&
  sameSet(want.regions, built.regions) &&
  sameSet(want.languages, built.languages) &&
  want.refresh === built.refresh

export class Builder {
  private status: Status = { phase: 'idle' }
  private run = 0
  private building: string | null = null
  private lock = Promise.resolve()

  constructor(private readonly effects: T.Effects) {}

  private locked<R>(fn: () => Promise<R>) {
    const result = this.lock.then(fn)
    this.lock = result.then(
      () => {},
      () => {},
    )
    return result
  }

  prune(active: string) {
    return this.locked(() => removeIndexes([active, this.building]))
  }

  async build(
    sub: SubContainer<typeof manifest>,
    abort: AbortSignal,
    want: Want,
  ) {
    const run = ++this.run
    const report = (status: Status) => {
      if (run === this.run) this.status = status
    }
    let target: string | null = null
    report({ phase: 'preparing' })
    try {
      const state = (await stateJson.read().once()) ?? emptyState
      target = await this.locked(async () => {
        await removeIndexes([state.active])
        return (this.building = `index-${Date.now()}`)
      })
      const ids = want.regions.filter((id) => id in regions)
      if (!ids.length) throw new Error(i18n('Choose at least one region'))
      const dumps = Object.fromEntries(
        Object.entries(state.dumps).filter(([id]) => ids.includes(id)),
      )
      await removeStaleDumps(ids)
      await save(this.effects, { dumps })

      const refreshing = want.refresh !== state.refresh
      const pending: { id: string; md5: string }[] = []
      for (const id of ids) {
        const cached =
          id in dumps &&
          (await md5Of(dumpPath(id), abort).catch(() => null)) === dumps[id].md5
        if (cached && !refreshing) continue
        const md5 = await fetchMd5(id, abort)
        if (!cached || dumps[id].md5 !== md5) pending.push({ id, md5 })
      }

      if (
        !pending.length &&
        state.active &&
        sameSet(want.regions, state.regions) &&
        sameSet(want.languages, state.languages)
      ) {
        await save(this.effects, { refresh: want.refresh })
        report({ phase: 'idle' })
        return
      }

      await checkSpace(
        ids,
        pending.map((p) => p.id),
      )
      for (const { id, md5 } of pending) {
        const date = await download(id, md5, abort, (done, total) =>
          report({ phase: 'downloading', region: id, done, total }),
        )
        dumps[id] = { md5, date }
        await save(this.effects, { dumps })
      }

      report({ phase: 'importing', places: 0 })
      await importDumps(sub, abort, target, ids, want.languages, (places) =>
        report({ phase: 'importing', places }),
      )
      await save(this.effects, { ...want, active: target, dumps })
      report({ phase: 'idle' })
    } catch (e) {
      if (abort.aborted) {
        report({ phase: 'idle' })
        throw e
      }
      console.error(e)
      report({ phase: 'failed', error: reason(e) })
      if (target)
        await rm(volume.subpath(target), {
          recursive: true,
          force: true,
        }).catch(() => {})
    } finally {
      if (run === this.run) this.building = null
    }
  }

  async health(): Promise<healthFns.HealthCheckResult> {
    const s = this.status
    if (s.phase === 'preparing')
      return { result: 'loading', message: i18n('Preparing the update') }
    if (s.phase === 'downloading')
      return {
        result: 'loading',
        message: i18n('Downloading ${region}: ${done} of ${total}', {
          region: regionName(s.region),
          done: formatSize(s.done),
          total: formatSize(s.total),
        }),
      }
    if (s.phase === 'importing')
      return {
        result: 'loading',
        message: i18n('Indexing places: ${count}', { count: s.places }),
      }
    const state = await stateJson.read().once()
    const serving = state?.active
      ? state.regions.map(regionName).join(', ')
      : null
    if (s.phase === 'failed')
      return {
        result: 'failure',
        message: serving
          ? i18n(
              'The update failed and Photon is still serving ${regions}. Restart Photon to try again. ${error}',
              { regions: serving, error: s.error },
            )
          : i18n(
              'Building the index failed. Restart Photon to try again. ${error}',
              { error: s.error },
            ),
      }
    if (!state || !serving)
      return { result: 'loading', message: i18n('Waiting to build the index') }
    const oldest = Math.min(
      ...state.regions.map(
        (id) => Date.parse(state.dumps[id]?.date ?? '') || Infinity,
      ),
    )
    return {
      result: 'success',
      message: Number.isFinite(oldest)
        ? i18n('Serving ${regions}, data from ${date}', {
            regions: serving,
            date: new Date(oldest),
          })
        : i18n('Serving ${regions}', { regions: serving }),
    }
  }
}

const save = (effects: T.Effects, patch: Partial<typeof emptyState>) =>
  stateJson.update(effects, (current) => ({
    ...(current ?? emptyState),
    ...patch,
  }))

const md5Of = async (path: string, signal: AbortSignal) => {
  const hash = createHash('md5')
  for await (const chunk of createReadStream(path, { signal }))
    hash.update(chunk)
  return hash.digest('hex')
}

const removeIndexes = async (keep: (string | null)[]) => {
  for (const entry of await readdir(volume.path))
    if (entry.startsWith('index-') && !keep.includes(entry))
      await rm(volume.subpath(entry), { recursive: true, force: true })
}

const removeStaleDumps = async (ids: string[]) => {
  await mkdir(volume.subpath('dumps'), { recursive: true })
  const keep = ids.flatMap((id) => [dumpFile(id), `${dumpFile(id)}.part`])
  for (const entry of await readdir(volume.subpath('dumps')))
    if (!keep.includes(entry))
      await rm(volume.subpath(`dumps/${entry}`), { force: true })
}

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e))

const fetchMd5 = async (id: string, signal: AbortSignal) => {
  const url = `${dumpUrl(regions[id].continent, id)}.md5`
  const md5 = await fetch(url, { signal })
    .then((res) => (res.ok ? res.text() : Promise.reject(`HTTP ${res.status}`)))
    .then((text) => text.match(/^[0-9a-f]{32}/i)?.[0].toLowerCase())
    .catch((e) => {
      signal.throwIfAborted()
      throw new Error(
        i18n('Could not reach the download server for ${region}: ${reason}', {
          region: regionName(id),
          reason: reason(e),
        }),
      )
    })
  if (!md5)
    throw new Error(
      i18n('The download server gave no checksum for ${region}', {
        region: regionName(id),
      }),
    )
  return md5
}

const checkSpace = async (ids: string[], downloads: string[]) => {
  const bytes = (list: string[]) =>
    list.reduce((sum, id) => sum + regions[id].mb * 1e6, 0)
  // An index measured up to 5.1 times its compressed download.
  const need = bytes(downloads) + 6 * bytes(ids)
  const { bavail, bsize } = await statfs(volume.path)
  if (bavail * bsize < need)
    throw new Error(
      i18n(
        'Not enough free space: the update needs about ${need} and ${free} is free',
        { need: formatSize(need), free: formatSize(bavail * bsize) },
      ),
    )
}

const download = async (
  id: string,
  md5: string,
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchDump(id, md5, signal, onProgress)
    } catch (e) {
      signal.throwIfAborted()
      if (attempt === 3)
        throw new Error(
          i18n('Could not download ${region}: ${reason}', {
            region: regionName(id),
            reason: reason(e),
          }),
        )
      console.warn(`Download of ${id} failed, retrying: ${reason(e)}`)
      await sleep(attempt * 15_000, undefined, { signal })
    }
  }
}

const fetchDump = async (
  id: string,
  md5: string,
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
) => {
  const file = dumpPath(id)
  const part = `${file}.part`
  let offset = (await stat(part).catch(() => null))?.size ?? 0
  const res = await fetch(dumpUrl(regions[id].continent, id), {
    signal,
    headers: offset ? { range: `bytes=${offset}-` } : {},
  })
  if (res.status === 200) offset = 0
  else if (res.status !== 206) {
    await res.body?.cancel()
    if (res.status !== 416) throw new Error(`HTTP ${res.status}`)
  }

  const hash = createHash('md5')
  if (offset)
    for await (const chunk of createReadStream(part)) hash.update(chunk)
  if (res.status !== 416 && res.body) {
    const total = offset + Number(res.headers.get('content-length') ?? 0)
    let done = offset
    await pipeline(
      Readable.fromWeb(res.body as ReadableStream),
      new Transform({
        transform(chunk: Buffer, _, next) {
          hash.update(chunk)
          done += chunk.length
          onProgress(done, total)
          next(null, chunk)
        },
      }),
      createWriteStream(part, { flags: offset ? 'a' : 'w' }),
      { signal },
    )
  }
  if (hash.digest('hex') !== md5) {
    await rm(part, { force: true })
    throw new Error(i18n('the download did not match its checksum'))
  }
  await rename(part, file)
  const modified = res.headers.get('last-modified')
  return (modified ? new Date(modified) : new Date()).toISOString()
}

const exited = (child: ChildProcess) =>
  new Promise<number | null>((resolve) => {
    child.once('exit', resolve)
    child.once('error', () => resolve(null))
  })

const importDumps = async (
  sub: SubContainer<typeof manifest>,
  signal: AbortSignal,
  target: string,
  ids: string[],
  languages: string[],
  onProgress: (places: number) => void,
) => {
  const java = await sub.spawn(
    [
      'java',
      // Below 1 GB, OpenSearch starts refusing the import's bulk writes.
      '-Xmx1g',
      '-XX:+ExitOnOutOfMemoryError',
      '--enable-native-access=ALL-UNNAMED',
      '-jar',
      photonJar,
      'import',
      '-import-file',
      '-',
      '-data-dir',
      `/data/${target}`,
      '-languages',
      languages.join(','),
    ],
    { stdio: 'pipe' },
  )
  const javaExit = exited(java)
  let zstd: ChildProcess | null = null
  const kill = () => {
    java.kill('SIGKILL')
    zstd?.kill('SIGKILL')
  }
  signal.addEventListener('abort', kill)
  if (signal.aborted) kill()

  const log: string[] = []
  let started = () => {}
  const output = new Promise<void>((resolve) => (started = resolve))
  const follow = (stream: Readable | null) => {
    if (!stream) return null
    const lines = createInterface({ input: stream }).on('line', (line) => {
      started()
      console.info(line)
      log.push(line)
      if (log.length > 50) log.shift()
      const count = line.match(/(?:Imported|Finished import of) (\d+)/)
      if (count) onProgress(Number(count[1]))
    })
    return once(lines, 'close')
  }
  const closed = [follow(java.stdout), follow(java.stderr)]

  // Execs starting together in one subcontainer race on its pivot_root directory.
  await Promise.race([output, javaExit])
  signal.throwIfAborted()
  zstd = await sub.spawn(
    ['zstd', '-dcq', '--', ...ids.map((id) => `/data/dumps/${dumpFile(id)}`)],
    { stdio: 'pipe' },
  )
  const zstdExit = exited(zstd)
  zstd.stdin?.end()
  follow(zstd.stderr)
  java.stdin?.on('error', () => {})
  if (java.stdin) zstd.stdout?.pipe(java.stdin)

  const javaCode = await javaExit
  await Promise.all(closed)
  zstd.stdout?.destroy()
  java.stdin?.destroy()
  if (javaCode !== 0) zstd.kill('SIGKILL')
  const zstdCode = await zstdExit
  signal.removeEventListener('abort', kill)
  signal.throwIfAborted()
  if (zstdCode !== 0 || javaCode !== 0)
    throw new Error(
      i18n('Indexing stopped with an error: ${detail}', {
        detail:
          log.filter((l) => /error|exception/i.test(l)).pop() ??
          log.at(-1) ??
          `exit ${javaCode}`,
      }),
    )
}
