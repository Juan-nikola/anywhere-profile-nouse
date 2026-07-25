# Anywhere 日常无感分流设计

日期：2026-07-25  
目标仓库：`Juan-nikola/anywhere-profile`  
状态：已获用户设计批准，待实施计划

## 1. 目标

建立一套供官方 Anywhere 客户端使用的公开规则项目，在不修改 Anywhere
源码的前提下，最大限度复刻现有 `shadowrocket-profile` 的日常行为：

- 自动识别常见业务并进行规则分流。
- 本地网络和中国大陆流量直连。
- 未命中域名继续根据真实目标 IP 判断：中国 IP 直连，非中国 IP
  使用 Anywhere 首页当前全局节点。
- 广告和安全威胁默认拒绝。
- AI、GitHub、流媒体、社交等业务各自形成独立规则组，用户可以在
  Anywhere 中为每组手动选择节点或代理链。
- 规则每日自动更新；更新失败时继续保留上一份有效规则。
- 节点凭据与公开规则完全分离。
- 提供完整中文 README、部署、维护、兼容性与故障排查说明。

“最大限度复刻”指：只接受 Anywhere 官方客户端模型本身无法表达的差异，
不得为了简化实现而主动删除客户端能够支持的功能。

## 2. 非目标与客户端限制

本项目不修改或重新分发 Anywhere App，不试图模拟客户端没有的能力：

- 不实现自动测速选路。
- 不实现节点故障转移。
- 不实现多层或嵌套策略组。
- 不实现按节点名称自动生成可嵌套地区策略组。
- 不实现普通路由不支持的 `USER-AGENT`、`IP-ASN`、`URL-REGEX`、
  `PROTOCOL`、`AND` 等条件。
- 不把代理链误当作故障转移；代理链始终是固定顺序的多跳路径。
- 不在公开仓库、日志、示例或报告中保存节点、凭据、私密订阅 URL
  或 Sub-Store 管理地址。

这些限制必须在 README 和兼容性文档中明确披露，不能把“可近似”描述成
“完全等价”。

## 3. 总体架构

系统分为彼此隔离的私密节点平面与公开规则平面。

### 3.1 私密节点平面

数据流：

```text
现有 Sub-Store 节点来源
  → 新建 anywhere-sources 组合
  → dist/substore-node-generator.js
  → 私密 anywhere-nodes
  → Anywhere 节点订阅
```

- `anywhere-sources` 使用与小火箭相同的来源，但作为独立组合存在。
- 现有 Shadowrocket 来源、组合、节点订阅和 Profile 均不修改。
- `anywhere-nodes` 建议每 6 小时更新。
- 节点生成器输出 Anywhere 原生可导入的 URI/Base64 订阅，避免只依赖
  Anywhere 较窄的 Clash YAML 导入子集。
- 没有有效节点时生成失败，不发布空订阅。

### 3.2 公开规则平面

数据流：

```text
29 份 Blackmatrix7 Shadowrocket 规则
  → 下载与健康检查
  → 规则解析和标准化
  → 按现有小火箭业务顺序处理冲突
  → 按业务合并与去重
  → Anywhere .arrs
  → GitHub Raw
  → Anywhere 规则订阅
```

GitHub Actions 每天运行，也允许手动触发。只有完整校验通过的规则才进入
目标分支。

### 3.3 客户端兜底

Anywhere 端启用中国 `Country Bypass`。最终语义为：

```text
自定义纠错
  → 安全和广告
  → 专用业务
  → 已知中国域名
  → 解析真实目标 IP
  → 中国 IP DIRECT
  → 其他流量使用首页当前全局节点
```

`Default` 在 Anywhere 中表示规则集不参与路由。专用业务组初始设为
`Default` 时，流量自然落到首页全局出口；用户为该组选择具体节点后，
该规则集才覆盖全局出口。

## 4. 规则分组

生成下列订阅。文件名使用稳定的 ASCII slug，显示名使用中文与 Emoji。

| 分组 | 上游来源 | 初始路由 |
|---|---|---|
| 本地与局域网 | 项目内置 | `DIRECT` |
| 安全威胁 | Hijacking、BlockHttpDNS | `REJECT` |
| 常见广告 | AdvertisingLite | `REJECT` |
| 严格跟踪 | Privacy | `DIRECT` |
| 哔哩哔哩 | BiliBili | `DIRECT` |
| 抖音 | DouYin | `DIRECT` |
| 小红书 | XiaoHongShu | `DIRECT` |
| 微博 | Weibo | `DIRECT` |
| AI 专用 | OpenAI、Claude、Gemini、Copilot，加项目自定义 AI 后缀 | `Default` |
| GitHub | GitHub | `Default` |
| YouTube | YouTube | `Default` |
| Netflix | Netflix | `Default` |
| Disney+ | Disney | `Default` |
| Spotify | Spotify | `Default` |
| 国际媒体 | GlobalMedia | `Default` |
| Telegram | Telegram | `Default` |
| 海外社交 | Facebook、Instagram、Twitter | `Default` |
| TikTok | TikTok | `Default` |
| Apple | Apple | `DIRECT` |
| Microsoft | Microsoft | `DIRECT` |
| 游戏平台 | Game | `Default` |
| 下载/P2P | Download、PrivateTracker | `DIRECT` |
| 中国大陆 | ChinaMax | `DIRECT` |
| 自定义直连 | 项目自定义规则 | `DIRECT` |
| 自定义代理 | 项目自定义规则 | `Default` |
| 自定义拦截 | 项目自定义规则 | `REJECT` |

