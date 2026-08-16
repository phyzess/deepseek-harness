# Agent Note: plugin-inventory —— 设置插件列表按挂载平面分组

Status: implemented

[English](2026-08-16-plugin-inventory-mount-planes.md) | 中文

## Problem

发货的 Web 组合把每个 agent 平面插件挂载了两次——一次是有意停用的宿主行（web-app bundle 保留 base 行并禁用，因为"禁用而不是删除是有意为之"），一次在常驻 standard agent 预设内。而设置里的插件列表标签页把这两批条目渲染成无法区分的卡片：标题是被大幅裁剪的模块名（`moduleShortName` 去掉 scope 与 `dsh-`/`cordis-` 前缀），唯一能区分身份的 Loader 条目 id 又藏在逐卡展开的背后。于是出厂 Web profile 的列表读起来就是一面同名重复墙（tool-subagent 出现六次、hmr 三次、每个 agent 工具两次），无从分辨哪一行是真正生效的预设挂载、哪一行是停用的宿主行。

## Decision

标签页继续作为同一个 `pluginInventory.list` Remote 的只读投影，只改呈现：

- 每张卡片以**完整模块名**为标题，Loader 条目 id 直接显示在其下方（保留展开交互）；
- 条目按挂载平面分组，平面由 id 形状推导：`include:agent-presets:*` → Agent 预设，`include:`（以及裸 `include` 行）→ 宿主，其余 → 运行时创建；
- 同一模块被挂载多次时，每张卡片都带 `×N` 多重挂载角标。

平面分类只服务于展示分组；id 仍是身份（继续作为 React key 与搜索目标）。注册契约（`settings.plugins.tab`、id `all`、order 10）与注入的 `list` 接口不变，因此分区拥有方、browser-plugin 组合测试与 settings e2e 挂钩全部继续工作；Plugins 分区的 e2e golden 已随新卡片表面刷新。

## 与既有决策的关系

建立在只读清单表面（标签页的原始设计：懒 `list()` 读取、仅本地状态、`ctx.slots.inject` 注册）与 [presets 之后的宿主平面归属](../architecture/2026-08-10-host-plane-ownership-after-presets.md) 笔记之上——后者正是产生这两批挂载人群、而本视图现在将其分开的设计。两者均未被取代。

## Alternatives considered

- **由 Host 提供平面字段。** 在 `PluginInventoryEntry` 上增加 plane/owner 字段比按 id 形状分类更真实，但会为纯呈现需求改动 Remote 线上契约及其生成的客户端 schema；推迟到有消费方需要权威平面时再做。
- **隐藏其中一批（停用的宿主行或预设行）。** 否决：清单是唯一同时可见两个平面的表面，隐藏行会隐藏真实的运行时状态。
- **独立的外部替换插件。** 曾构建过一个原型替换插件并通过 profile 补丁层接入；对官方包予以否决，因为这个表面属于发货 UI，仓库内修改才是受维护的路径。

## Consequences

- 出厂 Web profile 的插件列表现在以宿主/预设/运行时分区呈现，条目 id 直接可见；同名卡片是预期且被标注的，而不再令人困惑。
- 平面由条目 id 形状推导；未来若出现以不同 id 形状铸造条目的组合，需要同步更新分类器（已在包 README 中注明）。
- e2e golden `plugins.expected.md` 与组件/browser-plugin 测试已随新表面更新；slot 注册契约不变。
