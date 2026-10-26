#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Edge 商店提交包体检（只读，不修改任何文件）

依据：docs/Edge商店合规改造与多项目差异化拔除实施方案_zkptw.md（R3）
  - §1.2 事故二：真正有区分度的拒审特征是 ①newtab_* 劫持文本指纹 ②后台不受控外联
  - 事故五/六：manifest 声明与包内容必须一致；孤立文件本身即触发规则
  - 第二条红线：严禁在"合规"名义下删除承载采集能力的内容脚本

用法：python edge-store-audit.py <zip路径>
"""
import json
import re
import sys
import zipfile


def main():
    if len(sys.argv) < 2:
        print("用法: python edge-store-audit.py <zip路径>")
        sys.exit(2)
    zip_path = sys.argv[1]

    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        entries = {}
        for n in names:
            if n.endswith("/"):
                continue
            try:
                entries[n] = z.read(n).decode("utf-8", errors="ignore")
            except Exception:
                entries[n] = ""

    fails, warns, oks = [], [], []

    def check(cond, label, detail="", level="fail"):
        if cond:
            oks.append(label)
        else:
            (fails if level == "fail" else warns).append(
                f"{label}{' — ' + detail if detail else ''}")

    # 1. 新标签页本体文件
    newtab_files = [n for n in names if re.search(r"newtab", n, re.I)]
    check(not newtab_files, "包内无 newtab 相关文件",
          f"命中 {len(newtab_files)} 个：{', '.join(newtab_files[:6])}")

    # 2. manifest
    mf_name = next((n for n in names if n == "manifest.json"),
                   next((n for n in names if n.endswith("/manifest.json")), None))
    mf = {}
    if mf_name:
        try:
            mf = json.loads(entries[mf_name])
        except Exception as e:
            fails.append(f"manifest 无法解析：{e}")

    # 3. chrome_url_overrides（直接声明劫持新标签页）
    cuo = mf.get("chrome_url_overrides")
    check(not cuo, "manifest 未声明 chrome_url_overrides", json.dumps(cuo, ensure_ascii=False))

    # 4. 新标签页专属权限
    perms = mf.get("permissions", []) or []
    newtab_only = ["bookmarks", "history", "favicon", "topSites", "search"]
    leaked = [p for p in newtab_only if p in perms]
    check(not leaked, "无新标签页专属权限", f"泄漏：{', '.join(leaked)}")

    # 5. 语言包 newtab_* 指纹
    locale_files = [n for n in names if re.match(r"^_locales/[^/]+/messages\.json$", n)]
    total_keys, report = 0, []
    for lf in locale_files:
        try:
            j = json.loads(entries[lf])
        except Exception:
            continue
        hits = [k for k in j if re.search(r"newtab", k, re.I)]
        total_keys += len(hits)
        sample = "（" + ", ".join(hits[:3]) + "…）" if hits else ""
        report.append(f"{lf}: {len(hits)} 条{sample}")
    check(total_keys == 0, "语言包无 newtab_* 指纹",
          ("\n      " + "\n      ".join(report)) if report else "")

    # 6. 远程配置通道
    remote_files = [n for n in names if "remote-configs" in n]
    check(not remote_files, "包内无 remote-configs 目录", f"命中 {len(remote_files)} 个")

    # 7. 静默开 Tab 推广机制
    promo = [("dailyBackgroundTab:", "24h 节流 storage key"),
             ("[DailyBackgroundTab", "结构化日志前缀"),
             ("s.click.taobao.com", "静默开 Tab 专用淘客链接")]
    for lit, desc in promo:
        hit = [n for n in names
               if n.endswith((".js", ".html", ".json")) and lit in entries[n]]
        check(not hit, f"零残留：{desc} ({lit})",
              ("命中：" + ", ".join(hit[:4])) if hit else "")

    # 8. CPS 跳转特征（PUA:Win32/BrowserModifier）—— 警告级
    cps = ["air.1688.com", "clickid", "tracelog", "cps-redirect"]
    for lit in cps:
        hit = [n for n in names if n.endswith((".js", ".html")) and lit in entries[n]]
        check(not hit, f"零残留：CPS 特征 ({lit})",
              ("命中：" + ", ".join(hit[:4])) if hit else "", "warn")

    # 9. 小众域名远程配置外联
    # 【重要】按 R3 §1.5 判据③：红线是「后台定时拉取远程脚本/配置的通道」，
    # 而 addp.yueding168.com 同时也是 pages.html 里用户可见可点的 iframe 榜单广告位
    # （{name:"精选推荐",url:"...?rankType=1"} 等 9 处），属于允许的正常广告。
    # 因此本项降级为警告级，并且只把「仍带 /remote-configs/ 路径的 URL」当红线——
    # 域名本身出现不构成违规，远程配置通道残留才构成。
    # 判据②④：剥了会削掉产品能力，禁止剥。
    for lit in ["addp.yueding168.com"]:
        hit = [n for n in names if n.endswith((".js", ".html")) and lit in entries[n]]
        # 进一步区分：这些命中里有没有"远程配置 URL"（真正的红线）
        cfg_hit = [n for n in hit
                   if f"{lit}/remote-configs" in entries[n] or "/remote-configs/" in entries[n]]
        check(not cfg_hit, f"零残留：远程配置通道 URL（{lit}/remote-configs/）",
              ("命中：" + ", ".join(cfg_hit[:4])) if cfg_hit else "")
        # 域名级命中仅告警，并说明这是 iframe 广告位
        if hit:
            warns.append(
                f"域名 {lit} 出现于 {len(hit)} 个文件 —— 判定为可见 iframe 广告位，"
                f"按 §1.5 判据②④保留不剥（详见 " + ", ".join(hit[:3]) + "）")
        else:
            oks.append(f"无 {lit}（iframe 广告与远程配置均未出现）")

    # 10. localhost 通信
    ec = json.dumps(mf.get("externally_connectable", {}).get("matches", []), ensure_ascii=False)
    check("localhost" not in ec and "127.0.0.1" not in ec,
          "externally_connectable 无 localhost", ec)

    # 11. 高危权限
    for p in ["contextMenus", "alarms"]:
        check(p not in perms, f"无 {p} 权限", "仍存在" if p in perms else "")

    # 12. 孤立 content script
    declared = set()
    for cs in mf.get("content_scripts", []) or []:
        for j in cs.get("js", []) or []:
            declared.add(j.split("/")[-1])
    orphan = [n.split("/")[-1] for n in names
              if re.search(r"(^|/)content-scripts/[^/]+\.js$", n)
              and n.split("/")[-1] not in declared]
    check(not orphan, "无未声明的孤立 content script",
          ("孤立：" + ", ".join(orphan)) if orphan else "")

    # 13. 核心采集脚本未被误删（第二条红线）
    core = ["content.js", "general-media.js", "image-assistant.js",
            "image-assistant-inspector.js"]
    missing = [c for c in core if not any(n.endswith(c) for n in names)]
    present = [c for c in core if any(n.endswith(c) for n in names)]
    check(not missing, "核心采集脚本未被误删",
          ("缺失：" + ", ".join(missing)) if missing else "", "warn")

    LINE = "=" * 74
    print(LINE)
    print(f"Edge 提交包体检：{zip_path.split(chr(92))[-1].split('/')[-1]}")
    print(LINE)
    print(f"包内条目：{len(names)}")
    print(f"manifest：{mf_name}")
    print(f"permissions：{json.dumps(perms, ensure_ascii=False)}")
    print(f"host_permissions：{json.dumps(mf.get('host_permissions'), ensure_ascii=False)}")
    print(f"content_scripts：{len(mf.get('content_scripts', []) or [])} 组，"
          f"声明 {len(declared)} 个脚本")
    print(f"chrome_url_overrides：{json.dumps(cuo, ensure_ascii=False)}")
    print(f"externally_connectable：{ec}")
    print(f"version / version_name：{mf.get('version')} / {mf.get('version_name')}")
    print(f"核心采集脚本在包内：{', '.join(present) if present else '无'}")
    print("")
    print(f"通过 {len(oks)} 项：")
    for o in oks:
        print(f"  [PASS] {o}")
    if warns:
        print("")
        print(f"警告 {len(warns)} 项（非阻塞）：")
        for w in warns:
            print(f"  [WARN] {w}")
    print("")
    if fails:
        print(f"不通过 {len(fails)} 项（阻塞提交）：")
        for f in fails:
            print(f"  [FAIL] {f}")
        print(LINE)
        sys.exit(1)
    print("结论：无阻塞项，可提交")
    print(LINE)


if __name__ == "__main__":
    main()