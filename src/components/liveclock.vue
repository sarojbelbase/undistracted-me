<template>
  <div id="liveclock">{{clock}}</div>
</template>

<script>
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { reactive, onMounted, toRefs } from "vue";
export default {
  name: "livetime",
  setup() {
    const live = reactive({ clock: "" });

    function liveclock() {
      dayjs.extend(timezone);
      dayjs.extend(utc);
      live.clock = dayjs().tz("Asia/Kathmandu").format("HH.mm.ss");
      return live.clock;
    }

    onMounted(() => setInterval(liveclock, 1000));
    return { ...toRefs(live) };
  },
};
</script>