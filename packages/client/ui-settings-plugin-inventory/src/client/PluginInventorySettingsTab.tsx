/**
 * Read-only Loader inventory tab for the Plugins settings section, grouped by
 * mount plane so the shipped composition's same-name duplicate cards — a
 * plugin mounted once as a deliberately disabled host row and once inside the
 * standing agent preset — stay distinguishable. Every card carries the FULL
 * module name and the loader entry id, a module mounted several times carries
 * a multiplicity badge, and the card's disclosure interaction (expand for
 * configuration and Cordis status) is preserved.
 */

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import {
  IconChevronDownOutline14,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginInventoryLocaleKey } from './locales.ts'
import css from './PluginInventorySettingsTab.module.css'

/** Registration-side Remote face used by the section. */
export interface PluginInventorySettingsTabInjected {
  /** Read a current Host inventory snapshot. */
  list: () => Promise<PluginInventorySnapshot>
}

type PluginInventoryEntry = PluginInventorySnapshot['entries'][number]
type PluginFiberPhase = PluginInventoryEntry['fiberPhase']

/** Full component props assembled by the Settings slot renderer. */
export type PluginInventorySettingsTabProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'settings.pluginInventory'>
  & InjectFace<PluginInventorySettingsTabInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly snapshot: PluginInventorySnapshot }

/** The three mount planes the list groups entries into. */
type Plane = 'host' | 'preset' | 'runtime'

/** One rendered row: its inventory entry plus the snapshot-wide mount count. */
interface PluginInventoryRow {
  readonly entry: PluginInventoryEntry
  readonly count: number
}

const PHASE_KEYS = {
  pending: 'pending',
  loading: 'loadingPhase',
  active: 'active',
  failed: 'failed',
  unloading: 'unloading',
} satisfies Record<Exclude<PluginFiberPhase, null>, PluginInventoryLocaleKey>

const PLANE_KEYS = {
  host: 'planeHost',
  preset: 'planePreset',
  runtime: 'planeRuntime',
} satisfies Record<Plane, PluginInventoryLocaleKey>

const PLANE_ORDER: readonly Plane[] = ['host', 'preset', 'runtime']

/** Localized accessible label for one root Fiber phase. */
function phaseLabel(
  phase: PluginFiberPhase,
  t: PluginInventorySettingsTabProps['t'],
): string {
  return phase === null ? t('unobserved') : t(PHASE_KEYS[phase])
}

/**
 * The mount plane of one entry, derived from its loader id: ids inside the
 * standing agent-preset subtree carry the `agent-presets` segment, ids inside
 * the boot include are host rows, and every other id was minted at runtime
 * (the loader's random 8-hex ids). The id is classified for display grouping
 * only; it remains opaque as identity.
 * @param entryId - the loader entry id.
 * @returns the plane the entry belongs to.
 */
function planeOf(entryId: string): Plane {
  if (entryId.startsWith('include:agent-presets:')) return 'preset'
  if (entryId === 'include' || entryId.startsWith('include:')) return 'host'
  return 'runtime'
}

/** Whether an inventory row matches the local catalog query. */
function matches(entry: PluginInventoryEntry, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) return true
  return [entry.moduleName, entry.entryId]
    .some(value => value.toLocaleLowerCase().includes(normalizedQuery))
}

