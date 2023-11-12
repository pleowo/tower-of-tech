import { createPentagon } from "pentagon";
import { S3Client } from "s3_lite_client";
import { isDevelopment } from "@/packages/utils/envrionment.ts";
import { BeatSaberPlaylist, BeatSaberPlaylistSongItem } from "@/packages/database/BeatSaberPlaylist.ts";
import { BeatSaverResponseWrapper, BeatSaverMapResponseSuccess } from "@/packages/database/BeatSaverResponse.ts";

const kv = isDevelopment()
  ? await Deno.openKv("./local.db")
  : await Deno.openKv();

export const db = createPentagon(kv, {
  BeatSaverResponseWrapper,
  BeatSaverMapResponseSuccess,
  BeatSaberPlaylist,
  BeatSaberPlaylistSongItem
});

export const s3client = isDevelopment()
? new S3Client({
    endPoint: "localhost",
    port: 8014,
    useSSL: false,
    region: "dev-region",
    accessKey: "AKEXAMPLES3S",
    secretKey: "SKEXAMPLES3S",
    bucket: "dev-bucket",
    pathStyle: true,
  })
: new S3Client({
    endPoint: Deno.env.get("S3_URL")!,
    port: 443,
    region: "auto",
    useSSL: true,
    accessKey: Deno.env.get("S3_KEY_ID"),
    secretKey: Deno.env.get("S3_SECRET_ACCESS_KEY"),
    bucket: "dev-bucket",
    pathStyle: true,
  });
