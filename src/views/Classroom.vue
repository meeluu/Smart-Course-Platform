<template>
  <div>
    <h2 style="margin-bottom: 24px">
      {{ $t("courseEntries") }} {{ $t("courseEntriesHint") }}
    </h2>
    <Button
      v-for="classroom in classrooms"
      :key="classroom.id"
      :to="classroom.entry"
      target="_blank"
      style="margin-right: 8px"
      >{{
        ($i18n.locale == "en" ? classroom.enName : classroom.name) ||
        classroom.name
      }}</Button
    >
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  computed: mapState(["classrooms"]),
};
</script>
