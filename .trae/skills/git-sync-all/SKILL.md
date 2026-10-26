---
name: git-sync-all
description: "提交并推送 PcGetPic 主项目及 12 个子项目到各自远程仓库，或拉取所有仓库的最新代码；始终保持各仓库固定的 main/master 主分支。用于‘提交git’、‘提交代码’、‘push所有’、‘推送所有仓库’、‘全部提交’、‘下载代码’、‘拉取最新’、‘pull所有’、‘同步代码’等请求。推送时必须逐仓库分析 diff，生成不同的提交标题和具体变更说明，先预检再按子项目优先、主项目最后的顺序提交与推送，并逐仓库汇报提交内容。"
---

# Git Sync All

同步 PcGetPic 的 13 个独立 Git 仓库。推送的核心要求是：**每个有变更的仓库都必须有独立、具体、基于 diff 的提交标题与正文说明**。

## 仓库清单

| 仓库 | 路径 | 分支 | Gitee 远程 |
|---|---|---|---|
| 主项目 | `.` | main | image-download-client |
| browser | `browser/` | master | browser |
| client | `client/` | master | client-side-diagram |
| cps-server | `cps-server/` | main | dataoke-pic-search |
| ec-nuxt | `ec-nuxt/` | main | e-commerce-website-nuxt |
| GetPic | `GetPic/` | main | alibaba-image-download |
| next-GetPic | `next-GetPic/` | main | next-GetPic |
| oneget-website | `oneget-website/` | main | oneget-website |
| Pro-GetPic | `Pro-GetPic/` | main | pro-getpic |
| server | `server/` | master | server-dangtu |
| tools | `tools/` | master | tools.yueding168.com |
| website | `website/` | main | dangtu-plugin-official-website |
| TuGet-Client | `TuGet-Client/` | master | tu-get-client |

## 主分支约束（适用于所有软件与电脑）

本项目由一人维护、多台电脑协作。上表是固定的主分支映射：`browser/client/server/tools/TuGet-Client` 使用 `master`，其余使用 `main`。保留这些名称，不统一重命名为 `main`。

- 所有提交、拉取、推送都在对应主分支上完成。不得自动创建或切换到功能分支、临时分支、备份分支或额外 worktree，也不得在 detached HEAD 上提交。
- 已在主分支时保持不变。处于其他分支或 detached HEAD 时，先检查提交关系；只有能够保留现有提交并快进归并时才返回主分支。缺少本地主分支时，只允许根据 `origin/<主分支>` 创建该主分支。
- 分支已经分叉、有未完成的 merge/rebase 或未解决冲突时，保留现场并报告仓库、分支、失败原因；不得通过强制切换、`reset --hard`、删除分支或强推来绕过。故障现场可能仍停留在原分支，不能将其报告为同步成功。
- 始终显式操作 `origin/<主分支>`。不依赖原有 upstream、`push.default` 或远程 push refspec；执行时将主分支的 upstream 设为正确的 `origin/<主分支>`。
- 脚本逐仓库禁用子模块递归操作，避免各电脑的 `submodule.recurse=true` 让子模块变成 detached HEAD。常规同步不得额外执行 `git submodule update`、递归 checkout/pull 或检出主项目记录的子模块 SHA。新电脑若尚未初始化子模块，需单独初始化，再运行本技能返回主分支；报告中列出所有未初始化的仓库，不能将跳过计为成功。
- 同步采用快进更新。多台电脑产生分叉时停止自动同步，明确列出待处理仓库，后续解决仍在原有主分支内完成；不得擅自覆盖任一电脑的提交。
- `-Scan` 和 `-DryRun` 不切换分支、不暂存或提交文件；拉取扫描仅更新远程跟踪引用。实际操作成功后必须核验当前分支与上表一致。

## Skill 漂移守门（推送前强制）

`.agents/skills/` 是全部Agent skill 的唯一真源，`.codebuddy/skills`、`.trae/skills`、`.catpaw/skills`、`.opencode/skills`、`.qoder/skills` 都只是它的镜像。

