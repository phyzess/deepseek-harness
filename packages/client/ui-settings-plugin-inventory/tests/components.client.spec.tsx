// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginInventorySettingsTab } from '../src/client/PluginInventorySettingsTab.tsx'
import type {
  PluginInventorySettingsTabInjected,
  PluginInventorySettingsTabProps,
} from '../src/client/PluginInventorySettingsTab.tsx'
import { en, zh, type PluginInventoryLocaleKey } from '../src/client/locales.ts'

afterEach(cleanup)

type Snapshot = Awaited<ReturnType<PluginInventorySettingsTabInjected['list']>>
const t = ((key: PluginInventoryLocaleKey): string => en[key]) as PluginInventorySettingsTabProps['t']

function props(list: PluginInventorySettingsTabInjected['list']): PluginInventorySettingsTabProps {
  return {
    t,
    list,
  } as PluginInventorySettingsTabProps
}

/**
 * The duplicate-shape snapshot this view exists to disambiguate: one module
 * mounted once as a disabled host row and once as an active preset row, every
 * fiber phase present, and runtime-minted ids beside include-scoped ids.
 */
const SNAPSHOT = {
  entries: [
    { entryId: 'include', moduleName: 'cordis:include', enabled: true, fiberPhase: 'active' },
    { entryId: 'include:tool-bash', moduleName: '@deepseek-ai/dsh-tool-bash', enabled: false, fiberPhase: null },
    { entryId: 'include:agent-presets:tool-bash', moduleName: '@deepseek-ai/dsh-tool-bash', enabled: true, fiberPhase: 'active' },
    { entryId: 'include:agent-presets:persona', moduleName: '@deepseek-ai/dsh-persona', enabled: true, fiberPhase: 'loading' },
    { entryId: 'include:agent-presets:plan-mode', moduleName: '@deepseek-ai/dsh-plan-mode', enabled: true, fiberPhase: 'failed' },
    { entryId: 'include:agent-presets:tool-todo', moduleName: '@deepseek-ai/dsh-tool-todo', enabled: true, fiberPhase: 'pending' },
    { entryId: 'include:agent-presets:tool-web', moduleName: '@deepseek-ai/dsh-tool-web', enabled: true, fiberPhase: 'unloading' },
    { entryId: 'include:agent-presets:tool-goal', moduleName: '@deepseek-ai/dsh-tool-goal', enabled: true, fiberPhase: null },
    { entryId: '5b2ba013', moduleName: '@deepseek-ai/cordis-plugin-hmr', enabled: true, fiberPhase: 'active' },
    { entryId: '06d3b694', moduleName: '@deepseek-ai/dsh-host-directory-picker-native', enabled: false, fiberPhase: null },
  ],
} as unknown as Snapshot

