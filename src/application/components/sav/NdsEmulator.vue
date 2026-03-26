<template>
  <div class="nds-emulator">
    <!-- 未启动时显示说明 -->
    <div v-if="!started" class="nds-emulator__intro">
      <div class="nds-emulator__icon">🎮</div>
      <h2>NDS 模拟器</h2>
      <p>在浏览器中直接运行游戏，测试你编辑的存档</p>
      <p v-if="savBuffer" class="nds-emulator__sav-ready">
        ✅ 已检测到编辑中的存档，启动后将自动加载
      </p>
      <p v-else class="nds-emulator__sav-none">
        ⚠️ 尚未加载存档，将以新游戏启动
      </p>
      <button class="btn btn-primary btn-lg" @click="startEmulator">
        启动游戏
      </button>
      <p class="nds-emulator__hint">
        首次加载需下载约 3MB 模拟器核心 + 268MB ROM
      </p>
    </div>

    <!-- 下载进度 -->
    <div v-if="loading" class="nds-emulator__loading">
      <div class="nds-emulator__icon">🎮</div>
      <h2>正在下载 ROM...</h2>
      <div class="nds-emulator__progress-bar">
        <div class="nds-emulator__progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <p>{{ progressPercent }}% — {{ loadedMB }} / {{ totalMB }} MB</p>
    </div>

    <!-- 模拟器容器 -->
    <div v-show="started && !loading" id="emulator-container" class="nds-emulator__player"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, type PropType, onBeforeUnmount } from "vue";

export default defineComponent({
  name: "NdsEmulator",
  props: {
    savBuffer: {
      type: Object as PropType<ArrayBuffer | null>,
      default: null,
    },
  },
  setup(props) {
    const started = ref(false);
    const loading = ref(false);
    const progressPercent = ref(0);
    const loadedMB = ref("0");
    const totalMB = ref("0");
    let romBlobUrl: string | null = null;
    let savBlobUrl: string | null = null;

    async function startEmulator(): Promise<void> {
      started.value = true;
      loading.value = true;

      // 加载 ROM（带进度）
      const romUrl = `${import.meta.env.BASE_URL}rom/wc2009.nds`;
      const romResp = await fetch(romUrl);
      if (!romResp.ok) {
        alert("ROM 加载失败，请确认 ROM 文件已部署");
        started.value = false;
        loading.value = false;
        return;
      }

      const contentLength = romResp.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 268435456;
      totalMB.value = (total / 1024 / 1024).toFixed(0);

      const reader = romResp.body!.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        progressPercent.value = Math.round((received / total) * 100);
        loadedMB.value = (received / 1024 / 1024).toFixed(0);
      }

      const romBuffer = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        romBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const romBlob = new Blob([romBuffer]);
      romBlobUrl = URL.createObjectURL(romBlob);

      // 配置 EmulatorJS
      (window as any).EJS_player = "#emulator-container";
      (window as any).EJS_core = "desmume";
      (window as any).EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
      (window as any).EJS_gameUrl = romBlobUrl;
      (window as any).EJS_gameName = "游戏王5Ds WC2009";
      (window as any).EJS_color = "#2c3e50";

      // 如果有存档
      if (props.savBuffer) {
        const savBlob = new Blob([props.savBuffer]);
        savBlobUrl = URL.createObjectURL(savBlob);
        (window as any).EJS_gameSaveUrl = savBlobUrl;
      }

      loading.value = false;

      // 加载 loader.js
      const script = document.createElement("script");
      script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
      document.head.appendChild(script);
    }

    onBeforeUnmount(() => {
      if (romBlobUrl) URL.revokeObjectURL(romBlobUrl);
      if (savBlobUrl) URL.revokeObjectURL(savBlobUrl);
    });

    return { started, loading, progressPercent, loadedMB, totalMB, startEmulator };
  },
});
</script>

<style scoped lang="scss">
.nds-emulator {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;

  &__intro, &__loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #ccc;
    gap: 0.5rem;

    h2 {
      color: #fff;
      margin: 0;
    }

    p {
      margin: 0;
      font-size: 0.9rem;
    }
  }

  &__icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  &__sav-ready {
    color: #4caf50;
  }

  &__sav-none {
    color: #ff9800;
  }

  &__hint {
    color: #888;
    font-size: 0.8rem !important;
    margin-top: 1rem !important;
  }

  &__progress-bar {
    width: 320px;
    height: 12px;
    background: #333;
    border-radius: 6px;
    overflow: hidden;
    margin: 0.5rem 0;
  }

  &__progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3f88c5, #4caf50);
    border-radius: 6px;
    transition: width 0.2s;
  }

  &__player {
    flex: 1;
    width: 100%;
  }
}
</style>
