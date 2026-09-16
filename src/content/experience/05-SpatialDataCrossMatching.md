### 大规模空间数据交叉匹配（cross-matching）数据处理系统

#### 项目背景：
病理分析（pathology analysis）被广泛应用于医疗诊断。病理学家通过活体切片技术获取病人组织的切片，之后通过染色及高精度病例扫描依将切片信息扫描为高精度图片。之后通过相应的机器学习算法可以将图片中感兴趣的个体（细胞核、脂肪、血管等）识别为空间物体，并通过多边形进行表示。

不同的机器学习算法识别出来的个体是不同的，而如何评价使用不同算法得到的结果数据集的好坏需要用到交叉匹配cross-matching查询。如下图所示，对于同一张高精图片，使用两种不同算法得到了红色和绿色两个数据集，这两个数据集的交叉匹配可以通过计算它们之间的jaccard系数来实现。

![fig2.png](https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAL8O2i377Vni6IQu9zlz2YDFOSiP5YhAAIRGgACc5zBVYSf9bLJV7nxNgQ.png)

其中|A|表示A数据集中所有个体面积的和。而|A∩B|表示A和B数据集中所有空间物体相交部分的面积的和。两多边形相交部分如下所示：

![fig3.png](https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAL8Pmi377d5hpo-0z-z73tb5zCy0KHnAAIUGgACc5zBVV4kcYrUg3E5NgQ.png)
#### 项目要求：
1. 我们提供有两个数据集，每个数据集都包含从同一个医学图像上施加不同算法获得的表示细胞核的一百多万个多边形。
2. 利用空间数据索引等工具，快速识别数据集中相交的个体对。
3. 计算所有相交个体对之间相交部分的面积，并基于此实现cross-matching查询。
4. 请使用Spark等分布式计算架构实现快速的cross-matching查询。
5. 设计前端界面，实现数据的导入、计算、及结果的展示。可以给一个数据集中结果的缩略图，用户选择某区域，快速实现该区域cross-matching值的计算，并将两个数据集在该区域的多边形用不同的颜色展示出来。

