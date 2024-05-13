<template>
  <div id="homescreen">
    <div class="this-area container">
      <div class="mx-auto text-center row">
        <div class="col">
          <nepalimiti />
        </div>
      </div>
      <div class="mx-auto text-center row">
        <div class="col">
          <liveclock />
        </div>
      </div>
      <div class="mx-auto text-center row">
        <div class="col">
          <datetoday />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import datetoday from "@/components/datetoday";
import liveclock from "@/components/liveclock";
import nepalimiti from "@/components/nepalimiti";
export default {
  name: "main",
  components: {
    datetoday,
    liveclock,
    nepalimiti,
  },
};
</script>

<style>
@import url("../src/assets/css/fonts.css");

html,
body {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -webkit-user-drag: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.004);
  font-display: fallback !important;
}

#homescreen {
  background: linear-gradient(#161819, #2e2b28, #363230);
  background-position: center;
  background-size: cover;
  height: 100vh;
  animation-duration: 1s;
  animation-name: highres;
  animation-fill-mode: forwards;
}

.this-area {
  font-family: "Saira Extra Condensed", sans-serif;
  color: #e1e0e4;
  text-transform: uppercase;
  line-height: 1 !important;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  animation-duration: 1s;
  animation-delay: 0.6s;
  animation-name: bounce;
}

.this-area #nepalimiti {
  font-weight: 700;
  font-size: 9vw;
}

.this-area #datetoday {
  font-weight: 700;
  font-size: 6vw;
}

.this-area #liveclock {
  font-weight: 500;
  font-size: 12vw;
}

@keyframes bounce {
  from {
    transform: scale(0.5);
    transition: ease-in;
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
    transition: ease-out;
  }
}

@keyframes highres {
  from {
    background: linear-gradient(#313233, #161819);
    transition: ease-in;
  }

  to {
    background-image: url(assets/img/bg.webp);
    transition: ease-out;
  }
}
</style>