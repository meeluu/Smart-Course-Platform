<template>
  <div style="width:100%">
    <h2 style="margin-bottom:24px">{{ $t("projectList") }}</h2>
    <Collapse accordion simple>
      <Panel
        v-for="project in mergedProjects"
        :key="project.id"
        class="project-panel"
      >
        <div
          style="position:absolute;width:100%;height:100%;top:0;display:flex;justify-content:start;align-items:center"
        >
<!--          <div-->
<!--            :style="{ backgroundImage: `url(${project.thumbnail})` }"-->
<!--            style="position:absolute;width:100%;height:100%;color:white;background-position:center center; background-size:cover;filter:blur(10px) brightness(0.5)"-->
<!--          ></div>-->
          <p
            style="color:black;z-index:6;font-size:36px;font-weight:700;margin-left:48px"
          >
            {{ project.name }}
          </p>
        </div>
        <div slot="content" style="padding:12px">
          <component :is="project.markdown" class="markdown-body" />
        </div>
      </Panel>
    </Collapse>
  </div>
</template>

<script>
import { mapState } from "vuex";
import "github-markdown-css";

export default {
  computed: {
    ...mapState(["projects", "previousProjects"]),
    mergedProjects() {
      return [...this.projects, ...this.previousProjects];
    },
  },
};
</script>

<style>
.project-panel .ivu-collapse-header {
  height: 200px !important;
}

.project-panel .ivu-collapse-header .ivu-icon {
  display: none;
}
</style>
