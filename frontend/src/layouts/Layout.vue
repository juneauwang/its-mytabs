<script setup lang="ts">
import { useRoute } from "vue-router";
import { Notifications } from "@kyvg/vue3-notification";
import { computed, ref } from "vue";
import { currentLocale as getInitialLocale } from "../i18n.ts";
const route = useRoute();

// @ts-ignore
const version = ref(appVersion);
const hideFooter = computed(() => route.meta?.hideFooter);
const currentLocale = ref(getInitialLocale());

function switchLang(locale: string) {
    localStorage.locale = locale;
    location.reload();
}
</script>

<template>
    <div>
        <!-- Add :key to disable vue router re-use the same component -->
        <router-view :key="route.fullPath" />

        <footer v-if="!hideFooter" class="my-5">
            <div class="lang-switcher">
                <button
                    class="btn btn-sm"
                    :class="currentLocale === 'zh-CN' ? 'btn-primary' : 'btn-outline-light'"
                    @click="switchLang('zh-CN')"
                >
                    中文
                </button>
                <button
                    class="btn btn-sm"
                    :class="currentLocale === 'en' ? 'btn-primary' : 'btn-outline-light'"
                    @click="switchLang('en')"
                >
                    English
                </button>
            </div>
            It's MyTabs
            <span class="version me-3">{{ version }}</span>
            <a href="https://github.com/louislam/its-mytabs" target="_blank">GitHub</a>
        </footer>

        <notifications position="bottom right" />
    </div>
</template>

<style lang="scss" scoped>
@import "../styles/vars.scss";

footer {
    text-align: center;
    font-size: 0.9rem;
    color: $color2-dark;

    a {
        color: $color2-dark;
    }
}

.lang-switcher {
    display: inline-flex;
    gap: 4px;
    margin-right: 12px;

    .btn {
        font-size: 0.8rem;
        padding: 2px 8px;
    }
}
</style>
