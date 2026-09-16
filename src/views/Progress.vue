<template>
  <div>
    <h2 style="margin-bottom: 24px">{{ $t("resultList") }}</h2>
    <Card
      v-for="classroom in classrooms"
      :key="classroom.id"
      :title="
        ($i18n.locale == 'en' ? classroom.enName : classroom.name) ||
        classroom.name
      "
      style="margin-top: 12px"
    >
      <p v-if="!classroom.repos.length">{{ $t("noResult") }}</p>
      <Collapse accordion>
        <Panel
          v-for="repo in classroom.repos"
          :key="repo.name"
          :name="repo.name"
        >
          {{ ($i18n.locale == "en" ? repo.enName : repo.name) || repo.name }}
          <div slot="content" v-if="repo.markdown">
            <component :is="repo.markdown" class="markdown-body" />
          </div>
        </Panel>
      </Collapse>
    </Card>
  </div>
</template>

<script>
import { mapState } from "vuex";
import "github-markdown-css";

export default {
  computed: mapState(["classrooms"]),
};
</script>
