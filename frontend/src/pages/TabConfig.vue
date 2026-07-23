<script>
import { defineComponent } from "vue";
import { baseURL, checkFetch, convertAlphaTexSyncPoint, generalError } from "../app.js";
import { notify } from "@kyvg/vue3-notification";
import Vue3Dropzone from "@jaxtheprime/vue3-dropzone";
import { supportedAudioFormatCommaString, supportedFormatCommaString } from "../../../backend/common.js";
import SyncOptions from "../components/SyncOptions.vue";
import { FontAwesomeIcon } from "../icon.ts";

const alphaTab = await import("@coderline/alphatab");

export default defineComponent({
    components: { SyncOptions, Vue3Dropzone, FontAwesomeIcon },
    data() {
        return {
            tabID: -1,
            tab: {},
            page: "",
            youtubeURL: "",
            youtubeList: [],
            bilibiliURL: "",
            bilibiliList: [],
            audioList: [],
            // isLocalIP: false,
            supportedFormatCommaString,
            supportedAudioFormatCommaString,
            filePath: "",
            tabFiles: [],
            audioFiles: [],
            isLoading: true,
            isUploading: false,
            showOpenButtons: false,
        };
    },
    async mounted() {
        this.tabID = this.$route.params.id;
        this.page = this.$route.path.split("/").pop();

        try {
            await this.load();
        } catch (e) {
            generalError(e);
        }

        //this.isLocalIP = !!isPrivateIP(window.location.hostname);
    },
    methods: {
        async load() {
            this.isLoading = true;
            try {
                const res = await fetch(baseURL + `/api/tab/${this.tabID}`, {
                    credentials: "include",
                });
                await checkFetch(res);
                const data = await res.json();
                this.tab = data.tab;
                this.youtubeList = data.youtubeList;
                this.bilibiliList = data.bilibiliList;
                this.audioList = data.audioList;
                this.filePath = data.filePath;
                this.showOpenButtons = data.showOpenButtons;
            } finally {
                this.isLoading = false;
            }
        },

        async submitInfo() {
            try {
                const tabID = this.$route.params.id;
                const res = await fetch(baseURL + `/api/tab/${tabID}`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: this.tab.title,
                        artist: this.tab.artist,
                        public: this.tab.public,
                    }),
                });

                await checkFetch(res);

                notify({
                    text: "Tab info updated successfully",
                    type: "success",
                });
            } catch (e) {
                generalError(e);
            }
        },
        async addYoutube() {
            try {
                // Validate URL
                const url = this.youtubeURL;

                const obj = new URL(url);

                if (obj.hostname !== "www.youtube.com" && obj.hostname !== "music.youtube.com") {
                    throw new Error("Invalid YouTube URL");
                }

                // Get ?v
                const videoID = obj.searchParams.get("v");
                if (!videoID) {
                    throw new Error("Invalid YouTube URL, no ?v= params?");
                }

                // Send to api (/tab/:id/youtube)
                const tabID = this.tab.id;

                const res = await fetch(baseURL + `/api/tab/${tabID}/youtube`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        videoID,
                    }),
                });

                await checkFetch(res);
                this.youtubeURL = "";

                await this.load();
            } catch (e) {
                generalError(e);
            }
        },

        async saveYoutube(video) {
            let res;
            try {
                const tabID = this.tab.id;
                res = await fetch(baseURL + `/api/tab/${tabID}/youtube/${video.videoID}`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        syncMethod: video.syncMethod,
                        simpleSync: video.simpleSync,
                        advancedSync: video.advancedSync,
                    }),
                });

                await checkFetch(res);

                notify({
                    text: "YouTube video updated successfully",
                    type: "success",
                });
            } catch (e) {
                generalError(e);
            }
        },

        async removeYoutube(video) {
            try {
                if (!confirm("Are you sure you want to remove this YouTube video?")) {
                    return;
                }

                const tabID = this.tab.id;

                const res = await fetch(baseURL + `/api/tab/${tabID}/youtube/${video.videoID}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                await checkFetch(res);

                notify({
                    text: "YouTube video removed successfully",
                    type: "success",
                });

                await this.load();
            } catch (e) {
                generalError(e);
            }
        },

        async addBilibili() {
            try {
                const url = this.bilibiliURL.trim();
                if (!url) {
                    throw new Error("Please enter a Bilibili URL or BV号");
                }

                // Send to api (/tab/:id/bilibili)
                const tabID = this.tab.id;

                const res = await fetch(baseURL + `/api/tab/${tabID}/bilibili`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        url,
                    }),
                });

                await checkFetch(res);

                notify({
                    text: "Bilibili video added. Downloading...",
                    type: "info",
                });

                this.bilibiliURL = "";

                await this.load();

                notify({
                    text: "Bilibili video downloaded and ready!",
                    type: "success",
                });
            } catch (e) {
                generalError(e);
            }
        },

        async saveBilibili(bvideo) {
            let res;
            try {
                const tabID = this.tab.id;
                res = await fetch(baseURL + `/api/tab/${tabID}/bilibili/${bvideo.bvid}`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        syncMethod: bvideo.syncMethod,
                        simpleSync: bvideo.simpleSync,
                        advancedSync: bvideo.advancedSync,
                    }),
                });

                await checkFetch(res);

                notify({
                    text: "Bilibili video updated successfully",
                    type: "success",
                });
            } catch (e) {
                generalError(e);
            }
        },

        async removeBilibili(bvideo) {
            try {
                if (!confirm("Are you sure you want to remove this Bilibili video? The downloaded file will also be deleted.")) {
                    return;
                }

                const tabID = this.tab.id;

                const res = await fetch(baseURL + `/api/tab/${tabID}/bilibili/${bvideo.bvid}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                await checkFetch(res);

                notify({
                    text: "Bilibili video removed successfully",
                    type: "success",
                });

                await this.load();
            } catch (e) {
                generalError(e);
            }
        },

        async uploadTab() {
            this.isUploading = true;
            try {
                if (this.tabFiles.length === 0) {
                    throw new Error("Please select a file to upload");
                }

                const file = this.tabFiles[0].file;

                // Try to parse the file with AlphaTab to ensure it's valid
                const data = await file.arrayBuffer();

                const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(
                    new Uint8Array(data),
                    new alphaTab.Settings(),
                );

                const formData = new FormData();
                formData.append("file", file);

                const response = await fetch(baseURL + `/api/tab/${this.tabID}/replace`, {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                });

                await checkFetch(response);
                notify({
                    text: "Tab file uploaded and replaced successfully",
                    type: "success",
                });
                this.$router.push(`/tab/${this.tabID}`);
            } catch (error) {
                notify({
                    text: error.message,
                    type: "error",
                });
            } finally {
                this.isUploading = false;
            }
        },

        async uploadAudio() {
            this.isUploading = true;
            try {
                if (this.audioFiles.length === 0) {
                    throw new Error("Please select a file to upload");
                }

                const file = this.audioFiles[0].file;
                const formData = new FormData();
                formData.append("file", file);

                const response = await fetch(baseURL + `/api/tab/${this.tabID}/audio`, {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                });

                await checkFetch(response);
                notify({
                    text: "Upload audio successfully",
                    type: "success",
                });
                this.$refs.audioDropzone.clearFiles();
                await this.load();
            } catch (error) {
                notify({
                    text: error.message,
                    type: "error",
                });
            } finally {
                this.isUploading = false;
            }
        },

        async saveAudio(audio) {
            let res;
            try {
                const tabID = this.tab.id;
                const encoded = encodeURIComponent(audio.filename);
                res = await fetch(baseURL + `/api/tab/${tabID}/audio/${encoded}`, {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        syncMethod: audio.syncMethod,
                        simpleSync: audio.simpleSync,
                        advancedSync: audio.advancedSync,
                    }),
                });

                await checkFetch(res);

                notify({
                    text: "Updated successfully",
                    type: "success",
                });
            } catch (e) {
                generalError(e);
            }
        },

        async removeAudio(audio) {
            try {
                if (!confirm("Are you sure you want to remove this audio file?")) {
                    return;
                }

                const tabID = this.tab.id;
                const encoded = encodeURIComponent(audio.filename);

                const res = await fetch(baseURL + `/api/tab/${tabID}/audio/${encoded}`, {
                    method: "DELETE",
                    credentials: "include",
                });

                await checkFetch(res);

                notify({
                    text: "The audio file has been removed successfully",
                    type: "success",
                });

                await this.load();
            } catch (e) {
                generalError(e);
            }
        },

        dropzoneError(err) {
            console.log(err);
            let error = err.type;
            notify({
                text: error,
                type: "error",
            });
        },

        getAudioURL(tabID, filename) {
            return baseURL + `/api/tab/${tabID}/audio/${encodeURIComponent(filename)}`;
        },

        async openFolder() {
            try {
                const res = await fetch(baseURL + `/api/tab/${this.tabID}/open-folder`, {
                    method: "POST",
                    credentials: "include",
                });
                await checkFetch(res);
                notify({ text: "Opened folder in file manager", type: "success" });
            } catch (e) {
                notify({ text: e.message || e, type: "error" });
            }
        },

        async openExternal() {
            try {
                const res = await fetch(baseURL + `/api/tab/${this.tabID}/open-external`, {
                    method: "POST",
                    credentials: "include",
                });
                await checkFetch(res);
                notify({ text: "Opened with external application", type: "success" });
            } catch (e) {
                notify({ text: e.message || e, type: "error" });
            }
        },
    },
});
</script>

