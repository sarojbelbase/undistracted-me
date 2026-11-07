/**
 * Media manifest — assets live in Cloudflare R2 (bucket `undistracted-me-media`),
 * served publicly at https://media.undistracted.me (zero egress).
 *
 * Rain audio is ~30 MB, which exceeds Cloudflare Pages static-file limit
 * (25 MiB), so it must be served from R2 rather than Pages static assets.
 * The file is Ogg Vorbis — served as `audio/ogg` with an `.ogg` name so the
 * <audio> element decodes it correctly (a previous `.mp3`/`audio/mpeg` upload
 * of the same Ogg bytes broke decoding).
 */
export const RAIN_URL = "https://media.undistracted.me/rain/rain.ogg";

export const BACKGROUNDS = [
  {
    "id": "1",
    "url": "https://media.undistracted.me/backgrounds/1.jpg"
  },
  {
    "id": "2",
    "url": "https://media.undistracted.me/backgrounds/2.jpg"
  },
  {
    "id": "3",
    "url": "https://media.undistracted.me/backgrounds/3.jpg"
  },
  {
    "id": "4",
    "url": "https://media.undistracted.me/backgrounds/4.jpg"
  },
  {
    "id": "5",
    "url": "https://media.undistracted.me/backgrounds/5.jpg"
  },
  {
    "id": "6",
    "url": "https://media.undistracted.me/backgrounds/6.jpg"
  },
  {
    "id": "7",
    "url": "https://media.undistracted.me/backgrounds/7.jpg"
  },
  {
    "id": "8",
    "url": "https://media.undistracted.me/backgrounds/8.jpg"
  },
  {
    "id": "9",
    "url": "https://media.undistracted.me/backgrounds/9.jpg"
  },
  {
    "id": "10",
    "url": "https://media.undistracted.me/backgrounds/10.jpg"
  },
  {
    "id": "11",
    "url": "https://media.undistracted.me/backgrounds/11.jpg"
  },
  {
    "id": "12",
    "url": "https://media.undistracted.me/backgrounds/12.jpg"
  },
  {
    "id": "13",
    "url": "https://media.undistracted.me/backgrounds/13.jpg"
  },
  {
    "id": "14",
    "url": "https://media.undistracted.me/backgrounds/14.jpg"
  },
  {
    "id": "15",
    "url": "https://media.undistracted.me/backgrounds/15.jpg"
  },
  {
    "id": "16",
    "url": "https://media.undistracted.me/backgrounds/16.jpg"
  },
  {
    "id": "17",
    "url": "https://media.undistracted.me/backgrounds/17.jpg"
  },
  {
    "id": "18",
    "url": "https://media.undistracted.me/backgrounds/18.jpg"
  },
  {
    "id": "19",
    "url": "https://media.undistracted.me/backgrounds/19.jpg"
  },
  {
    "id": "20",
    "url": "https://media.undistracted.me/backgrounds/20.jpg"
  },
  {
    "id": "21",
    "url": "https://media.undistracted.me/backgrounds/21.jpg"
  },
  {
    "id": "22",
    "url": "https://media.undistracted.me/backgrounds/22.jpg"
  },
  {
    "id": "23",
    "url": "https://media.undistracted.me/backgrounds/23.jpg"
  },
  {
    "id": "24",
    "url": "https://media.undistracted.me/backgrounds/24.jpg"
  },
  {
    "id": "25",
    "url": "https://media.undistracted.me/backgrounds/25.jpg"
  },
  {
    "id": "26",
    "url": "https://media.undistracted.me/backgrounds/26.jpg"
  },
  {
    "id": "27",
    "url": "https://media.undistracted.me/backgrounds/27.jpg"
  },
  {
    "id": "28",
    "url": "https://media.undistracted.me/backgrounds/28.jpg"
  },
  {
    "id": "29",
    "url": "https://media.undistracted.me/backgrounds/29.jpg"
  },
  {
    "id": "30",
    "url": "https://media.undistracted.me/backgrounds/30.jpg"
  },
  {
    "id": "31",
    "url": "https://media.undistracted.me/backgrounds/31.jpg"
  }
];
