# 部署指南

本指南把节点凭据留在你自己的 Sub-Store，把可公开的规则留在 GitHub。部署过程中不需要
修改现有 Shadowrocket 配置。

## 0. 部署前检查

- Anywhere 已能正常添加一个测试节点并连接。
- Sub-Store 能读取你已有的节点来源。
- 你能访问本仓库的 GitHub Raw 文件。
- Anywhere 的 HTTPS MITM、Rewrite、脚本功能不需要为本方案开启。
- 先备份 Sub-Store 配置，并保留现有 Shadowrocket Profile、组合与订阅作为可立即恢复的
  独立方案；本项目不会修改它们。

## 1. 建立独立节点组合

在 Sub-Store 中新建组合/集合：

- 名称：`anywhere-sources`
- 内容：选择需要供 Anywhere 使用的现有订阅或节点集合

不要复用现有小火箭输出组合的名字，也不要修改它的脚本链。独立组合的好处是，Anywhere
协议过滤或命名变化不会影响 Shadowrocket。

## 2. 新建节点文件并安装生成脚本

当前 Sub-Store Web UI 可以直接在最终文件内添加脚本操作，不必另建脚本分组：
旧版界面或文档可能把这项能力称为 `File Script`；两者指向同一种文件处理脚本，区别只是
新版界面把它直接配置在 `anywhere-nodes` 的“文件操作”区域。

1. 进入“文件”，点击 `+`，选择“文件”。
2. 名称填 `anywhere-nodes`，显示名称建议填 `Anywhere 节点`，类型选择“文件”，来源选择
   “本地”，标签建议填 `anywhere`。
3. 找到“文件操作”，点击“脚本操作”，再打开“文件操作”标题旁的总开关。
4. 点击脚本标题右侧的编辑图标，将操作命名为 `anywhere-node-generator`。
5. 保持脚本操作的“启用”和“预览”开启，类型选择“远程链接”，填写：

   ```text
   https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/dist/substore-node-generator.js
   ```

6. 展开参数，逐行添加：

   | key | value |
   |---|---|
   | `output` | `nodes` |
   | `type` | `collection` |
   | `name` | `anywhere-sources` |

等价的参数文本为：

```text
output=nodes&type=collection&name=anywhere-sources
```

参数含义：

- `output=nodes`：生成节点订阅；
- `type=collection`：从组合/集合取节点；
- `name=anywhere-sources`：读取上一步建立的独立组合。

脚本会请求 Sub-Store 以内部 JSON 形式生成该组合，然后过滤协议、验证参数、按网络身份
去重、加地区/来源标签，最后输出 Base64 编码的 Anywhere 原生 URI 列表。

## 3. 预览并发布私密节点文件

1. 点击底部“即时预览”。
2. 成功结果是一整段非空 Base64 文本；不能是默认注释、`{}` 或空白。
3. 如果提示 `produceArtifact must return a non-empty node array`，检查
   `anywhere-sources` 的名称、内容和参数。
4. 预览成功后关闭预览并保存。
5. 回到文件列表，确认存在显示名称“Anywhere 节点”的文件。
6. 从文件卡片复制 `anywhere-nodes` 私密文件 URL，并在普通浏览器标签页验证它仍返回
   非空 Base64。

成功日志只应出现总数、接受数、协议/地区/来源分类、排除原因与警告数量，不应出现服务器、
端口、UUID、密码、公钥或完整 URI。

若有效节点数为零，生成器会主动失败，不会输出空订阅覆盖上一版。

> `anywhere-nodes` URL 带有访问令牌和全部节点信息。不要公开，不要粘贴到 GitHub、
> Issue、聊天截图或调试日志；泄露后应立即在 Sub-Store 重新生成令牌。

## 4. 把节点订阅加入 Anywhere

在 Anywhere 的代理/节点订阅区域添加 `anywhere-nodes` 私密 URL，名称建议填
`Anywhere 节点`。保存并刷新后检查：

- 支持的节点出现在列表中；
- 节点名称带地区旗帜和 `[自建]`、`[机场]`、`[Realm]`、`[服务端链]`、
  `[落地]` 或 `[来源]` 标签；
- 首页选中一个节点后可以正常联网。

导入的是 Sub-Store 生成的 `anywhere-nodes` 私密文件 URL，不是 GitHub Raw 脚本 URL、
Sub-Store 管理地址或 `anywhere-sources` 组合 URL。节点订阅建议每 6 小时刷新一次；客户端
没有定时刷新功能时手动刷新即可。

被过滤的协议详见[兼容性说明](compatibility.md)。如果节点要求跳过证书校验，生成日志会
出现 `global-allow-insecure-required` 警告；只有确认节点可信后才开启 `Allow Insecure`。

## 5. 导入规则集

回到项目 [README 的规则表](../README.md#2-导入公开规则订阅)，把 23 个 Raw URL 逐个添加为
Anywhere Rule Set 订阅。

首次导入检查以下初始路由：

- 本地、中国大陆、Apple、Microsoft、国内应用、下载：`DIRECT`
- 广告、安全威胁：`REJECT`
- AI、GitHub、海外流媒体、社交、游戏：`Default`

这里的 `Default` 是不主动参与路由。它让该业务先使用首页当前全局节点；当你想给某个
业务独立选路时，在它的 Routing 中点选具体节点即可。

规则订阅只包含域名与 IP 网段，不含节点。规则刷新后，App 中手工选择的 Routing 应继续
保留；首次导入前设置的 `routing` 只负责给出初始值。

## 6. 启用国内/国外兜底

在 Anywhere 设置中启用中国 `Country Bypass`，并关闭 `Prevent DNS Leak`。Anywhere 只有
在允许本地 DNS 解析时，才会把未匹配域名解析出的 IPv4 再交给中国 IP 规则。最终顺序应为：

```text
广告/安全拒绝
→ 已指定节点的业务规则
→ 已知中国与局域网直连
→ 未匹配域名解析 IP
→ 中国 IP 直连
→ 其他流量走首页全局节点
```

用一个规则未覆盖的国内小站和一个国外小站分别测试。若方向相反，检查 Country Bypass
所选国家/模式是否确实表示“中国地址绕过代理”。首次访问可能先走默认节点，因为解析在
后台预热；断开后再次访问才会使用缓存的 IPv4 判断。纯 IPv6 未知域名不参与这次二次匹配。

## 7. 日常操作

- 平时只在首页切换全局节点。
- AI/流媒体需要特定地区时，在对应规则集选择该地区节点。
- 恢复跟随首页时，把规则集 Routing 改回 `Default`。
- 需要固定多跳时，可以选一个手工建立的代理链；代理链不测速、也不自动容灾。
- 节点订阅建议每 6 小时刷新，规则每天刷新一次。

## 8. 单设备灰度与回滚

先只在一台 iPhone/iPad 上部署，不要同时替换所有日常设备。至少验证：

- 局域网、国内网站直连；
- 国外网站使用首页节点；
- AI 或一个流媒体分组能手工指定不同节点；
- 广告/安全分组拒绝；
- 节点与规则刷新后，本地 Routing 选择仍然保留。

出现影响日常使用的问题时：

1. 在 Anywhere 断开连接，恢复使用原 Shadowrocket Profile；它没有被本项目改动。
2. 若仅规则异常，可先停用或删除新导入的 Rule Set，节点订阅无需删除。
3. 若仅节点异常，恢复 `anywhere-sources` 的备份或换回原节点来源。
4. 保留公开错误类型和脱敏计数用于排查，不要公开私密订阅 URL。
