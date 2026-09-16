<template>
  <div>
    <h2 style="margin-bottom:24px">
      {{ $t("courseResources") }}
      <Button
        type="primary"
        icon="logo-github"
        style="margin-left:12px"
        to="https://github.com/SDUBigDataCourse/resources"
        target="_blank"
        >Github</Button
      >

    </h2>
    <Table
      :columns="columns"
      :data="files"
      stripe
      :no-data-text="$t('fetching')"
    >
      <template slot-scope="{ row }" slot="url">
        <a :href="row.download_url">{{ row.download_url }}</a>
      </template>
    </Table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      files: [],
    };
  },
  computed: {
    columns() {
      return [
        { title: this.$t("fileName"), key: "name" },
        { title: this.$t("url"), key: "download_url", slot: "url" },
      ];
    },
  },
  async mounted() {
    const res = await (await fetch(
      "https://api.github.com/repos/sdubigdatacourse/resources/contents/"
    )).json();
    this.$set(
      this,
      "files",
      res.filter((file) => file.type === "file" && !file.name.startsWith("."))
    );
  },
};
</script>