`push-all.ps1` 在**暂存任何文件之前**会调用 `scripts/sync-skills.ps1 -Check`：

- 副本与真源不一致（缺失或漂移）→ 直接抛错中止，**不提交、不推送**，并列出漂移文件；
- `-Scan` / `-DryRun` 只报告不拦截；
- 确需带漂移推送时显式加 `-SkipSkillSyncCheck`（会打印忽略提示）；
- `scripts/sync-skills.ps1` 不存在时跳过守门并提示。

修复方式：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-skills.ps1
```

只改 `.agents/skills/` 下的文件，然后立刻执行上述同步命令，再提交——否则会把「不同工具读到不同版本 skill」的状态写进版本库。

## 提交并推送

### 1. 详细扫描

在当前电脑的 PcGetPic 项目根目录下运行（本机为 `D:\Trae\PcGetPic`，脚本从自身位置解析根目录）：

```powershell
& '.agents/skills/git-sync-all/scripts/push-all.ps1' -Scan -Detailed
```

扫描只负责定位仓库和变更规模，不能直接拿文件名拼接提交信息。

### 2. 逐仓库理解变更

对扫描结果中每个 `CHANGED` 仓库分别检查：

```powershell
git -C <仓库路径> status --short
git -C <仓库路径> diff HEAD --stat
git -C <仓库路径> diff HEAD --
git -C <仓库路径> ls-files --others --exclude-standard
```

遵守以下规则：

- 子项目必须在自己的路径内查看 diff；主项目的 submodule 指针变化不能代表子项目的实际改动。
- 同时覆盖已暂存、未暂存和未跟踪文件。未跟踪文件不会出现在 `git diff HEAD` 中，需按需读取其内容。
- diff 较大时先看 stat 和文件职责，再查看关键源文件的具体 diff；不能仅根据目录名或文件名猜测。
- 锁文件、编译产物或生成文件不是主要描述对象；优先说明触发它们变化的源码、依赖或配置。
- 不确定的行为影响不要臆测，只描述能够从 diff 验证的事实。

### 3. 为每个仓库编写独立提交说明

每个仓库生成：

- `Title`：`<type>: <具体动宾描述>`，一句话说明主要改动。优先使用 `feat`、`fix`、`refactor`、`perf`、`docs`、`test`、`build`、`chore`。
- `Details`：1–3 条具体说明，写清“改了什么”和必要时“解决什么问题/影响什么行为”。不要只是罗列文件名。

禁止使用以下泛化信息：

- `chore: 更新 browser, GetPic, website`
- `chore: auto commit`
- `更新代码`、`代码调整`、`若干优化`
- 给全部仓库复制同一条标题或正文

用户提供的提交说明只能作为意图线索，仍需与 diff 核对并按仓库改写。即使用户明确指定统一标题，每个仓库也必须保留自己的 `Details`。

主项目的说明需区分两类内容：

- 只有子模块指针变化：标题使用 `chore: 更新子项目引用`，Details 列出实际更新的子项目。
- 还有主项目自身文件变化：标题概括主项目直接改动，Details 同时说明直接改动与子模块引用更新。

提交计划示例：

```powershell
$repoMessages = @{
    'browser' = @{
        Title = 'fix: 修复采集状态刷新异常'
        Details = @(
            '在标签页切换后重新同步采集计数与按钮状态'
            '清理失效任务，避免界面继续显示旧的下载进度'
        )
    }
    'GetPic' = @{
        Title = 'feat: 增强页面资源批量下载'
        Details = @(
            '补充页面资源解析与批量入队逻辑'
            '统一下载任务的文件名和失败状态处理'
        )
    }
    '(root)' = @{
        Title = 'chore: 更新子项目引用'
        Details = @('同步 browser 与 GetPic 的最新提交指针')
    }
}
```

PowerShell 单引号内容如包含 `'`，使用 `''` 转义。

### 4. 预检提交计划

先用 dry-run 验证主分支状态，以及所有有变更的仓库都具备标题和 Details：

