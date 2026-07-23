<script lang="ts">
import { defineComponent } from "vue";
import { SettingSchema } from "../zod.ts";
import { baseURL, checkFetch, generalError, getSetting, successMessage } from "../app.js";
import { ScrollMode } from "@coderline/alphatab";

export default defineComponent({
    computed: {
        ScrollMode() {
            return ScrollMode;
        },
    },
    data() {
        return {
            setting: {
                scoreColor: "",
                noteColor: "",
                cursor: "",
                scoreStyle: "",
                groupByArtist: false,
                showKeySignature: false,
                scrollMode: "",
                scale: 1,
                toolbarAutoHide: false,
            },
            isProcessing: false,
        };
    },
    mounted() {
        this.setting = getSetting();
    },
    methods: {
        /**
         * Load the setting from the server
         */
        async loadFromServer() {
            const ok = window.confirm("This will overwrite your local settings. Are you sure?");
            if (!ok) {
                return;
            }

            try {
                this.isProcessing = true;
                const res = await fetch(baseURL + `/api/settings`, {
                    credentials: "include",
                });
                await checkFetch(res);
                const data = await res.json();
                const serverSetting = data.setting || {};
                const parsed = SettingSchema.parse(serverSetting);
                this.setting = parsed;
                localStorage.setItem("userSetting", JSON.stringify(parsed));
                successMessage("Settings loaded from server");
            } catch (e) {
                generalError(e);
            } finally {
                this.isProcessing = false;
            }
        },

        /**
         * Save the current setting to the server.
         */
        async saveToServer() {
            const ok = window.confirm("This will overwrite the settings stored on the server. Are you sure?");
            if (!ok) {
                return;
            }

            try {
                this.isProcessing = true;
                const parsedSetting = SettingSchema.parse(this.setting);
                const res = await fetch(baseURL + `/api/settings`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(parsedSetting),
                });
                await checkFetch(res);
                successMessage("Settings saved to server");
            } catch (e) {
                generalError(e);
            } finally {
                this.isProcessing = false;
            }
        },

        /**
         * Reset local/client settings to default values
         */
        async resetToDefault() {
            const ok = window.confirm("Are you sure you want to reset your local settings? This will not affect the settings stored on the server.");
            if (!ok) {
                return;
            }

            try {
                const defaults = SettingSchema.parse({});
                this.setting = defaults;
                localStorage.setItem("userSetting", JSON.stringify(defaults));
                successMessage("Reset to default settings successfully");
            } catch (e) {
                generalError(e);
            }
        },
    },
    watch: {
        setting: {
            handler(newSetting) {
                const parsedSetting = SettingSchema.parse(newSetting);
                localStorage.setItem("userSetting", JSON.stringify(parsedSetting));
            },
            deep: true,
        },
    },
});
</script>

