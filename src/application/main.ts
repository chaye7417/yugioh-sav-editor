import { ToastPlugin, VBModalPlugin, VBTogglePlugin } from "bootstrap-vue";
import { createPinia, PiniaVuePlugin } from "pinia";
import Vue from "vue";
import App from "./App.vue";
import "./styles/main.scss";

Vue.config.productionTip = false;

Vue.use(PiniaVuePlugin);
const pinia = createPinia();

Vue.use(ToastPlugin);
Vue.use(VBModalPlugin);
Vue.use(VBTogglePlugin);

new Vue({
	render: (h) => h(App),
	// @ts-ignore FIXME after vue 3 migration
	pinia,
}).$mount("#deckToolApplication");
