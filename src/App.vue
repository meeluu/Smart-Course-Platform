<template>
  <div id="app">
    <Layout>
      <Header style="background:#2d8cf0;user-select:none">
        <div style="display:flex;flex-direction:row">
          <h1 style="flex-grow:1;color:white">{{ $t("bigdataTitle") }}</h1>
          <Menu mode="horizontal" theme="primary" active-name="1">
            <MenuItem name="1" to="/">
              <Icon type="ios-home" />{{ $t("homePage") }}
            </MenuItem>
            <MenuItem name="2" to="projects">
              <Icon type="ios-list-box" />{{ $t("projectList") }}
            </MenuItem>
            <MenuItem name="3" to="progress">
              <Icon type="ios-code-working" />{{ $t("resultList") }}
            </MenuItem>
            <!-- <MenuItem name="4" to="resources">
              <Icon type="ios-analytics" />{{ $t("courseResources") }}
            </MenuItem> -->
            <MenuItem name="5" to="classroom">
              <Icon type="ios-book" />{{ $t("courseEntries") }}
            </MenuItem>
            <MenuItem name="0">
              <span
                @click="
                  $root.$i18n.locale = $root.$i18n.locale == 'en' ? 'zh' : 'en'
                "
                style="display:inline-block;height:100%"
              >
                <Icon type="ios-globe-outline" />{{
                  $i18n.locale == "en" ? "Chinese" : "English"
                }}
              </span>
            </MenuItem>
          </Menu>
        </div>
      </Header>
      <Content
        style="padding:48px;min-height:calc(100vh - 133px);margin:0 auto;max-width:1440px;width:100%;background:white"
      >
        <router-view />
      </Content>
      <Footer>
        <div>
          <span style="float:left">&copy;{{ year }} {{ $t("location") }}</span>
          <a style="float:right" href="https://github.com/SDUBigDataCourse"
            ><Icon type="logo-github" />Github</a
          >
        </div>
      </Footer>
    </Layout>
  </div>
</template>

<script>
export default {
  data() {
    return {
      year: 2020,
    };
  },
  mounted() {
    this.$set(this, "year", new Date().getFullYear());
  },
};
</script>

<style>
#app {
  min-width: 1250px;
}
</style>
