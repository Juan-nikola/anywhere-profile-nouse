# 维护指南

`rules/` 与 `dist/` 是可复现生成物。修改逻辑时改 `src/` 和 `scripts/`，不要手工编辑生成物。

## 本地环境

需要 Node.js 22+：

```bash
npm ci
npm run verify
```

`npm run verify` 会依次运行单元测试、构建节点脚本、下载并校验当前上游、验证提交的生成物、
扫描潜在秘密和检查文档链接。它需要访问 GitHub Raw。

## 更新规则

```bash
npm run update:rules
npm run verify
git diff -- rules reports/compatibility.json
```

更新过程先在内存中下载并生成全部文件。29 个来源必须全部成功、条目不得低于各自健康阈值、
未知规则类型不得出现；否则命令失败且不会替换现有文件。

确认 `reports/compatibility.json` 中的以下变化合理：

- `input`、`supported`、`approximate`、`unsupported`
- 各来源的规则类型
- 跨分组重复与覆盖冲突数量

数量突然大幅下降、`unsupported` 激增或出现新规则类型时，不要盲目提交，应检查上游格式
变化并补测试。

## 修改分组或优先级

编辑 `src/catalog.js`：

- `RULE_SOURCES` 定义来源、归属组和最低条目数；
- `GROUPS` 的数组顺序就是业务优先级；
- `CUSTOM_RULES` 放少量明确的人工纠错；
- `LOCAL_RULES` 定义局域网与保留网段。

完成后运行：

```bash
npm test
npm run update:rules
npm run verify
```

Shadowrocket 依赖“从上到下先匹配”，Anywhere 更偏向“更具体规则优先”。不要仅移动文件名；
生成器会按照分组顺序消除可能反转含义的后缀、关键词和 CIDR 冲突。

## 修改节点协议映射

1. 在 `tests/fixtures/nodes.js` 增加不含真实凭据的 `TEST_ONLY` 夹具。
2. 给 `src/node-validation.js`、`src/node-uri.js` 与 `src/node-normalizer.js` 增加失败测试。
3. 只在确认 Anywhere 源码能完整导入全部字段后加入协议或传输。
4. 运行 `npm run build` 更新 `dist/substore-node-generator.js`。
5. 运行 `npm run check:secrets`，确认没有真实节点或私密 URL。

不得通过“丢掉参数仍生成 URI”的方式提高兼容数量；无法无损表达就明确排除。

## 自动化

- `Verify` 工作流在 Push 和 Pull Request 上执行 `npm run verify`。
- `Update rules` 工作流每天北京时间约 03:23 运行，也可手动执行；它调用
  `npm run update:rules`，全量验证成功后才提交 `rules/` 和兼容报告。
- 工作流只需要仓库内容写权限，不需要、也不应配置 Sub-Store 或节点秘密。

依赖更新时应提交 `package-lock.json`，并保持 Actions 使用 `npm ci`。

## 发布前检查

按照 [`RELEASE_CHECKLIST.md`](../RELEASE_CHECKLIST.md) 逐项验证。尤其确认：

- 工作区干净；
- `npm run verify` 成功；
- GitHub Actions 成功；
- 所有 Raw URL 可访问；
- 公开仓库秘密扫描为零；
- README 没有承诺 Anywhere 本身不支持的自动测速、故障转移或嵌套策略。