同一业务的多个上游必须合并成一个 `.arrs`，以保证用户只需切换一次出口。

## 5. Anywhere 格式映射

Anywhere 路由规则只输出四种类型：

| Anywhere ID | 类型 | 输入映射 |
|---|---|---|
| `0` | IPv4 CIDR | `IP-CIDR` |
| `1` | IPv6 CIDR | `IP-CIDR6` |
| `2` | 域名后缀 | `DOMAIN-SUFFIX`，以及近似转换后的 `DOMAIN` |
| `3` | 域名关键词 | `DOMAIN-KEYWORD` |

每个 `.arrs` 包含：

- `name = <显示名>`
- `routing = 0|1|2`
- 上游来源和生成器版本注释
- 支持的 Anywhere 规则行

生成物不得嵌入当前时间等非确定性字段；同一份输入和同一版本生成器必须
得到逐字节相同的输出，避免每日任务制造无意义提交。

`DOMAIN` 转换为后缀匹配会扩大到子域名。兼容性报告必须统计这种近似转换，
并在文档中说明风险。

不支持的规则不会静默消失：生成器将按来源和类型统计，并写入公开兼容性
报告。未知的新规则类型默认导致 CI 失败，必须显式审阅后决定“支持、
记录后舍弃或阻止发布”。

## 6. 冲突与优先级

Shadowrocket 使用规则顺序；Anywhere 的用户规则共享同一来源层级，并使用
域名具体度、关键词长度和 CIDR 最长前缀决定结果。生成器必须预处理规则，
使输出尽量保持现有小火箭顺序。

处理原则：

1. 自定义纠错优先于公共规则。
2. 安全和广告优先于一般业务，但明确的关键国内兼容规则可以在源设计中
   保持更高优先级。
3. 专用服务优先于广泛集合，例如 GitHub 优先于 Microsoft，YouTube
   优先于国际媒体。
4. 中国大陆规则最后作为已知中国域名/IP 托底。
5. 完全相同的模式只归属最早的目标组。
6. 如果较早的域名后缀覆盖较晚的更具体后缀，移除会被 Anywhere
   “更具体优先”错误抢占的较晚规则。
7. 如果较早的关键词覆盖较晚的后缀，移除会改变原顺序结果的较晚规则。
8. IPv4/IPv6 CIDR 使用相同原则：较早宽网段覆盖较晚窄网段时，移除较晚
   窄网段；较早窄网段、较晚宽网段则可以共存。

生成器输出冲突报告，至少包含：

- 完全重复规则数。
- 跨业务重复规则数。
- 因顺序语义而删除的覆盖规则数。
- 因 Anywhere 不支持而舍弃的规则数。
- `DOMAIN` 近似转换数。

## 7. 节点兼容与 URI 输出

节点生成器只保留能被当前 Anywhere 源码完整导入的节点：

- VLESS，包括能无损映射的 TLS、Reality 和传输参数。
- Hysteria2。
- Trojan。
- AnyTLS。
- Shadowsocks。
- SOCKS5。

如果 Sub-Store 来源包含 Anywhere 新增且项目可准确表达的协议，可以在新增
测试后扩展。VMess、SSR、Snell、TUIC、传统 HTTP 代理等当前不在支持集合。

节点处理步骤：

1. 校验服务器、端口和协议必填字段。
2. 根据网络身份去重。
3. 延续现有项目的来源标签、国旗和稳定命名逻辑。
4. 对 URI 用户信息、查询参数、IPv6 地址和显示名进行正确编码。
5. 生成逐行 URI，再按 Anywhere 订阅读取能力输出 Base64 文本。
6. 只输出脱敏计数：总数、接受数、按协议排除数和警告数。

任何诊断都不得包含服务器、端口、UUID、密码、Reality 公钥、完整 URI
或私密来源名称。

## 8. 仓库结构

```text
anywhere-profile/
├── src/
│   ├── rule-catalog.js
│   ├── parse-rules.js
│   ├── resolve-conflicts.js
│   ├── render-arrs.js
│   ├── node-normalizer.js
│   └── node-uri-renderer.js
├── rules/
├── reports/
│   └── compatibility.json
├── dist/
│   └── substore-node-generator.js
├── scripts/
│   ├── update-rules.mjs
│   ├── check-rules.mjs
│   └── build.mjs
├── tests/
├── docs/
│   ├── deployment.md
│   ├── maintenance.md
│   ├── troubleshooting.md
│   └── compatibility.md
├── docs/superpowers/
│   ├── specs/
│   └── plans/
├── .github/workflows/
│   └── update-rules.yml
├── README.md
└── package.json
```

