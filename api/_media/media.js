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
    "url": "https://media.undistracted.me/backgrounds/1.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/1.webp"
  },
  {
    "id": "2",
    "url": "https://media.undistracted.me/backgrounds/2.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/2.webp"
  },
  {
    "id": "3",
    "url": "https://media.undistracted.me/backgrounds/3.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/3.webp"
  },
  {
    "id": "4",
    "url": "https://media.undistracted.me/backgrounds/4.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/4.webp"
  },
  {
    "id": "5",
    "url": "https://media.undistracted.me/backgrounds/5.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/5.webp"
  },
  {
    "id": "6",
    "url": "https://media.undistracted.me/backgrounds/6.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/6.webp"
  },
  {
    "id": "7",
    "url": "https://media.undistracted.me/backgrounds/7.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/7.webp"
  },
  {
    "id": "8",
    "url": "https://media.undistracted.me/backgrounds/8.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/8.webp"
  },
  {
    "id": "9",
    "url": "https://media.undistracted.me/backgrounds/9.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/9.webp"
  },
  {
    "id": "10",
    "url": "https://media.undistracted.me/backgrounds/10.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/10.webp"
  },
  {
    "id": "11",
    "url": "https://media.undistracted.me/backgrounds/11.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/11.webp"
  },
  {
    "id": "12",
    "url": "https://media.undistracted.me/backgrounds/12.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/12.webp"
  },
  {
    "id": "13",
    "url": "https://media.undistracted.me/backgrounds/13.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/13.webp"
  },
  {
    "id": "14",
    "url": "https://media.undistracted.me/backgrounds/14.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/14.webp"
  },
  {
    "id": "15",
    "url": "https://media.undistracted.me/backgrounds/15.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/15.webp"
  },
  {
    "id": "16",
    "url": "https://media.undistracted.me/backgrounds/16.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/16.webp"
  },
  {
    "id": "17",
    "url": "https://media.undistracted.me/backgrounds/17.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/17.webp"
  },
  {
    "id": "18",
    "url": "https://media.undistracted.me/backgrounds/18.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/18.webp"
  },
  {
    "id": "19",
    "url": "https://media.undistracted.me/backgrounds/19.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/19.webp"
  },
  {
    "id": "20",
    "url": "https://media.undistracted.me/backgrounds/20.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/20.webp"
  },
  {
    "id": "21",
    "url": "https://media.undistracted.me/backgrounds/21.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/21.webp"
  },
  {
    "id": "22",
    "url": "https://media.undistracted.me/backgrounds/22.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/22.webp"
  },
  {
    "id": "23",
    "url": "https://media.undistracted.me/backgrounds/23.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/23.webp"
  },
  {
    "id": "24",
    "url": "https://media.undistracted.me/backgrounds/24.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/24.webp"
  },
  {
    "id": "25",
    "url": "https://media.undistracted.me/backgrounds/25.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/25.webp"
  },
  {
    "id": "26",
    "url": "https://media.undistracted.me/backgrounds/26.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/26.webp"
  },
  {
    "id": "27",
    "url": "https://media.undistracted.me/backgrounds/27.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/27.webp"
  },
  {
    "id": "28",
    "url": "https://media.undistracted.me/backgrounds/28.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/28.webp"
  },
  {
    "id": "29",
    "url": "https://media.undistracted.me/backgrounds/29.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/29.webp"
  },
  {
    "id": "30",
    "url": "https://media.undistracted.me/backgrounds/30.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/30.webp"
  },
  {
    "id": "31",
    "url": "https://media.undistracted.me/backgrounds/31.jpg",
    "thumb": "https://media.undistracted.me/backgrounds/thumbs/31.webp"
  }
];
