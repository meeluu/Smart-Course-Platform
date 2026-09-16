import Vue from "vue";
import Router from "vue-router";

Vue.use(Router);

let i18n = null;

const router = new Router({
  routes: [
    {
      path: "/",
      name: "home",
      meta: {
        title: "homePage",
      },
      component: () =>
        import(/* webpackChunkName: "home" */ "./views/Home.vue"),
    },
    {
      path: "/projects",
      name: "projects",
      meta: {
        title: "projectList",
      },
      component: () =>
        import(/* webpackChunkName: "projects" */ "./views/Projects.vue"),
    },
    {
      path: "/progress",
      name: "progress",
      meta: {
        title: "resultList",
      },
      component: () =>
        import(/* webpackChunkName: "progress" */ "./views/Progress.vue"),
    },
    {
      path: "/resources",
      name: "resources",
      meta: {
        title: "courseResources",
      },
      component: () =>
        import(/* webpackChunkName: "resources" */ "./views/Resources.vue"),
    },
    {
      path: "/classroom",
      name: "classroom",
      meta: {
        title: "courseEntries",
      },
      component: () =>
        import(/* webpackChunkName: "classroom" */ "./views/Classroom.vue"),
    },
  ],
});

router.beforeEach((to, from, next) => {
  if (i18n) {
    document.title = i18n.t(to.meta.title) + " - " + i18n.t("bigdataTitle");
  } else {
    document.title = "大数据分析实践";
  }
  if (router.resolve(to).resolved.name === null) next("/");
  next();
});

export { router };
export function setI18n(i) {
  i18n = i;
}
