# Browser Game Hub 游戏查找器

[English](README.md) · **简体中文**

在 Chrome、Edge、Brave 或 Firefox 的工具栏里查找免费浏览器游戏。可以搜索、收藏喜欢的游戏，也可以掷骰子，让它帮你选一个。

[官网][website] · [下载 ZIP][releases] · [反馈问题][issues] · [请我们喝杯咖啡][coffee]

## 运行截图

| 查找和收藏游戏 | 掷骰子选游戏 |
| --- | --- |
| <img src="docs/screenshots/game-finder.png" width="390" alt="插件弹窗内的搜索、分类和收藏功能"> | <img src="docs/screenshots/dice-pick.zh-CN.webp" width="390" alt="弹窗显示 3D 骰子选中的游戏"> |

## 主要功能

- 在弹窗里按名称、别名和标签搜索 Browser Game Hub 的完整游戏库，也可以按分类筛选。
- 点击星标，把喜欢的游戏保存在当前浏览器中。
- 掷 3D 骰子从当前结果里随机选一款游戏，三秒后打开对应页面。你也可以暂停倒计时、立即查看游戏或再抽一次。

插件不申请浏览器权限。公开目录会按需刷新，搜索和筛选在本地完成，断网时也能使用已缓存的目录。[隐私说明](PRIVACY.md)

## 从 GitHub 安装

### Chrome、Edge 和 Brave

1. 从 [最新版本][releases] 下载并解压 `browser-games-extension.zip`。
2. 打开 `chrome://extensions`、`edge://extensions` 或 `brave://extensions`，开启「开发者模式」。
3. 选择「加载已解压的扩展程序」，选中包含 `manifest.json` 的解压目录。
4. 在浏览器的扩展程序菜单中打开 Browser Game Hub。

### Firefox

从 [最新版本][releases] 下载 `browser-games-extension-firefox.zip`。在桌面版 Firefox 142 或更高版本打开 `about:debugging#/runtime/this-firefox`，选择「临时载入附加组件」，然后选中 ZIP。重启 Firefox 后临时扩展会被移除。长期安装需要 Mozilla 签名。

Chromium 开发时可以直接加载仓库中的 `extension/` 目录。运行 `npm run check` 检查游戏目录和打包规则。在 macOS 或 Linux 上运行 `npm run package`，两个 ZIP 都会生成在 `dist/`。

插件源码采用 [MIT 许可证](LICENSE)。Browser Game Hub 品牌和在线游戏遵循各自的权利及许可条款。

[website]: https://browsergamehub.net/?utm_source=github&utm_medium=referral&utm_campaign=browser-games-extension-readme
[releases]: https://github.com/TideSparrow/browser-games-extension/releases/latest
[issues]: https://github.com/TideSparrow/browser-games-extension/issues
[coffee]: https://buymeacoffee.com/marklongpcm
