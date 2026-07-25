# 故障排查

先判断问题属于“规则”“节点”还是“兜底判断”。排查时只提供脱敏计数和错误类别，不要
发送完整节点 URI、服务器、UUID、密码、公钥、Sub-Store 管理地址或私密订阅 URL。

## 国内网站仍走代理

1. 确认 `🇨🇳 中国大陆` 与 `🏠 本地与局域网` 规则集已启用且 Routing 为 `DIRECT`。
2. 确认中国 `Country Bypass` 已启用，方向是“中国地址绕过代理”。
3. 如果需要未知域名按 IPv4 二次判断，确认 `Prevent DNS Leak` 已关闭；首次访问后重试，
   给后台解析缓存一次机会。
4. 刷新中国大陆规则订阅。
5. 检查是否有更具体的业务规则被手工指定为节点。
6. 若只影响一个新域名，可记录域名本身（不要记录 URL 中的令牌）并在自定义直连规则中
   审阅加入。

## 国外网站没有走节点

1. 确认首页已经选中一个可用节点。
2. 检查 Country Bypass 是否被设成了相反方向。
3. 检查对应业务组是否被误设为 `DIRECT` 或 `REJECT`。
4. 将业务组改回 `Default` 测试；`Default` 表示让流量继续使用首页全局出口。

## 某个业务不能独立切换

打开对应 Rule Set 的 Routing，选择节点订阅中的具体节点。不要把它留在 `Default`。
Anywhere 没有嵌套策略组，因此不能像小火箭那样先选“地区组”再自动选地区内节点；这里
是直接点选最终节点。恢复跟随首页时再改回 `Default`。

## 节点订阅为空或生成失败

节点生成器拒绝发布空订阅。检查 Sub-Store：

- 组合名称是否准确为 `anywhere-sources`；
- File Script 参数是否为
  `output=nodes&type=collection&name=anywhere-sources`；
- 组合是否真的有节点；
- 节点协议是否在支持列表中；
- 必填的服务器、端口、密码/UUID 是否完整；
- Shadowsocks 节点是否带不支持的插件。

日志中只看 `total`、`accepted`、`excluded` 与 `warnings` 的数量。不要为了求助而复制输入
节点或私密订阅。

## 节点能导入但 TLS 连接失败

如果脱敏警告包含 `global-allow-insecure-required`，说明来源要求跳过证书验证。只有确认
节点及提供方可信后，才在 Anywhere 中开启对应的 `Allow Insecure`。优先修复服务端证书，
不要把全局跳过验证当成默认设置。

## 规则订阅无法刷新

1. 用浏览器打开 README 中对应 GitHub Raw URL。
2. 检查 GitHub Actions 的 `Verify` 和 `Update rules` 是否成功。
3. 若 GitHub Raw 在当前网络不可达，先临时切换一个可用全局节点再刷新。
4. 不要把私密节点 URL误当作公开 `.arrs` 规则 URL。

规则更新失败不会删除仓库里上一版有效文件；客户端可继续使用缓存。

## 更新后路由选择改变

`.arrs` 中的 `routing` 是首次导入默认值。正常刷新应保留 App 本地选择；如果删除后重新
导入，则会重新应用默认值。重新把 AI、流媒体等分组设为具体节点，或设为 `Default`
恢复跟随首页。

## 如何安全报告问题

可以提供：

- Anywhere 版本和 iOS 版本；
- 出问题的公开规则分组；
- 公开域名后缀；
- 生成器的脱敏计数、排除原因和警告名；
- GitHub Actions 公开日志。

不要提供：

- 节点服务器与端口组合；
- UUID、密码、Reality 公钥、完整 URI；
- `anywhere-nodes` URL 或任何含 token/auth/key 的 URL；
- Sub-Store 管理地址、Cookie 或访问令牌。