/** Render the read-only current Loader inventory grouped by mount plane. */
export function PluginInventorySettingsTab({ list, t }: PluginInventorySettingsTabProps): ReactNode {
  const catalogId = useId()
  const [request, setRequest] = useState(0)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [state, setState] = useState<ViewState>({ status: 'loading' })

  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => list()).then(
      (snapshot) => { if (current) setState({ status: 'ready', snapshot }) },
      () => { if (current) setState({ status: 'error' }) },
    )
    return () => { current = false }
  }, [list, request])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const entries = state.status === 'ready' ? state.snapshot.entries : []
  // Multiplicity is a property of the snapshot, not of the current filter, so
  // a filtered view still shows how many mounts a visible module has in total.
  const groups = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of entries) {
      counts.set(entry.moduleName, (counts.get(entry.moduleName) ?? 0) + 1)
    }
    const grouped: Record<Plane, PluginInventoryRow[]> = { host: [], preset: [], runtime: [] }
    for (const entry of entries) {
      if (!matches(entry, normalizedQuery)) continue
      const count = counts.get(entry.moduleName)
      /* v8 ignore next -- every rendered entry contributed to the counts map in the same pass */
      if (count === undefined) continue
      grouped[planeOf(entry.entryId)].push({ entry, count })
    }
    return grouped
  }, [entries, normalizedQuery])

  // A filter that removes the expanded entry collapses it, matching the
  // original disclosure behavior.
  useEffect(() => {
    if (expanded === null) return
    if (!PLANE_ORDER.some(plane => groups[plane].some(row => row.entry.entryId === expanded))) {
      setExpanded(null)
    }
  }, [expanded, groups])

  const retry = (): void => {
    setState({ status: 'loading' })
    setRequest(value => value + 1)
  }

  const anyVisible = PLANE_ORDER.some(plane => groups[plane].length > 0)
  const visibleCount = PLANE_ORDER.reduce((sum, plane) => sum + groups[plane].length, 0)

  return (
    <div className={css.section} aria-busy={state.status === 'loading'}>
      {state.status === 'loading' ? <p className={css.status}>{t('loading')}</p> : null}
      {state.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" onClick={retry}>{t('retry')}</button>
        </div>
      ) : null}
      {state.status === 'ready' ? (
        <div className={css.catalog}>
          <label className={css.search}>
            <IconSearchOutline16 aria-hidden="true" />
            <span className={css.visuallyHidden}>{t('search')}</span>
            <input
              type="search"
              value={query}
              placeholder={t('search')}
              aria-label={t('search')}
              onChange={(event) => { setQuery(event.currentTarget.value) }}
            />
          </label>
          <div className={css.catalogHeading}>
            <h3>{t('catalog')}</h3>
            <span data-plugin-count={visibleCount}>{visibleCount}</span>
          </div>
          {entries.length === 0 ? <p className={css.status}>{t('empty')}</p> : null}
          {entries.length > 0 && !anyVisible ? <p className={css.status}>{t('emptySearch')}</p> : null}
          {PLANE_ORDER.filter(plane => groups[plane].length > 0).map(plane => (
            <section key={plane} className={css.group} aria-label={t(PLANE_KEYS[plane])}>
              <h4 className={css.groupHeading}>
                {t(PLANE_KEYS[plane])}
                <span>{groups[plane].length}</span>
              </h4>
              <ul className={css.cards}>
                {groups[plane].map(({ entry, count }) => {
                  const status = phaseLabel(entry.fiberPhase, t)
                  const configuration = t(entry.enabled ? 'enabledTag' : 'disabledTag')
                  const open = expanded === entry.entryId
                  const detailId = `${catalogId}-details-${encodeURIComponent(entry.entryId)}`
                  return (
                    <li
                      className={css.card}
                      key={entry.entryId}
                      data-plugin-entry={entry.entryId}
                      data-open={open ? 'true' : undefined}
                    >
                      <button
                        className={css.cardContent}
                        type="button"
                        aria-expanded={open}
                        aria-controls={detailId}
                        aria-label={entry.enabled ? `${entry.moduleName}, ${status}, ${configuration}` : `${entry.moduleName}, ${configuration}`}
                        onClick={() => {
                          setExpanded(current => current === entry.entryId ? null : entry.entryId)
                        }}
                      >
                        <span className={css.identity}>
                          <strong className={css.cardTitle} title={entry.moduleName}>{entry.moduleName}</strong>
                          <code className={css.entryValue} data-loader-entry>{entry.entryId}</code>
                        </span>
                        <span className={css.cardTrailing}>
                          {count > 1 ? (
                            <span className={css.dupTag} title={t('duplicatesTooltip')}>
                              {'×'}{count}
                            </span>
                          ) : null}
                          {entry.enabled ? (
                            <span
                              className={css.statusDot}
                              data-phase={entry.fiberPhase ?? 'unobserved'}
                              role="img"
                              aria-label={status}
                              title={status}
                            />
                          ) : null}
                          <span className={css.configTag} data-enabled={entry.enabled ? 'true' : 'false'}>
                            {configuration}
                          </span>
                          <IconChevronDownOutline14 className={css.chevron} size={12} aria-hidden="true" />
                        </span>
                      </button>
                      {open ? (
                        <div className={css.cardDetails} id={detailId}>
                          <dl className={css.details}>
                            <div>
                              <dt>{t('configuration')}</dt>
                              <dd>{configuration}</dd>
                            </div>
                            {entry.enabled ? (
                              <div>
                                <dt>{t('cordis')}</dt>
                                <dd>{status}</dd>
                              </div>
                            ) : null}
                          </dl>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  )
}
