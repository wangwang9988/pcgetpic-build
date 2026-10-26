# Agent Skills 维护约定

本目录下的 skill 会被多套AI 工具读取，每个工具读各自的目录，而各目录都是**实体副本**（无符号链接、无自动同步）。

| 目录 | 服务对象 | 状态 |
| :--- | :--- | :--- |
| `.agents/skills/` | 通用/聚合入口（`.agents/skills.json` 登记 11 个路径） | **唯一真源** |
| `.codebuddy/skills/` | CodeBuddy | 镜像 |
| `.trae/skills/` | Trae | 镜像 |
| `.catpaw/skills/` | CatPaw | 镜像 |

## 铁律

1. **只改 `.agents/skills/`**，改完立刻执行同步脚本，再提交。
2. 提交前跑 `-Check` 守门；镜像**缺失、内容不一致、甚至多出文件**都算漂移，退出码为 1。

> `push-all.ps1` 已内置该守门：暂存任何文件之前自动跑 `-Check`，漂移即中止提交与推送
> （`-Scan` / `-DryRun` 只报告；确需带漂移推送时显式加 `-SkipSkillSyncCheck`）。

```powershell
# 同步（补齐缺失 + 覆盖漂移）
powershell -ExecutionPolicy Bypass -File scripts/sync-skills.ps1

# 仅体检，不写文件；发现漂移退出码 1
powershell -ExecutionPolicy Bypass -File scripts/sync-skills.ps1 -Check

# 清理目标目录中真源已删除的遗留文件（如.catpaw 下的历史 _*.ps1）
powershell -ExecutionPolicy Bypass -File scripts/sync-skills.ps1 -Prune
```

## 路径引用策略

默认「单一真源」模式：镜像副本内部的命令仍指向 `.agents/skills/...`，即**运行时只有一份脚本**，杜绝同一脚本多副本漂移。

若希望某份副本自包含（例如要单独拷贝 `.trae/skills/website-deploy` 到别的机器），加 `-SelfContained`，脚本会把副本内的 `.agents/skills/` 路径改写为该副本自身路径。

## 排错

| 现象 | 原因与处理 |
| :--- | :--- |
| 某工具读到的 skill 描述/触发词是旧的 | 该副本漂移，跑同步脚本 |
| `.trae`侧skill 报「找不到脚本」 | 历史 `.gitignore` 只放行了 `git-sync-all/`，现已改为放行 `.trae/skills/*/`，补提交即可 |
| `-Check` 报「多余」 | 目标目录存在真源已删的遗留文件，确认无用后加 `-Prune` |

> 各子仓库内的 `<sub>/.catpaw/skills/`（docs-writer、git-ops、scheme-writer 等）是另一套独立命名的skill 模板，属于各自子仓库，不在本同步范围内。