## Introduction

人体姿态估计是一个应用十分广泛的课题。它的基本任务是：将图片中人体的重要关节点标注出来，并按照人体结构进行拓扑连接。人体姿态估计技术在体育健身、动作采集、3D试衣、舆情监测等领域具有广阔的应用前景。OpenPose是基于卷积神经网络和监督学习，并以caffe为框架写成的开源库，可以实现人的面部表情、躯干和四肢甚至手指的跟踪，同时具有较好的鲁棒性，可以称作世界上第一个基于深度学习的实时多人二维姿态估计。

该项目的主要思想：1、对输入的图像进行卷积，提取相关特征；2、对提取的特征分别获取Part Confidence Maps和Part Affinity Fields，获取到图像中的各个肢体的所在位置；3、根据上一步的信息得到Part Association，匹配起同一个人的关节点并连接，形成整体骨架。

## Project Task

*  运行OpenPose项目代码，使用不同的图片数据集进行测试

*  记录标记不成功的例子，提出改进思路并实践

## Schedule

第2周：中秋节放假

第3-4周：搭建OpenPose所需环境：Cmake(GUI)+Visual Studio 2019+Cuda10.0

第5周：国庆节放假

第6-7周：建立项目并运行demo

第8-10周：使用不同的图片数据集测试，发现不成功标记的例子并分类（比如遮挡、非直立、扭曲的姿势等），针对一种或几种没有成功标记的例子，思考讨论，提出可行的优化方案。

第11-13周：实现优化方案的代码，给出优化后的结果

第14-15周：结果汇总，制作报告

第16-17周：presentation

## Resources

*  Openpose项目源码：https://github.com/CMU-Perceptual-Computing-Lab/openpose

*  论文地址：https://arxiv.org/pdf/1611.08050.pdf

*  相关环境搭建教程：https://blog.csdn.net/qq_20226441/article/details/82380030

*  图片数据库（仅供参考）：http://cocodataset.org/#download

*  示例视频：https://www.youtube.com/watch?v=C1Sxk6zxWLM