```powershell
& '.agents/skills/git-sync-all/scripts/push-all.ps1' `
    -RepoMessages $repoMessages `
    -RequireRepoMessages `
    -DryRun
```

将预检结果作为简短进度更新展示给用户，但用户已要求“提交/推送”时无需再次等待确认。若任何仓库缺少标题或 Details，脚本会在 `git add` 前整体中止。

只要任一子项目有工作区变更，或返回主分支会改变子项目 HEAD，提交计划中必须包含 `(root)`；主项目需要记录新的 submodule 指针。实际推送前会刷新远程主分支状态，落后时先执行拉取并重新检查 diff 与提交计划。

### 5. 执行提交并推送

复用通过预检的同一个 `$repoMessages`：

```powershell
& '.agents/skills/git-sync-all/scripts/push-all.ps1' `
    -RepoMessages $repoMessages `
    -RequireRepoMessages
```

本技能必须使用 `-RepoMessages` 和 `-RequireRepoMessages`。`-Message` 仅为旧的手动调用保留，不得在技能流程中使用。

脚本按以下顺序执行：

1. 全部仓库通过分支与提交计划预检后，先安全返回各自的主分支，再进行任何提交。
2. 所有有变更的子项目分别执行 `git add -A`、使用各自 Title/Details 提交，并显式推送到 `origin` 的对应主分支。
3. 子项目均成功后，最后提交并推送主项目，记录最新子模块指针；任一子项目失败时不发布主项目引用。
4. 无工作区变更但有本地未推送提交的仓库只执行推送，不创建空提交。

### 6. 逐仓库汇报

最终答复必须列出每个实际提交或推送的仓库，至少包含：

| 仓库 | 结果 | commit | 提交标题 | 具体修改 |
|---|---|---|---|---|
| browser | pushed | `abc1234` | `fix: ...` | 1–3 条简明说明 |

同时给出 `pushed / clean / failed` 数量。失败时说明失败阶段；若 commit 已成功但 push 失败，明确指出该 commit 仍保留在本地。不要只汇报“修改了 X 个文件”。

## 拉取最新代码

### 1. 扫描远程差异（可选）

```powershell
& '.agents/skills/git-sync-all/scripts/pull-all.ps1' -Scan
```

### 2. 执行拉取

```powershell
& '.agents/skills/git-sync-all/scripts/pull-all.ps1'
```

脚本先更新主项目，再逐一更新子项目：显式 fetch 对应远程主分支，检查提交关系，必要时安全返回主分支，然后执行 `merge --ff-only`。所有操作禁用子模块递归，已是最新的仓库仍会检查并修复分支。

需要切换或更新且存在本仓库修改时，先保存已暂存、未暂存和未跟踪文件，完成后按本次 stash 的 SHA 恢复（含暂存状态）；不触碰已有 stash。子模块自身的修改由各子项目处理。恢复冲突时保留 stash、输出 SHA 并标为失败，不得自动丢弃 stash 或宣称修改已全部恢复。

### 3. 汇报

汇总 `updated / up-to-date / repaired / skipped / failed` 数量，列出远程更新、拉取提交数以及修复后的主分支；明确列出未初始化、分叉、网络失败或 stash 恢复失败的仓库。脚本失败返回非零退出状态，不得忽略后继续报告全部成功。

## 安全与回退

- 不要逐仓库临时拼命令提交；始终使用脚本，以确保子项目先、主项目最后。
- `scripts/git-common.ps1` 是两个脚本共同使用的分支、递归隔离与 stash 保护逻辑。每个软件的技能目录必须保留自己的完整副本。
- 脚本因执行策略被拦截时，只为当前 PowerShell 进程执行 `Set-ExecutionPolicy -Scope Process Bypass` 后重试。
- 自动脚本确实无法运行时才手动回退；仍须遵守主分支约束、显式 origin 主分支、禁用递归、快进更新与修改保留规则；提交时逐仓库生成独立标题和正文，先处理全部子项目，最后处理主项目。