describe('PluginInventorySettingsTab', () => {
  it('renders the catalog grouped by mount plane with full identities', async () => {
    const deferred = Promise.withResolvers<Snapshot>()
    const list = vi.fn(() => deferred.promise)
    const view = render(<PluginInventorySettingsTab {...props(list)} />)
    expect(screen.getByText(en.loading)).toBeTruthy()

    await act(async () => { deferred.resolve(SNAPSHOT) })
    expect(list).toHaveBeenCalledOnce()
    expect(screen.getByRole('searchbox', { name: en.search })).toBeTruthy()
    expect(view.container.querySelector('[data-plugin-count]')?.getAttribute('data-plugin-count')).toBe('10')

    // Three planes, each with its localized heading and count.
    const host = screen.getByRole('region', { name: en.planeHost })
    const preset = screen.getByRole('region', { name: en.planePreset })
    const runtime = screen.getByRole('region', { name: en.planeRuntime })
    expect(host.querySelectorAll('[data-plugin-entry]')).toHaveLength(2)
    expect(preset.querySelectorAll('[data-plugin-entry]')).toHaveLength(6)
    expect(runtime.querySelectorAll('[data-plugin-entry]')).toHaveLength(2)

    // Full module names, not shortened titles — the host row and the preset
    // row show the SAME name, each on its own card.
    expect(screen.getAllByText('@deepseek-ai/dsh-tool-bash')).toHaveLength(2)

    // Entry ids are visible without any expansion.
    expect(screen.getByText('include:agent-presets:tool-bash')).toBeTruthy()
    expect(screen.getByText('5b2ba013')).toBeTruthy()

    // Eight enabled rows, two disabled rows; cards start collapsed.
    expect(screen.getAllByText(en.enabledTag)).toHaveLength(8)
    expect(screen.getAllByText(en.disabledTag)).toHaveLength(2)
    expect(screen.getAllByRole('button', { expanded: false })).toHaveLength(10)

    // The twice-mounted module carries a multiplicity badge on both cards.
    expect(screen.getAllByTitle(en.duplicatesTooltip)).toHaveLength(2)
    expect(screen.getAllByText('×2')).toHaveLength(2)

    // Runtime status dots stay announced per phase, enabled rows only.
    expect(screen.getAllByRole('img', { name: en.active })).toHaveLength(3)
    expect(screen.getByRole('img', { name: en.loadingPhase })).toBeTruthy()
    expect(screen.getByRole('img', { name: en.failed })).toBeTruthy()
    expect(screen.getByRole('img', { name: en.pending })).toBeTruthy()
    expect(screen.getByRole('img', { name: en.unloading })).toBeTruthy()
    expect(screen.getByRole('img', { name: en.unobserved })).toBeTruthy()
  })

  it('expands a card for its configuration and Cordis status, and collapses it again', async () => {
    render(<PluginInventorySettingsTab {...props(async () => SNAPSHOT)} />)
    const enabled = await screen.findByRole('button', {
      name: '@deepseek-ai/dsh-tool-bash, Mounted, Enabled',
    })
    expect(enabled.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(enabled)
    expect(enabled.getAttribute('aria-expanded')).toBe('true')
    const enabledCard = enabled.closest('[data-plugin-entry]') as HTMLElement
    const enabledDetails = within(enabledCard)
    expect(enabledDetails.getByText(en.configuration)).toBeTruthy()
    expect(enabledDetails.getByText(en.cordis)).toBeTruthy()
    expect(enabledDetails.getByText(en.active)).toBeTruthy()
    fireEvent.click(enabled)
    expect(enabled.getAttribute('aria-expanded')).toBe('false')
    expect(within(enabledCard).queryByText(en.cordis)).toBeNull()

    // A disabled row shows configuration but omits the redundant Cordis row.
    const disabled = screen.getByRole('button', {
      name: '@deepseek-ai/dsh-tool-bash, Disabled',
    })
    fireEvent.click(disabled)
    expect(disabled.getAttribute('aria-expanded')).toBe('true')
    const disabledCard = disabled.closest('[data-plugin-entry]') as HTMLElement
    expect(within(disabledCard).getByText(en.configuration)).toBeTruthy()
    // The collapsed-state tag and the details value both read "Disabled".
    expect(within(disabledCard).getAllByText(en.disabledTag)).toHaveLength(2)
    expect(within(disabledCard).queryByText(en.cordis)).toBeNull()
  })

  it('collapses the expanded card when a filter removes it', async () => {
    render(<PluginInventorySettingsTab {...props(async () => SNAPSHOT)} />)
    const enabled = await screen.findByRole('button', {
      name: '@deepseek-ai/dsh-tool-bash, Mounted, Enabled',
    })
    fireEvent.click(enabled)
    expect(enabled.getAttribute('aria-expanded')).toBe('true')

    fireEvent.change(screen.getByRole('searchbox', { name: en.search }), {
      target: { value: 'persona' },
    })
    expect(screen.queryByRole('button', { name: '@deepseek-ai/dsh-tool-bash, Mounted, Enabled' })).toBeNull()
    const remaining = screen.getByRole('button', { name: /dsh-persona/ })
    expect(remaining.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0)
  })

  it('filters across planes by module name or Loader entry id', async () => {
    render(<PluginInventorySettingsTab {...props(async () => SNAPSHOT)} />)
    const search = await screen.findByRole('searchbox', { name: en.search })

    fireEvent.change(search, { target: { value: 'tool-todo' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('@deepseek-ai/dsh-tool-todo')).toBeTruthy()

    fireEvent.change(search, { target: { value: '06d3b694' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('@deepseek-ai/dsh-host-directory-picker-native')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'tool-bash' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)

    fireEvent.change(search, { target: { value: 'not-a-plugin' } })
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText(en.emptySearch)).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: en.search })).toBeTruthy()
  })

  it('shows a generic failure and retries into the empty state', async () => {
    const list = vi.fn<PluginInventorySettingsTabInjected['list']>()
      .mockRejectedValueOnce(new Error('private transport detail'))
      .mockResolvedValueOnce({ entries: [] })
    render(<PluginInventorySettingsTab {...props(list)} />)

    expect((await screen.findByRole('alert')).textContent).toBe(en.error)
    expect(screen.queryByText('private transport detail')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: en.retry }))
    await waitFor(() => { expect(list).toHaveBeenCalledTimes(2) })
    expect(await screen.findByText(en.empty)).toBeTruthy()
  })

  it('contains a synchronous Remote failure and ignores a result after unmount', async () => {
    const syncFailure = vi.fn(() => { throw new Error('namespace unavailable') }) as PluginInventorySettingsTabInjected['list']
    const failed = render(<PluginInventorySettingsTab {...props(syncFailure)} />)
    expect((await screen.findByRole('alert')).textContent).toBe(en.error)
    failed.unmount()

    const deferred = Promise.withResolvers<Snapshot>()
    const pending = render(<PluginInventorySettingsTab {...props(() => deferred.promise)} />)
    pending.unmount()
    await act(async () => { deferred.resolve(SNAPSHOT) })

    const deferredFailure = Promise.withResolvers<Snapshot>()
    const pendingFailure = render(<PluginInventorySettingsTab {...props(() => deferredFailure.promise)} />)
    pendingFailure.unmount()
    await act(async () => { deferredFailure.reject(new Error('late failure')) })
  })

  it('localizes the plane headings in Chinese', async () => {
    const zhT = ((key: PluginInventoryLocaleKey): string => zh[key]) as PluginInventorySettingsTabProps['t']
    render(<PluginInventorySettingsTab {...{ t: zhT, list: async () => SNAPSHOT } as unknown as PluginInventorySettingsTabProps} />)
    expect(await screen.findByRole('region', { name: zh.planeHost })).toBeTruthy()
    expect(screen.getByRole('region', { name: zh.planePreset })).toBeTruthy()
    expect(screen.getByRole('region', { name: zh.planeRuntime })).toBeTruthy()
  })
})
