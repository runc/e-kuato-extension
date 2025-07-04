# Ecom-Tong 跨境通采集助手
这是一个跨境电商的数据抓取浏览器插件，支持从多个电商平台采集商品数据。
## 功能特点
- 支持多平台数据采集：AliExpress、Amazon、Temu、Shein 等- 支持单个商品采集和批量采集
- 自动化采集功能，可设置自动翻页和采集- 支持采集商品详情、图片、规格、价格等信息
- 数据可保存到本地服务
## 安装方法
1. 下载源代码或发布版本2. 在Chrome浏览器中打开 `chrome://extensions/`
3. 开启"开发者模式"4. 点击"加载已解压的扩展程序"，选择本项目文件夹
## 使用方法
1. 在浏览器中打开支持的电商网站
2. 点击插件图标或右键菜单进行采集操作3. 可在商品详情页直接采集，也可在列表页批量选择商品
## 开发相关
### 构建命令
```
uglifyjs js/aliexpress.js js/amazon.js js/temu.js -o dist/bundle.min.js -c -m```
### 项目结构
- `manifest.json`: 插件配置文件
- `popup.html`: 插件弹出窗口- `background.js`: 后台服务脚本
- `js/`: 包含各平台采集脚本  - `aliexpress.js`: AliExpress平台采集
  - `amazon.js`: Amazon平台采集  - `temu.js`: Temu平台采集
  - `shein.js`: Shein平台采集  - `popup.js`: 弹窗交互脚本
## 配置说明
插件需要配置本地服务地址，默认为：
- 数据保存接口: `http://127.0.0.1:8012/save_init_product`- 模板获取接口: `http://127.0.0.1:8012/api/get_all_catalog`
## 许可证



























这是一个跨境电商的数据抓取浏览器插件
