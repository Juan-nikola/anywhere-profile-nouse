# 兼容性说明

本项目尽量保持 Shadowrocket 规则语义，但不会把“不支持”包装成“完全等价”。

## Anywhere 能力边界

| 能力 | 本项目表现 |
|---|---|
| 业务规则自动识别 | 支持 |
| 每个业务手工选择节点 | 支持 |
| 中国域名/IP 自动直连 | 支持，规则集 + `Country Bypass` |
| 未匹配域名按解析 IP 判断 | 部分支持，依赖 `Country Bypass` 且须关闭 `Prevent DNS Leak` |
| 自动测速选择最快节点 | 不支持 |
| 节点失败自动切换 | 不支持 |
| 多层/嵌套策略组 | 不支持 |
| 固定多跳代理链 | Anywhere 支持，但不是故障转移 |
| HTTPS MITM / JS Rewrite | 本方案不使用 |

## 规则映射

| 上游类型 | Anywhere 输出 | 说明 |
|---|---|---|
| `IP-CIDR` | ID `0` | IPv4；地址实际为 IPv6 时按 IPv6 输出 |
| `IP-CIDR6` | ID `1` | IPv6；地址实际为 IPv4 时按 IPv4 输出 |
| `DOMAIN-SUFFIX` | ID `2` | 等价后缀匹配 |
| `DOMAIN-KEYWORD` | ID `3` | 等价关键词匹配 |
| `DOMAIN` | ID `2` | 近似为后缀，会额外包含其子域名 |
| `USER-AGENT` | 不输出 | Anywhere 普通路由无法表达 |
| `IP-ASN` | 不输出 | Anywhere 普通路由无法表达 |
| `URL-REGEX` | 不输出 | Anywhere 普通路由无法表达 |

未知新类型不是静默忽略，而是让生成失败，等待人工审阅。
生成器还会强制执行当前 Anywhere 源码的单个自定义规则集 100,000 条上限。

最近一次生成报告：18,357 条输入、18,168 条支持、247 条 `DOMAIN` 近似转换、189 条不支持。
动态明细以 [`reports/compatibility.json`](../reports/compatibility.json) 为准。

### 顺序差异

Shadowrocket 主要使用配置顺序；Anywhere 的用户规则在相同来源层级下会受域名具体度、
关键词长度和 CIDR 最长前缀影响。生成器按现有小火箭的业务顺序处理冲突：

- 自定义纠错、广告与安全优先；
- 专用业务优先于宽泛集合；
- 中国大陆规则作为已知国内地址托底；
- 删除会被 Anywhere “更具体优先”错误反转的后置规则。

这能保留绝大多数语义，但客户端模型不同，所以不能声称逐条完全一致。

未知域名的二次判断只使用 Anywhere 后台缓存的第一个 IPv4：首次连接可能仍走默认出口，
纯 IPv6 未知域名不会触发这层匹配。已知中国域名以及直接访问的 IPv4/IPv6 仍由规则处理。

## 节点协议

| 协议 | 状态 | 备注 |
|---|---|---|
| VLESS | 支持 | TCP、WS、gRPC、XHTTP、HTTPUpgrade；含可映射 TLS/Reality |
| Hysteria2 / HY2 | 支持 | 可映射认证、SNI、混淆等参数 |
| Trojan | 支持 | Anywhere 原生 TCP + TLS；WS/gRPC 等变体会排除 |
| AnyTLS | 支持 | 原生 URI |
| Shadowsocks | 支持 | 不支持 SIP003 插件节点 |
| SOCKS5 | 支持 | 用户名/密码可选 |
| VMess | 排除 | 当前项目不输出 |
| SSR | 排除 | 当前项目不输出 |
| Snell | 排除 | 当前项目不输出 |
| TUIC | 排除 | 当前项目不输出 |
| HTTP/HTTPS 代理 | 排除 | 当前项目不输出 |

节点地址、端口、用户信息、查询参数、IPv6 与显示名都会按 URI 规则编码。无法完整表达的
节点会按脱敏原因计数后排除，不会生成一个“看起来能导入但实际丢参数”的节点。

## 安全行为差异

- `Allow Insecure` 是 Anywhere 的全局/客户端侧选择；生成器只能给出脱敏警告，不能安全地
  替你开启。
- 本方案不依赖证书安装、HTTPS 解密、Rewrite 或脚本注入。
- 规则订阅可以公开；节点订阅绝不能公开。