<template>
    <div class="container my-container">
        <h1 class="mb-3">{{ $t('settings.settings') }}</h1>

        <h2 class="mt-4 mb-4">{{ $t('settings.tabPlayer') }}</h2>

        <!--     scoreStyle: z.enum(["tab", "score-tab", "score"]).default("tab"), -->
        <div class="mb-3">
            <label for="scoreStyle" class="form-label">{{ $t('settings.style') }}</label>
            <select id="scoreStyle" class="form-select" v-model="setting.scoreStyle">
                <option value="tab">{{ $t('settings.tab') }}</option>
                <option value="score">{{ $t('settings.score') }}</option>
                <option value="score-tab">{{ $t('settings.tabAndScore') }}</option>
                <option value="horizontal-tab">{{ $t('settings.horizontalTab') }}</option>
            </select>
        </div>

        <!-- Score Color Dropdown -->
        <div class="mb-3">
            <label for="scoreColor" class="form-label">{{ $t('settings.tabScoreColor') }}</label>
            <select id="scoreColor" class="form-select" v-model="setting.scoreColor">
                <option value="light">{{ $t('settings.light') }}</option>
                <option value="dark">{{ $t('settings.dark') }}</option>
            </select>
        </div>

        <!-- Tab/Score Display Scale -->
        <div class="mb-3">
            <label for="scale" class="form-label">{{ $t('settings.displayScale') }}</label>
            <select id="scale" class="form-select" v-model.number="setting.scale">
                <option :value="0.8">80%</option>
                <option :value="1">100%</option>
                <option :value="1.1">110%</option>
                <option :value="1.2">120%</option>
                <option :value="1.3">130%</option>
                <option :value="1.4">140%</option>
                <option :value="1.5">150%</option>
                <option :value="2">200%</option>
                <option :value="3">300%</option>
            </select>
        </div>

        <!-- Scroll Mode -->
        <div class="mb-3">
            <label for="scrollMode" class="form-label">
                {{ $t('settings.scroll') }}
                <span v-if='setting.scoreStyle === "horizontal-tab"'>{{ $t('settings.forceSmoothScroll') }}</span>
            </label>
            <select id="scrollMode" class="form-select" v-model="setting.scrollMode" :disabled='setting.scoreStyle === "horizontal-tab"'>
                <option :value="ScrollMode.Continuous">{{ $t('settings.scroll') }}</option>
                <option :value="ScrollMode.Off">{{ $t('settings.off') }}</option>
                <option :value="ScrollMode.Smooth">{{ $t('settings.smoothScroll') }}</option>
            </select>
        </div>

        <!-- Show Key Signature -->
        <div class="mb-3">
            <label for="showKeySignature" class="form-label">{{ $t('settings.showKeySignature') }}</label>
            <select id="showKeySignature" class="form-select" v-model="setting.showKeySignature">
                <option :value="true">{{ $t('common.yes') }}</option>
                <option :value="false">{{ $t('common.no') }}</option>
            </select>
        </div>

        <!-- Toolbar Auto-hide -->
        <div class="mb-3">
            <label for="toolbarAutoHide" class="form-label">{{ $t('settings.autoHideToolbar') }}</label>
            <select id="toolbarAutoHide" class="form-select" v-model="setting.toolbarAutoHide">
                <option :value="false">{{ $t('common.no') }}</option>
                <option :value="true">{{ $t('common.yes') }}</option>
            </select>
        </div>

        <h2 class="mt-5 mb-4">{{ $t('settings.assists') }}</h2>

        <!-- Note Color refer to SettingSchema   noteColor: z.enum(["rocksmith", "none"]).default("none"), -->
        <div class="mb-3">
            <label for="noteColor" class="form-label">{{ $t('settings.noteColor') }}</label>
            <select id="noteColor" class="form-select" v-model="setting.noteColor">
                <option value="none">{{ $t('settings.noColor') }}</option>
                <option value="rocksmith">{{ $t('settings.rocksmithColor') }}</option>
                <option value="louis-bass-v">{{ $t('settings.louisBassColor') }}</option>
            </select>
        </div>

        <!--     cursor: z.enum(["animated", "instant", "bar", "invisible"]).default("animated"),-->
        <div class="mb-3">
            <label for="cursor" class="form-label">{{ $t('settings.cursorStyle') }}</label>
            <select id="cursor" class="form-select" v-model="setting.cursor">
                <option value="invisible">{{ $t('settings.noCursor') }}</option>
                <option value="animated">{{ $t('settings.cursorSmooth') }}</option>
                <option value="instant">{{ $t('settings.cursorInstant') }}</option>
                <option value="bar">{{ $t('settings.bar') }}</option>
            </select>
        </div>

        <p class="text-secondary">{{ $t('settings.cursorInstantTip') }}</p>

        <h2 class="mt-5 mb-4">{{ $t('settings.tabList') }}</h2>

        <!-- Group by artist -->
        <div class="mb-3">
            <label for="groupByArtist" class="form-label">{{ $t('settings.groupTabsByArtist') }}</label>
            <select id="groupByArtist" class="form-select" v-model="setting.groupByArtist">
                <option :value="false">{{ $t('common.no') }}</option>
                <option :value="true">{{ $t('common.yes') }}</option>
            </select>
        </div>

        <h2 class="mt-5 mb-4">{{ $t('settings.others') }}</h2>

        <div class="mb-3">
            <label class="form-label">{{ $t('settings.loadSaveSettings') }}</label>

            <div class="d-flex gap-2">
                <button class="btn btn-secondary" :disabled="isProcessing" @click.prevent="loadFromServer">{{ $t('settings.loadFromServer') }}</button>
                <button class="btn btn-secondary" :disabled="isProcessing" @click.prevent="saveToServer">{{ $t('settings.saveToServer') }}</button>
                <button class="btn btn-danger" :disabled="isProcessing" @click.prevent="resetToDefault">{{ $t('settings.resetLocal') }}</button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
</style>
