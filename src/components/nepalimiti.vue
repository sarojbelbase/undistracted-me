<template>
  <div id="nepalimiti">{{miti}}</div>
</template>

<script>
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import mitibar from "@/utils/nepali";
import { reactive, onMounted, toRefs } from "vue";
export default {
  name: "nepalimiti",
  setup() {
    const nepali = reactive({ miti: "" });

    function ajakodate() {
      dayjs.extend(utc);
      dayjs.extend(timezone);
      let year = dayjs().tz("Asia/Kathmandu").format("YYYY");
      let month = dayjs().tz("Asia/Kathmandu").format("M");
      let day = dayjs().tz("Asia/Kathmandu").format("D");
      nepali.miti = mitibar(year, month, day);
      return nepali.miti;
    }

    onMounted(() => setInterval(ajakodate, 1000));
    return { ...toRefs(nepali) };
  },
};
</script>