<template>
    <div class="my-container container" v-if="!isLoading">
        <div class="mt-4 mb-4">
            <router-link :to="`/tab/${tab.id}`" class="btn btn-primary">
                <font-awesome-icon :icon='["fas", "arrow-left"]' />
                {{ $t('tabConfig.backToTab') }}
            </router-link>

            <button class="btn btn-secondary ms-2" @click.prevent="openFolder" v-if="showOpenButtons">
                <font-awesome-icon :icon='["fas", "folder"]' />
                {{ $t('tabConfig.openFolder') }}
            </button>

            <button class="btn btn-secondary ms-2" @click.prevent="openExternal" v-if="showOpenButtons">
                <font-awesome-icon :icon='["fas", "file"]' />
                {{ $t('tabConfig.editWithExternal') }}
            </button>

            <div class="mt-3">
                {{ $t('tabConfig.editing') }} {{ tab.artist }} - {{ tab.title }}
            </div>
        </div>

        <div class="menu">
            <div class="btn-group" role="group">
                <router-link :to="`/tab/${tab.id}/edit/info`" class="btn btn-secondary">{{ $t('common.info') }}</router-link>
                <router-link :to="`/tab/${tab.id}/edit/audio`" class="btn btn-secondary">{{ $t('tabConfig.youtubeAndAudio') }}</router-link>
                <router-link :to="`/tab/${tab.id}/edit/tab-file`" class="btn btn-secondary">{{ $t('tabConfig.tabFile') }}</router-link>
            </div>
        </div>

        <!-- Info Page -->
        <div v-if='this.page === "info"'>
            <h2 class="mt-4 mb-4">{{ $t('common.info') }}</h2>
            <form>
                <!-- Tab Name -->
                <div class="mb-3">
                    <label for="tabName" class="form-label">{{ $t('common.name') }}</label>
                    <input type="text" class="form-control" id="tabName" v-model="tab.title">
                </div>

                <!-- Artist -->
                <div class="mb-3">
                    <label for="tabArtist" class="form-label">{{ $t('common.artist') }}</label>
                    <input type="text" class="form-control" id="tabArtist" v-model="tab.artist">
                </div>

                <!-- Public (Dropdown) -->
                <div class="mb-3">
                    <label for="tabPublic" class="form-label">{{ $t('tabConfig.shareToPublic') }}</label>
                    <select class="form-control" id="tabPublic" v-model="tab.public">
                        <option :value="false">{{ $t('tabConfig.private') }}</option>
                        <option :value="true">{{ $t('tabConfig.public') }}</option>
                    </select>
                </div>

                <!-- Save -->
                <button type="submit" class="btn btn-primary me-2" @click.prevent="submitInfo()">{{ $t('common.save') }}</button>
            </form>
        </div>

        <!-- Audio Page -->
        <div v-else-if='this.page === "audio"'>
            <h3 class="mt-4 mb-2">{{ $t('tabConfig.youtube') }}</h3>

            <!-- Show alert if using a local ip -->
            <div class="alert alert-info mt-3" role="alert">
                {{ $t('tabConfig.youtubePrivateIpTip') }}
            </div>

            <div class="mb-3">
                <label for="basic-url" class="form-label">{{ $t('tabConfig.youtubeUrl') }}</label>
                <div class="input-group">
                    <input type="text" class="form-control" id="basic-url" placeholder="" v-model="youtubeURL">
                    <button class="btn btn-primary" type="button" @click.prevent="addYoutube()">{{ $t('tabConfig.add') }}</button>
                </div>
            </div>

            <div class="mb-4">
                <!-- Youtube Item -->
                <div v-for="video in youtubeList" :key="video.id" class="mb-3 pb-5 youtube-item">
                    <iframe
                        width="355"
                        height="200"
                        :src="`https://www.youtube.com/embed/${video.videoID}`"
                        title="YouTube video player"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                    ></iframe>

                    <div class="info">
                        <div class="mb-3">
                            <strong>{{ $t('tabConfig.videoId') }}</strong> <a :href="`https://www.youtube.com/watch?v=${video.videoID}`" target="_blank">{{ video.videoID }}</a>
                        </div>

                        <SyncOptions
                            :syncMethod="video.syncMethod"
                            :simpleSync="video.simpleSync"
                            :advancedSync="video.advancedSync"
                            @update:syncMethod="video.syncMethod = $event"
                            @update:simpleSync="video.simpleSync = $event"
                            @update:advancedSync="video.advancedSync = $event"
                        />

                        <button class="btn btn-primary" @click.prevent="saveYoutube(video)">{{ $t('common.save') }}</button>
                    </div>

                    <div class="buttons">
                        <div class="btn-group">
                            <button class="btn btn-danger" @click="removeYoutube(video)">{{ $t('common.remove') }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <h3 class="mt-4 mb-2">{{ $t('tabConfig.bilibili') }}</h3>

            <div class="mb-3">
                <label for="bilibili-url" class="form-label">{{ $t('tabConfig.bilibiliUrlOrId') }}</label>
                <div class="input-group">
                    <input type="text" class="form-control" id="bilibili-url" placeholder="https://www.bilibili.com/video/BVxxx or just BVxxx" v-model="bilibiliURL">
                    <button class="btn btn-primary" type="button" @click.prevent="addBilibili()">{{ $t('tabConfig.addAndDownload') }}</button>
                </div>
                <div class="form-text">{{ $t('tabConfig.bilibiliDownloadTip') }}</div>
            </div>

            <div class="mb-4">
                <!-- Bilibili Item -->
                <div v-for="bvideo in bilibiliList" :key="bvideo.bvid" class="mb-3 pb-5 bilibili-item">
                    <div class="alert alert-info">
                        <strong>{{ $t('tabConfig.bvid') }}</strong> {{ bvideo.bvid }}
                        <a :href="`https://www.bilibili.com/video/${bvideo.bvid}`" target="_blank" class="ms-2">{{ $t('tabConfig.openInBilibili') }}</a>
                    </div>

                    <div class="info">
                        <SyncOptions
                            :syncMethod="bvideo.syncMethod"
                            :simpleSync="bvideo.simpleSync"
                            :advancedSync="bvideo.advancedSync"
                            @update:syncMethod="bvideo.syncMethod = $event"
                            @update:simpleSync="bvideo.simpleSync = $event"
                            @update:advancedSync="bvideo.advancedSync = $event"
                        />

                        <button class="btn btn-primary" @click.prevent="saveBilibili(bvideo)">{{ $t('common.save') }}</button>
                    </div>

                    <div class="buttons mt-2">
                        <div class="btn-group">
                            <button class="btn btn-danger" @click="removeBilibili(bvideo)">{{ $t('common.remove') }}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mb-5">
                <h3 class="mb-5">{{ $t('tabConfig.audioFiles') }}</h3>

                <div class="mb-5">
                    <div v-for="audio in audioList" class="audio-item mb-3 pb-3" :key="audio.id">
                        <div>
                            <div class="mb-2">
                                <audio :src="getAudioURL(tabID, audio.filename)" controls></audio>
                            </div>

                            <a :href="getAudioURL(tabID, audio.filename)" target="_blank">{{ audio.filename }}</a>
                        </div>
                        <div class="info">
                            <SyncOptions
                                :syncMethod="audio.syncMethod"
                                :simpleSync="audio.simpleSync"
                                :advancedSync="audio.advancedSync"
                                @update:syncMethod="audio.syncMethod = $event"
                                @update:simpleSync="audio.simpleSync = $event"
                                @update:advancedSync="audio.advancedSync = $event"
                            />
                            <button class="btn btn-primary" @click.prevent="saveAudio(audio)">{{ $t('common.save') }}</button>
                        </div>
                        <div class="buttons">
                            <div class="btn-group">
                                <button class="btn btn-danger" @click="removeAudio(audio)">{{ $t('common.remove') }}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <Vue3Dropzone
                    ref="audioDropzone"
                    v-model="audioFiles"
                    :maxFileSize="100"
                    @error="dropzoneError"
                >
                    <template #placeholder-img>&nbsp;
                    </template>
                    <template #title>
                        {{ $t('tabConfig.dropAudioHere') }}
                    </template>
                    <template #description>
                        {{ $t('tabConfig.audioFormats') }}
                    </template>
                </Vue3Dropzone>

                <button
                    @click="uploadAudio"
                    class="btn btn-primary w-100 mt-4"
                    :disabled="isUploading"
                >
                    {{ isUploading ? $t('common.uploading') : $t('common.upload') }}
                </button>
            </div>
        </div>

        <!-- Tab File Page -->
        <div v-else-if='this.page === "tab-file"' class="mb-5">
            <h2 class="mt-4 mb-4">{{ $t('tabConfig.methodDirectEdit') }}</h2>
            <p>
                {{ $t('tabConfig.directEditPathTip') }}<br />
                <strong>{{ filePath }}</strong>
            </p>

            <h2 class="mt-4 mb-4">{{ $t('tabConfig.methodUploadReplace') }}</h2>

            <Vue3Dropzone
                v-model="tabFiles"
                :maxFileSize="500"
                @error="dropzoneError"
            >
                <template #title>
                    {{ $t('tabConfig.dropTabHere') }}
                </template>
                <template #description>{{ $t('tabConfig.supports') }} {{ supportedFormatCommaString }}</template>
            </Vue3Dropzone>

            <button
                @click="uploadTab"
                class="btn btn-primary w-100 mt-4"
                :disabled="isUploading"
            >
                {{ isUploading ? $t('common.uploading') : $t('common.upload') }}
            </button>
        </div>
    </div>
</template>

<style scoped lang="scss">
.menu {
    display: flex;
    gap: 10px;

    a {
        //text-decoration: underline;
    }
}

.youtube-item, .audio-item {
    display: flex;
    gap: 15px;
    align-items: flex-start;
    border-bottom: 1px solid #333;
    .info {
        flex-grow: 1;
    }
    .buttons {
        align-self: center;
    }
}
</style>
