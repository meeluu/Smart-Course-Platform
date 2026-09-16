### IEEE 2026 SciVis Contest 海洋大气气候数据可视分析系统
[https://sciviscontest2026.github.io](https://sciviscontest2026.github.io/)

本次竞赛数据为美国国家航空航天局（NASA）提供的P级海洋和大气气候数据，着重于探索气候大数据集的高级可视化方法，鼓励提出创新的解决方案，以应对诸如气候预测、天气模拟和环境影响分析等现实世界的问题。

- 可以使用OpenVisus、Openvisuspy、Python、ParaView、以及VTK等工具进行可视化处理
- 冠军可以获得1000美刀的现金奖励

#### 任务：
- 绘制从 1950 年到 2100 年可视化空气温度随时间的变化情况，探究不同地区的变化模式和差异。创建可视化图表，展示气温随时间的变化情况。探究全球不同地区湿度的变化情况。
- 利用向东（U）和向北（V）的风速来描绘全球大气风系，从而了解不同高度层的大气环流情况。
- 探究在热带风暴或飓风等极端天气事件中大气动力学与海洋之间的相互作用，关注风向、温度和洋流等方面。
- 绘制不同深度处的速度场图，来直观呈现海洋洋流的复杂三维结构，突出展示环流模式及其垂直结构。
- 生成新颖的可视化图表，这些图表能够为数据提供新的见解，且不受特定问题或任务的限制。

#### 数据：

|Field Name|Data Type|Unit|Standard Name|Shape|Dimensions|
| ---- | ---- | ---- | ---- | ---- | ---- |
|u|float32|m s-1|Sea-surface east-west velocity|(17280, 12960, 90)|Latitude, Longitude, Depth|
|V|float32|m s-1|Sea-surface north-south velocity|(17280, 12960, 90)|Latitude, Longitude, Depth|
|W|float32|m s-1|Sea-surface vertical velocity|(17280, 12960, 90)|Latitude, Longitude, Depth|
|theta|float32|˚C|Sea-surface Temperature|(17280, 12960, 90)|Latitude, Longitude, Depth|
|salt|float32|g kg-1|Sea Water Salinity|(17280, 12960, 90)|Latitude, Longitude, Depth|





