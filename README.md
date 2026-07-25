# Anywhere Profile

为官方 [Anywhere](https://github.com/NodePassProject/Anywhere) iOS 客户端准备的日常分流规则与
Sub-Store 节点转换器。目标是在 **不修改 App、不公开节点凭据** 的前提下，最大限度复刻
小火箭的使用方式：

- 本地网络、中国域名和中国 IP 直连；
- 广告、安全威胁默认拒绝；
- AI、GitHub、流媒体、社交等业务各自一个分组，可以在 Anywhere 中点选具体节点；
- 未匹配域名可再按解析后的 IPv4 判断：中国 IP 直连，非中国 IP 使用首页当前全局节点；
- 规则每天更新，更新失败不会覆盖上一份有效规则；
- 节点由你自己的 Sub-Store 私密生成，节点每 6 小时更新。

> [!IMPORTANT]
> Anywhere 当前不能自动测速、不能故障转移、不能多层嵌套策略组。这里实现的是规则自动
> 识别与手动一键切换出口；App 本身不支持的能力不能用配置补出来。Anywhere 的“代理链”
> 是固定顺序多跳，不是自动容灾。

## 最终效果

Anywhere 首页选择一个日常全局节点后：

1. 广告与安全规则优先拒绝；
2. 已单独指定节点的业务组走该节点；
3. 没有单独指定的业务组保持 `Default`，继续使用首页全局节点；
4. 中国域名、中国 IP 与局域网直连；
5. 未匹配域名在允许本地 DNS 判断时，由 `Country Bypass` 根据解析后的 IPv4 再判断：
   中国直连，其余使用首页节点。

因此你平时只需要在首页切换一次全局节点。需要让 AI、YouTube 或 Netflix 使用不同地区时，
打开对应规则集并点选目标节点即可。节点失效时仍需手动换节点。

## 部署顺序

### 1. 在 Sub-Store 建立私密节点订阅

先分清下面三个名称，它们不是三个节点分组：

| 名称 | Sub-Store 中的类型 | 用途 |
|---|---|---|
| `anywhere-sources` | 组合/集合 | 保存供 Anywhere 使用的原始节点来源 |
| `anywhere-node-generator` | `anywhere-nodes` 内的脚本操作 | 读取组合、过滤协议并转换格式 |
| `anywhere-nodes` | 文件 | 最终给 Anywhere 导入的私密节点订阅 |

`anywhere-node-generator` 不是订阅分组。按当前 Sub-Store Web UI 操作时，不必另外建立一个
同名组合或文件；它是 `anywhere-nodes` 文件内部的一项“脚本操作”。如果旧版 Sub-Store
提供独立的 `File Script` 脚本库，也可以把脚本先存入脚本库再引用，但最终输出仍然必须是
`anywhere-nodes` 文件。

#### 1.1 建立节点来源组合

1. 进入 Sub-Store 的“订阅”页面。
2. 新建组合/集合，名称准确填写为 `anywhere-sources`。
3. 选择要给 Anywhere 使用的现有订阅。可以使用和 Shadowrocket 相同的上游来源，但不要
   修改或删除 Shadowrocket 原有组合。
4. 保存后打开组合预览，确认组合中确实存在节点。组合为空时，生成器会拒绝输出空订阅。

以后增加或移除 Anywhere 节点，只需要编辑 `anywhere-sources`；不需要修改脚本、文件或
公开规则。

#### 1.2 新建最终文件

1. 进入 Sub-Store 的“文件”页面，点击顶部 `+`，选择“文件”。
2. 填写下列字段：

   | 字段 | 值 |
   |---|---|
   | 名称 | `anywhere-nodes` |
   | 显示名称 | `Anywhere 节点` |
   | 类型 | `文件` |
   | 来源 | `本地` |
   | 标签 | 建议填 `anywhere` |
   | 备注 | 建议注明由 `anywhere-sources` 生成 |

3. 本地文件正文可以保持默认注释或留空。真实节点由后面的脚本操作生成，不要把节点 URI
   手工粘贴到正文。
4. “启用下载”只影响下载时的文件名，不影响订阅 API；可按需要开启。

#### 1.3 添加转换脚本

在 `anywhere-nodes` 编辑页向下找到“文件操作”：

1. 点击“脚本操作”。
2. 打开“文件操作”标题旁的总开关。只启用单个脚本、但没有打开这个总开关时，脚本不会
   执行。
3. 点击脚本操作标题右侧的编辑图标，把操作名称改为
   `anywhere-node-generator`。
4. 保持该操作的“启用”和“预览”开启。
5. 类型选择“远程链接”，填写：

   ```text
   https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/dist/substore-node-generator.js
   ```

6. 展开参数，分别添加三行。不要把三项合并到同一个 key 或 value 输入框：

   | key | value |
   |---|---|
   | `output` | `nodes` |
   | `type` | `collection` |
   | `name` | `anywhere-sources` |

7. “关闭缓存”和“不验证服务器证书”保持默认关闭。正常的 GitHub Raw HTTPS 不需要跳过
   证书校验。

等价的参数文本是：

```text
output=nodes&type=collection&name=anywhere-sources
```

#### 1.4 预览并保存

1. 保存前点击底部“即时预览”。
2. 成功结果应是一整段很长的单行 Base64 文本，通常以字母或数字开头。长度取决于节点数。
3. 结果不能是 `{}`、空白、错误页面，也不能出现
   `produceArtifact must return a non-empty node array`。
4. 预览成功后关闭预览窗口，再点击“保存”。
5. 返回“文件”列表，确认出现显示名称“Anywhere 节点”、标签 `anywhere` 和刚才填写的
   备注。
6. 使用文件卡片上的复制按钮取得 `anywhere-nodes` 私密文件 URL。它通常指向
   `/api/file/anywhere-nodes`，但必须使用 Sub-Store 实际生成的完整私密地址，不要自己
   拼接访问令牌。
7. 在未登录的普通浏览器标签页打开一次该 URL。成功时仍应得到非空 Base64，而不是
   Sub-Store 管理页面、JSON 空对象或 404。

#### 1.5 导入 Anywhere

1. 在 Anywhere 的节点/代理订阅页面新增订阅。
2. 名称建议填 `Anywhere 节点`，URL 填上一步复制的 `anywhere-nodes` 私密 URL。
3. 保存并刷新订阅，确认节点列表出现 VLESS、Hysteria2、Trojan、AnyTLS、Shadowsocks
   或 SOCKS5 等受支持节点。
4. 回到首页选择一个节点，先测试国外网站；再继续导入下文的公开分流规则。
5. 节点来源发生变化后，先刷新 Sub-Store 的 `anywhere-sources`，再刷新 Anywhere 中的
   节点订阅。建议每 6 小时刷新一次；客户端没有自动刷新选项时，日常手动刷新即可。

最终检查清单：

- `anywhere-sources` 中至少有一个有效节点；
- 即时预览是非空 Base64；
- “文件操作”总开关和脚本的“启用”开关都已开启；
- 文件列表存在 `anywhere-nodes`；
- 私密文件 URL 返回非空 Base64；
- Anywhere 能刷新出节点并连接；
- 原 Shadowrocket 组合、文件和 Profile 均未修改。

常见问题：

- 预览仍是默认注释：通常是“文件操作”总开关没有开启。
- 提示组合为空：检查名称是否逐字为 `anywhere-sources`，以及组合是否选中了真实订阅。
- 提示脚本下载失败：确认当前网络能访问 GitHub Raw，并检查远程脚本 URL 是否完整。
- 只有部分节点出现：生成器会主动排除 Anywhere 无法完整表达的协议和传输，详见
  [节点兼容性](#节点兼容性)。
- Anywhere 导入后没有变化：确认导入的是 `anywhere-nodes` 私密文件 URL，而不是 GitHub
  脚本 URL、Sub-Store 管理地址或 `anywhere-sources` 组合地址。

`anywhere-nodes` URL 包含访问标识，并可返回完整节点信息，**不要公开**、不要提交到本
仓库、不要发到 Issue、截图或日志。管理地址或订阅 URL 泄露后，应在 Sub-Store 轮换访问
标识并更新 Anywhere 中保存的订阅。更完整的部署与回滚说明见
[部署指南](docs/deployment.md)。

### 2. 导入公开规则订阅

在 Anywhere 中逐个添加下面的 Rule Set URL。首次导入会使用项目给定的初始路由；
后续规则刷新不会覆盖你在 App 内已经选择的节点。

GitHub 会移除 `anywhere://add-rule-set` 自定义链接，所以批量导入请打开
[`import-all.txt`](import-all.txt)，复制其中完整的一行到 Safari 地址栏并前往。Anywhere
会展示 23 项导入清单，默认全选，确认后才写入；若系统没有唤起 App，则使用下表逐个导入。

| 分组 | 初始行为 | Raw URL |
|---|---|---|
| 本地与局域网 | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/local.arrs |
| 安全威胁 | REJECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/security.arrs |
| 常见广告 | REJECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/ads.arrs |
| 严格跟踪 | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/privacy.arrs |
| 哔哩哔哩 | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/bilibili.arrs |
| 抖音 | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/douyin.arrs |
| 小红书 | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/xiaohongshu.arrs |
| 微博 | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/weibo.arrs |
| AI 专用 | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/ai.arrs |
| GitHub | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/github.arrs |
| YouTube | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/youtube.arrs |
| Netflix | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/netflix.arrs |
| Disney+ | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/disney.arrs |
| Spotify | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/spotify.arrs |
| 国际媒体 | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/global-media.arrs |
| Telegram | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/telegram.arrs |
| 海外社交 | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/social.arrs |
| TikTok | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/tiktok.arrs |
| Apple | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/apple.arrs |
| Microsoft | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/microsoft.arrs |
| 游戏平台 | Default | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/game.arrs |
| 下载/P2P | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/download.arrs |
| 中国大陆 | DIRECT | https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/china.arrs |

`Default` 的意思是这个规则集当前不主动接管路由，流量会继续落到更低层级，最终使用首页
全局节点；它不是一个节点。想让某一分组独立选路，就把该规则集的 Routing 从 `Default`
改为订阅中的具体节点或你手工建立的代理链。`DIRECT` 和 `REJECT` 也可以按需改成具体节点。

### 3. 打开中国兜底判断

在 Anywhere 设置中启用中国的 `Country Bypass`，并关闭 `Prevent DNS Leak`。后一个设置
开启时，Anywhere 会禁止“本地解析后再与 IP-CIDR 匹配”，未知域名就无法做这层国内判断。
可用时的最后顺序为：

```text
目标域名 → 解析目标 IP → 中国 IP 直连 → 非中国 IP 使用首页当前节点
```

当前 Anywhere 源码只在后台解析并缓存第一个 IPv4，因此一个此前从未见过的域名第一次连接
可能先使用首页节点，后续连接才按缓存 IP 命中国内直连；纯 IPv6 未知域名也没有这层二次
判断。这是客户端限制，已知中国域名和 IP 仍会直接命中本项目规则。

如果关闭 `Country Bypass`，已知的中国规则仍会直连，但新域名、冷门域名和规则暂未覆盖的
国内地址可能走全局节点。不要同时启用方向相反或重复的地区绕过设置。

## 节点兼容性

节点生成器目前只输出 Anywhere 原生可完整导入的协议：

- VLESS（TCP、WebSocket、gRPC、XHTTP、HTTPUpgrade，含 TLS/Reality 可映射参数）
- Hysteria2
- Trojan（Anywhere 原生 TCP + TLS）
- AnyTLS
- Shadowsocks（不含插件）
- SOCKS5

VMess、SSR、Snell、TUIC、传统 HTTP 代理及无法无损表达的传输会被排除。生成失败时不会
发布空订阅。若来源节点要求跳过证书验证，还需要在 Anywhere 明确开启对应的
`Allow Insecure`；请只对可信节点这样做。

## 规则兼容性

公开规则来自 29 份 Blackmatrix7 Shadowrocket 规则。目前生成器处理
`DOMAIN-SUFFIX`、`DOMAIN-KEYWORD`、`IP-CIDR` 和 `IP-CIDR6`；精确 `DOMAIN`
会近似为后缀匹配。`USER-AGENT`、`IP-ASN`、`URL-REGEX` 等 Anywhere 普通路由无法表达的
条件会统计后舍弃，未知新类型直接让更新失败。

最近一次提交的兼容报告记录了 18,357 条输入，其中 18,168 条可转换、247 条为
`DOMAIN` 近似转换、189 条不受支持。详见
[`reports/compatibility.json`](reports/compatibility.json) 和
[兼容性说明](docs/compatibility.md)。

规则生成器还会预处理 Shadowrocket 的“从上到下先匹配”与 Anywhere 的“更具体规则优先”
之间的冲突，尽量保持原有业务优先级。

## 自动更新与隐私边界

- `.github/workflows/update-rules.yml` 每天下载全部上游、校验、生成并测试；任一上游失败、
  数量异常或格式未知时不提交更新。
- `.github/workflows/verify.yml` 在每次提交和 Pull Request 上运行全量验证。
- GitHub 只保存公开规则、转换器源码和统计，不保存任何真实节点。
- `anywhere-sources`、`anywhere-nodes`、Sub-Store 管理地址、订阅令牌、UUID、密码、公钥和
  完整节点 URI 都属于私密信息，**不要公开**。
- HTTPS 解密、MITM、JS Rewrite 和 Loon/Surge 插件不是本项目必需项，保持关闭即可。

## 开发与维护

需要 Node.js 22 或更高版本：

```bash
npm ci
npm test
npm run build
npm run verify
```

- 更新公开规则：`npm run update:rules`
- 重新构建 Sub-Store 脚本：`npm run build`
- 修改规则分组与上游：编辑 `src/catalog.js`，不要直接编辑 `rules/*.arrs`
- 查看维护步骤：[维护指南](docs/maintenance.md)
- 出现问题：[故障排查](docs/troubleshooting.md)

## 致谢与许可

规则数据来自 Blackmatrix7 的
[ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)，客户端能力以
[Anywhere](https://github.com/NodePassProject/Anywhere) 为准。第三方来源和许可见
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

本项目代码使用 [MIT License](LICENSE)。
