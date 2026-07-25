# 发布检查清单

## 本地

- [ ] `git status --short` 没有未计划文件
- [ ] `npm ci` 成功
- [ ] `npm run update:rules` 成功
- [ ] `npm run verify` 成功
- [ ] `dist/substore-node-generator.js` 不包含 `Buffer`、`node:` 或 `require(`
- [ ] `reports/compatibility.json` 的数量变化已经人工审阅
- [ ] 公开仓库秘密扫描没有节点、凭据或私密订阅 URL

## GitHub

- [ ] 仓库为公开仓库 `Juan-nikola/anywhere-profile`
- [ ] `Verify` GitHub Actions 成功
- [ ] `Update rules` 可手动触发并保留失败前的有效规则
- [ ] README 中 23 个 GitHub Raw 规则 URL 均可访问
- [ ] 默认分支为 `main`
- [ ] 发布标签指向已通过校验的提交

## Anywhere / Sub-Store 冒烟测试

- [ ] `anywhere-sources` 独立于 Shadowrocket 组合
- [ ] 原 Shadowrocket Profile、组合和订阅已备份，回滚路径可用
- [ ] `anywhere-nodes` 能生成非空私密订阅
- [ ] Anywhere 能刷新节点和公开规则
- [ ] 首页全局节点可用
- [ ] 国内站点经 `Country Bypass` 直连
- [ ] 国外未匹配站点使用首页节点
- [ ] AI 或流媒体分组可以手工选择独立节点
- [ ] `Default` 能恢复跟随首页
- [ ] 广告与安全规则为 `REJECT`

## 对外说明

- [ ] 没有承诺自动测速、故障转移或多层嵌套
- [ ] 已说明代理链是固定多跳而不是容灾
- [ ] 已强调私密节点订阅不要公开
- [ ] 已链接第三方声明与兼容性报告
