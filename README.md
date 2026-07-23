<div align="center" width="100%">
    <img src="./frontend/public/icon.png" width="128" alt="It's MyTabs" />
</div>

# It's MyTabs

<a target="_blank" href="https://github.com/juneauwang/its-mytabs"><img src="https://img.shields.io/github/stars/juneauwang/its-mytabs?style=flat" /></a>

Open source, web based, self hostable guitar/bass tab viewer and player, similar to Songsterr.

<img width="600" alt="image" src="https://github.com/user-attachments/assets/d7859f4a-8ae0-41e2-bdeb-93b900cc0220" />
<img width="200"  alt="image" src="https://github.com/user-attachments/assets/c980d516-8f6d-4cca-8a59-4a1a4cc75b1b" />

## Features

- Free and open source (MIT License)
- Supports guitar tabs and bass tabs
- Sync your tabs with audio files (.mp3, .ogg), Youtube videos, or **Bilibili videos**
- MIDI Synth - able to mute tracks and solo tracks
- Supports .gp, .gpx, .gp3, .gp4, .gp5, .musicxml, .capx formats
- Simple UI/UX, mobile friendly
- Multiple cursor modes: none, highlight bar, follow cursor
- Note coloring per string
- Dark/Light tab colors
- Score view alongside tab view
- Share tabs with others via link
- **🎸 Online Note Editor** — Edit notes directly on the score: change fret, string, duration, techniques. Keyboard shortcuts. Save as `.gp` format.
- **🌐 i18n Support** — Simplified Chinese and English. Switch in footer. Easy to add more languages.

## Installation (Deno)

Requirements:
- [Deno](https://deno.land/) 2.x or above
- Git
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (for Bilibili video download)

```bash
git clone https://github.com/juneauwang/its-mytabs.git
cd its-mytabs

# Install dependencies
deno install
cd frontend && deno install && cd ..

# Start production server
deno task start
```

Go to `http://localhost:47777` to access the web UI.

## Screenshots

<img width="300"  alt="image" src="https://github.com/user-attachments/assets/266c6c5a-ae86-4b88-8305-3ae120cf4dd8" />
<img width="300"  alt="image" src="https://github.com/user-attachments/assets/a57293a4-5399-4a76-a14d-da026d0c4a7a" />
<img width="300" alt="image" src="https://github.com/user-attachments/assets/972aa28a-1235-465a-be47-ed2bc9bb3035" />
<img width="300" alt="image" src="https://github.com/user-attachments/assets/a617af33-ba33-4022-b9d2-6fe96e11e85d" />

## Environment Variables

Create a `.env` file in the project root:

```ini
# Server Host (Default: bind to all interfaces)
MYTABS_HOST=

# Server Port (Default: 47777)
MYTABS_PORT=47777
```

## Keyboard Shortcuts

### Tab Player

| Key         | Description                                            |
| ----------- | ------------------------------------------------------ |
| Space       | Toggle Play / Pause                                    |
| Arrow Left  | Move cursor to the previous bar                        |
| Arrow Right | Move cursor to the next bar                            |
| Arrow Up    | Restart - Play from start of highlighted range         |
| S           | Play from first bar containing notes (-2 offset)       |

### Note Editor (Edit Mode)

| Key               | Description                        |
| ----------------- | ---------------------------------- |
| Arrow Up / Down   | Increase / Decrease fret           |
| [ / ]             | Switch to previous / next string   |
| Delete / Backspace| Delete selected note               |
| 1 / 2 / 3 / 4 / 5 / 6 | Set duration (whole to 32nd)   |
| . (period)        | Cycle dots                         |
| Ctrl+S            | Save to server                     |
| Esc               | Exit edit mode                     |

## Motivation

A few months ago, I saw a music game called Rocksmith 2014 Remastered on sale on Steam. I bought it, grabbed my brother's abandoned bass, and started playing.

I had 100+ hours in the game, and I loved it. However, I started to realize that I was just following the screen and hitting notes, I cannot actually do anything outside the game. So I decided to actually learn to play bass, learn how to read the tab.

So I found many tools online such as `MuseScore`, `Soundslice`. Eventually, I subscribed to `Songsterr`, I absolutely love it, especial for its UI/UX. However, it is not perfect, many songs don't sync with youtube/audio source correctly, the cursor is confusing due to out-fo-sync issues. There is no manual sync feature. I have also looked into other tools like Soundslice, Guitar Pro 8, which offer sync tools, but they are hard to use. Since most of my favourite songs follow the bpm perfectly, I just want something that able to sync the first bar, and good to go.

Plus, I am not a fan of subscription models.

After searching, I could not find any open source projects that is similar to `Songsterr`, so I decided to make one for myself to learn bass.

Don't forget to ⭐ this repo if you like it!

## Free Resources

- [Ultimate Guitar](https://www.ultimate-guitar.com/) - Some free tabs in *.gp format
- [911Tabs](https://www.911tabs.com/) - Search engine for tabs
- [MuseScore](https://musescore.com/sheetmusic?instrument=72%2C73&recording_type=free-download) - Some free tabs in MusicXML format
- [GProTab](https://gprotab.net/) - Free Guitar Pro tabs in *.gp format

## Special Thanks

- [AlphaTab](https://github.com/CoderLine/alphaTab) by [Daniel Kuschny](https://github.com/Danielku15) - The tab rendering engine
- [It's MyTabs](https://github.com/louislam/its-mytabs) by [Louis Lam](https://github.com/louislam) - The original project

## Development

Requirements: [Deno](https://deno.land/) 2.x

```bash
git clone https://github.com/juneauwang/its-mytabs.git
cd its-mytabs

# Install deps
deno install
cd frontend && deno install && cd ..

# Dev servers (backend :47777 + frontend :5173 with HMR)
deno task dev

# Or run separately if dev task hangs:
# Terminal 1: deno run --allow-all --watch backend/main.ts
# Terminal 2: cd frontend && deno run -A npm:vite
```

This is a fork of [louislam/its-mytabs](https://github.com/louislam/its-mytabs) with additional features.
