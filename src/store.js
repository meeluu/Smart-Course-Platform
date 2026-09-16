import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);
const M = (filename) => require(`@/assets/${filename}.md`).default;

export default new Vuex.Store({
  state: {
    projects: [
      {
        id: 19,
        name: "IEEE 2026 SciVis Contest 海洋大气气候数据可视分析系统",
        href: "",
        thumbnail: "/images/climate_vis.jpg",
        markdown: M("2025Fall/01-ClimateDataVisualization"),
      },
      {
        id: 20,
        name: "基于华为昇腾算力底座与计图框架的冷冻电镜数据分析大模型构建与效能优化",
        href: "",
        thumbnail: "/images/cryo_em.jpg",
        markdown: M("2025Fall/02-CryoEMDataAnalysis")
      },
      {
        id: 21,
        name: "融合知识图谱与时序分析的海洋新闻态势感知系统",
        href: "",
        thumbnail: "/images/marine_news.jpg",
        markdown: M("2025Fall/03-MarineNewsAwareness")
      },
      {
        id: 22,
        name: "基于实时位置数据的传染病密接个体识别系统",
        href: "",
        thumbnail: "/images/contact_tracing.jpg",
        markdown: M("2025Fall/04-InfectiousContactIdentification")
      },
      {
        id: 23,
        name: "大规模空间数据交叉匹配（cross-matching）数据处理系统",
        href: "",
        thumbnail: "/images/spatial_matching.jpg",
        markdown: M("2025Fall/05-SpatialDataCrossMatching")
      },
      {
        id: 24,
        name: "人类肠道微生物数据资源库与多维智能分析平台",
        href: "",
        thumbnail: "/images/gut_microbiome.jpg",
        markdown: M("2025Fall/06-GutMicrobiomeAnalysis")
      }
    ],
    previousProjects: [
        {
        id: 14,
        name: "VAST Challenge 2022",
        href: "",
        thumbnail: "/images/VR.jpg",
        markdown: M("VAST2022"),
      },
      {
        id: 18,
        name: "VAST Challenge 2021",
        href: "",
        thumbnail: "/images/VAST2021.png",
        markdown: M("VAST2021"),
      },
      {
        id: 15,
        name: "ChinaVis Challenge 2022",
        href: "",
        thumbnail: "/images/ChinaVis2022.jpg",
        markdown: M("ChinaVis2022"),
      },
      {
        id: 16,
        name: "Graph Challenge",
        href: "",
        thumbnail: "/images/GraphChallenge.png",
        markdown: M("GraphChallenge"),
      },
      {
        id: 17,
        name: "Classification in Cryo-Electron Tomograms",
        href: "",
        thumbnail: "/images/CCET.png",
        markdown: M("CCET"),
      },
      {
        id: 10,
        name: "ChinaVis Challenge 2021",
        href: "",
        thumbnail: "/images/ChinaVis2021.png",
        markdown: M("ChinaVis2021"),
      },
      {
        id: 11,
        name: "VAST Challenge 2019 - MC2",
        href: "",
        thumbnail: "/images/VAST2019.jpeg",
        markdown: M("VAST2019"),
      },
      {
        id: 9,
        name: "VAST Challenge 2018 - MC1",
        href: "",
        thumbnail: "/images/VAST2018.jpg",
        markdown: M("VAST2018"),
      },
      {
        id: 12,
        name: "VAST Challenge 2018 - MC2",
        href: "",
        thumbnail: "/images/VAST2018_2.jpeg",
        markdown: M("VAST2018_2"),
      },
      {
        id: 13,
        name: "Visual Analytics for Nature Images",
        href: "",
        thumbnail: "/images/Nature.png",
        markdown: M("Nature"),
      },
      {
        id: 5,
        name: "VAST Challenge 2012 - MC1",
        href: "",
        thumbnail: "/images/VAST2012.jpg",
        markdown: M("VAST2012"),
      },
      {
        id: 6,
        name: "VAST Challenge 2014 - MC2",
        href: "",
        thumbnail: "/images/VAST2014.png",
        markdown: M("VAST2014"),
      },
      {
        id: 7,
        name: "VAST Challenge 2015 - MC1",
        href: "",
        thumbnail: "/images/VAST2015.jpg",
        markdown: M("VAST2015"),
      },
      {
        id: 8,
        name: "VAST Challenge 2016 - MC2",
        href: "",
        thumbnail: "/images/VAST2016.jpg",
        markdown: M("VAST2016"),
      },
      {
        id: 0,
        name: "Visual Exploration in AR",
        href: "",
        thumbnail: "/images/AR.jpeg",
        markdown: M("AR"),
      },
      {
        id: 1,
        name: "Visual Exploration in VR",
        href: "",
        thumbnail: "/images/VR.jpg",
        markdown: M("VR"),
      },
      {
        id: 2,
        name: "Visual Analytics + Business",
        href: "",
        thumbnail: "/images/business.jpg",
        markdown: M("business"),
      },
      {
        id: 3,
        name: "Sentiment Analysis",
        href: "",
        thumbnail: "/images/sentiment.png",
        markdown: M("sentiment"),
      },
      {
        id: 4,
        name: "Openpose: 2D pose estimation from single image",
        href: "",
        thumbnail: "/images/openpose.jpg",
        markdown: M("openpose"),
      },
    ],
    classrooms: [
      {
        id: 0,
        name: "2023年秋季课程",
        enName: "Autumn class, 2023",
        entry:
          "https://classroom.github.com/classrooms/55434637-sdubigdatacourse-2019",
        repos: [
          {
            name: "项目视频演示",
            enName: "Project video demo",
            markdown: M("demo_list"),
          },
          // {
          //   name: '',
          //   url: '',
          //   members: [
          //     ''
          //   ]

        ],
      },
        {
        id: 3,
        name: "2022年秋季课程",
        enName: "Autumn class, 2022",
        entry: "https://icloud.qd.sdu.edu.cn:7777/link/0261935EEB7A63D16C42D87E41E26B55",
        repos: [],
      },
      {
        id: 2,
        name: "2021年秋季课程",
        enName: "Autumn class, 2021",
        entry: "/projects",
        repos: [],
      },
      {
        id: 1,
        name: "2020年秋季课程",
        enName: "Autumn class, 2020",
        entry:
          "https://classroom.github.com/classrooms/55434637-sdubigdatacourse-2020",
        repos: [],
      },
      {
        id: 0,
        name: "2019年秋季课程",
        enName: "Autumn class, 2019",
        entry:
          "https://classroom.github.com/classrooms/55434637-sdubigdatacourse-2019",
        repos: [
          {
            name: "1015课堂讨论",
            enName: "discussion - 10/15/2019",
            markdown: M("191015disscussion"),
          },
          // {
          //   name: '',
          //   url: '',
          //   members: [
          //     ''
          //   ]
          // }
        ],
      },



    ],
    references: [
      {
        id: 0,
        name:
          "Mastering the information age - solving problems with visual analytics",
        translateName: "",
        authors:
          "Daniel Keim, Jöm Kohlhammer, Geoffrey Ellis, Florian Mansmann",
        pub: "Eurographics Association",
        pubI18n: false,
        pubYear: 2010,
      },
      {
        id: 1,
        name: "Introduction to Data Mining",
        translateName: "数据挖掘导论（完整版）",
        authors: "Pang-Ning Tang、Michael Steinbach、Vipin Kumar",
        pub: "ptPress",
        pubI18n: true,
        pubYear: 2011,
      },
      {
        id: 2,
        name: "Mining of Massive Datasets",
        translateName: "大数据（互联网大规模数据挖掘与分布式处理）",
        authors: "Jure Leskovec, Anand Rajaraman, Jeffrey David Ullman",
        pub: "ptPress",
        pubI18n: true,
        pubYear: 2012,
      },
      {
        id: 3,
        name: "Interactive data visualization",
        translateName: "数据可视化实战（使用D3设计交互式图表）",
        authors: "Scott Murray",
        pub: "ptPress",
        pubI18n: true,
        pubYear: 2013,
      },
      {
        id: 4,
        name: "数据可视化",
        translateName: "",
        authors: "陈为、沈则潜",
        pub: "phei",
        pubI18n: true,
        pubYear: 2013,
      },
    ],
  },
});