源文件负责逻辑，`dist/` 和 `rules/` 是可复现生成物，不手工编辑。

## 9. 自动更新与失败保护

GitHub Actions：

- 每天定时执行。
- 支持 `workflow_dispatch` 手动执行。
- 使用最小写权限。
- 不配置或读取任何节点秘密。
- 下载超时、非 2xx、空文件、规则数量低于安全阈值、未知类型、格式验证
  失败时终止。
- 更新前运行全部单元测试、规则健康检查、生成物一致性检查和秘密扫描。
- 只有内容变化时创建自动提交；无变化时正常结束且不制造空提交。
- 失败时不修改 `rules/`，Anywhere 继续读取上一份有效内容。

规则数量阈值按每个来源维护，不能只检查总数，以防某一业务列表被清空而
总量仍看似正常。

## 10. 测试与验收

### 10.1 规则测试

- 29 份来源 ID、URL、目标业务和最小条目数固定。
- 四种支持类型映射正确。
- 不支持类型和未知类型行为正确。
- 同业务合并、跨业务去重和覆盖消解正确。
- GitHub 优先于 Microsoft 等已知冲突有回归测试。
- 本地、中国、广告、安全、AI、流媒体和最终兜底语义有测试。
- 每个生成文件拥有正确名称和初始路由。
- `.arrs` 重新解析后与内存模型一致。

### 10.2 节点测试

- 使用完全脱敏的 SS、VLESS Reality、VLESS WebSocket/gRPC/XHTTP、
  Hysteria2、Trojan、AnyTLS 和 SOCKS5 夹具。
- 覆盖 IPv4、域名、IPv6、空格、中文、Emoji 和 URI 保留字符。
- 缺失凭据、非法端口、未知协议和空输出会失败或安全排除。
- 输出中不泄漏内部元数据。

### 10.3 发布测试

- 重新生成后 Git 工作区无差异。
- `rules/` 不含不支持的类型。
- Raw URL 清单与实际文件一致。
- README 中所有相对链接有效。
- 秘密扫描阻止常见 Token、完整节点 URI、真实订阅 URL 和凭据进入 Git。

### 10.4 用户验收

先在一台设备并行灰度，不删除现有 Shadowrocket：

- `anywhere-nodes` 可更新且节点数量合理。
- 本地路由器、NAS 和局域网服务直连可用。
- 代表性中国 App/网站直连。
- 未收录但解析为中国 IP 的目标由 Country Bypass 直连。
- 海外未知网站使用首页全局节点。
- AI、GitHub、YouTube、Netflix 等可分别选择节点。
- 广告和安全规则可按预期拒绝，严格跟踪可手动切换为拒绝。
- 规则更新失败时旧规则继续可用。

## 11. 文档要求

README 使用中文，首先说明“得到什么”和“不能实现什么”，然后提供最短部署
路径。详细文档至少包括：

- 从零创建 `anywhere-sources` 和 `anywhere-nodes`。
- Sub-Store 中脚本类型、参数、输出名和更新间隔。
- Anywhere 中导入节点订阅和所有 `.arrs` 的顺序。
- 每个规则组初始值和推荐手动选择。
- 启用中国 Country Bypass。
- 日常增加机场、换节点和更新规则。
- 灰度、回滚和常见故障定位。
- 完整 GitHub Raw 订阅链接。
- 支持、近似支持和不支持的规则/节点矩阵。
- 安全边界：永不公开私密订阅、节点二维码、完整 URI 或带 Token 截图。

所有源码模块应有职责注释；复杂冲突算法应说明其保持 Shadowrocket 顺序
语义的原因，而不是逐行解释语法。

## 12. 发布与回滚

- GitHub 仓库为公开仓库 `Juan-nikola/anywhere-profile`。
- 首次发布以版本标签保存。
- 自动规则更新使用清晰的机器人提交信息。
- 回滚规则时恢复上一份已验证生成物；不重写 Git 历史。
- Sub-Store 中保留现有小火箭资源，并在 Anywhere 灰度期间保留上一份
  可用 `anywhere-nodes`。
- 删除任何私密资源前必须完成独立观察期；公开仓库本身不具备删除或管理
  用户私密 Sub-Store 数据的权限。

## 13. 成功标准

项目完成必须同时满足：

1. 新公开仓库可从零复现全部生成物。
2. 规则每日自动更新且具有失败保护。
3. Anywhere 能为每个业务规则组独立手动选择节点。
4. 中国域名和中国 IP 直连，其他未知流量使用首页全局节点。
5. 现有小火箭中 Anywhere 能表达的分流功能均有对应实现或有明确理由说明。
6. 不支持和近似转换项有可审计统计。
7. 节点凭据从未进入公开仓库。
8. 测试、构建、生成物检查、规则健康检查和秘密扫描全部通过。
9. README、部署、维护、兼容性和故障排查文档完整。
