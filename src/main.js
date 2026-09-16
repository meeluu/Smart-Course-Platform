import Vue from "vue";
import iView from "iview";
import App from "./App.vue";
import { router, setI18n } from "./router";
import store from "./store";
import Han from "han-css";
import VueI18n from "vue-i18n";
import en from "iview/dist/locale/en-US";
import zh from "iview/dist/locale/zh-CN";
import localeEn from "./locales/en.json";
import localeZh from "./locales/zh.json";
import "iview/dist/styles/iview.css";

Vue.config.productionTip = false;
Vue.use(VueI18n);
Vue.use(iView);

const i18n = new VueI18n({
  locale: "en",
  messages: {
    en: { ...en, ...localeEn },
    zh: { ...zh, ...localeZh },
  },
});

setI18n(i18n);

new Vue({
  router,
  store,
  render: (h) => h(App),
  i18n,
}).$mount("#app");

Han.init();
