# Anywhere Profile

为官方 [Anywhere](https://github.com/ProxymanApp/Anywhere) iOS 客户端准备的日常分流规则与
Sub-Store 节点转换器。目标是在 **不修改 App、不公开节点凭据** 的前提下，最大限度复刻
小火箭的使用方式：

- 本地网络、中国域名和中国 IP 直连；
- 广告、安全威胁默认拒绝；
- AI、GitHub、流媒体、社交等业务各自一个分组，可以在 Anywhere 中点选具体节点；
- 未匹配域名先解析真实目标 IP：中国 IP 直连，非中国 IP 使用首页当前全局节点；
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
5. 未匹配域名由 `Country Bypass` 根据解析后的 IP 判断：中国直连，其余使用首页节点。

因此你平时只需要在首页切换一次全局节点。需要让 AI、YouTube 或 Netflix 使用不同地区时，
打开对应规则集并点选目标节点即可。节点失效时仍需手动换节点。

## 部署顺序

### 1. 在 Sub-Store 建立私密节点订阅

1. 新建一个独立组合，命名为 `anywhere-sources`，加入你想给 Anywhere 使用的现有节点来源。
   这不会修改小火箭使用的组合与订阅。
2. 在 Sub-Store 新建 `File Script`，命名为 `anywhere-node-generator`，内容使用
   [`dist/substore-node-generator.js`](dist/substore-node-generator.js)。
3. 脚本参数填写：

   ```text
   output=nodes&type=collection&name=anywhere-sources
   ```

4. 新建文件订阅 `anywhere-nodes`，让它调用上述脚本，建议设置为每 6 小时更新。
5. 把 `anywhere-nodes` 的私密订阅 URL 添加到 Anywhere 的节点订阅中。

节点订阅 URL 含有你的节点凭据，**不要公开**、不要提交到本仓库、不要发到 Issue 或日志。
完整操作见[部署指南](docs/deployment.md)。

### 2. 导入公开规则订阅

在 Anywhere 中逐个添加下面的 Rule Set URL。首次导入会使用项目给定的初始路由；
后续规则刷新不会覆盖你在 App 内已经选择的节点。

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

在 Anywhere 设置中启用中国的 `Country Bypass`。它负责规则未匹配时的最后判断：

```text
目标域名 → 解析目标 IP → 中国 IP 直连 → 非中国 IP 使用首页当前节点
```

如果关闭它，已知的中国规则仍会直连，但新域名、冷门域名和规则暂未覆盖的国内地址可能走
全局节点。不要同时启用方向相反或重复的地区绕过设置。

## 节点兼容性

节点生成器目前只输出 Anywhere 原生可完整导入的协议：

- VLESS（TCP、WebSocket、gRPC、XHTTP、HTTPUpgrade，含 TLS/Reality 可映射参数）
- Hysteria2
- Trojan
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
[Anywhere](https://github.com/ProxymanApp/Anywhere) 为准。第三方来源和许可见
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

本项目代码使用 [MIT License](LICENSE)。
