<template>
  <div id="datetoday">{{date}}</div>
</template>

<script>
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { reactive, onMounted, toRefs } from "vue";
export default {
  name: "datetoday",
  setup() {
    const today = reactive({ date: "" });

    function todaysdate() {
      dayjs.extend(timezone);
      dayjs.extend(utc);
      today.date = dayjs().tz("Asia/Kathmandu").format("MMMM D, dddd");
      return today.date;
    }

    onMounted(() => setInterval(todaysdate, 1000));
    return { ...toRefs(today) };
  },
};
</script>