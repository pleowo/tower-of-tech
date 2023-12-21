import {
  BeatSaverIdToHashCacheSchema,
  BeatSaverMapByHashResponseSchema,
  BeatSaverMapByIdResponseSchema,
  BeatSaverMapId,
} from "../types/beatsaver.ts";
import { fetcher } from "../fetcher/mod.ts";
import { fileExists } from "../fs/fileExists.ts";
import { LowercaseMapHash } from "../types/brands.ts";
import { dbEditor, s3clientEditor } from "../database-editor/mod.ts";
import { buckets } from "../database-editor/buckets.ts";
import { BeatSaverApi } from "./api.ts";
import {
  BeatSaverResolvable,
  splitBeatSaverResolvables,
} from "@/packages/api-beatsaver/BeatSaverResolvable.ts";

export { BeatSaverApi };

const getMapHashResponseCacheKey = (
  hash: LowercaseMapHash,
) => ["API_BEATSAVER", "MAP_HASH", "RESPONSE", hash];
export const cacheMapByHashIfNotExists = async (
  hash: string,
  downloadUrl: string,
) => {
  const mapPath = `./maps/${hash}.zip`;
  if (!fileExists(mapPath)) {
    const responseFile = await fetcher(downloadUrl);
    await Deno.writeFile(
      `./cache/${hash}.zip`,
      new Uint8Array(await responseFile.arrayBuffer()),
    );
  }
};

type IdsToHashesCacheType = {
  id: BeatSaverMapId;
  status: "error" | "forgotten" | "old" | "ok" | "fetch";
  data?: typeof BeatSaverIdToHashCacheSchema._type;
};

const idsToHashesCache = async (idArray: BeatSaverMapId[]) => {
  return await Promise.all(
    idArray.map(async (id): Promise<IdsToHashesCacheType> => {
      const idToHashCacheItem = await dbEditor.BeatSaverIdToHashCache.findFirst(
        {
          where: { id },
        },
      );

      if (!idToHashCacheItem) return { id, status: "fetch" };
      if (!idToHashCacheItem.available) return { id, status: "error" };
      if (!idToHashCacheItem.hash) return { id, status: "error" };
      return { id, status: "ok", data: idToHashCacheItem };
    }),
  );
};

const fetchAndCacheHashesGetCache = (hashArray: LowercaseMapHash[]) => {
  return hashArray.map(async (lowercaseHash) => {
    const exists = await s3clientEditor.exists(lowercaseHash, {
      bucketName: buckets.beatSaver.mapByHash,
    });
    if (exists) {
      const response = await s3clientEditor.getObject(lowercaseHash, {
        bucketName: buckets.beatSaver.mapByHash,
      });
      const data = await response.json();

      return [lowercaseHash, data] as const;
    }
    return [lowercaseHash, undefined] as const;
  });
};

export const fetchAndCacheHashes = async (hashArray: LowercaseMapHash[]) => {
  const promises = [] as ReturnType<typeof BeatSaverApi.mapByHash.get>[];
  const partiallyResolved = await Promise.all(
    fetchAndCacheHashesGetCache(hashArray),
  );
  const resolvedFromCache = BeatSaverMapByHashResponseSchema.parseAsync(
    Object.fromEntries(
      partiallyResolved.filter(([, data]) => !!data),
    ),
  );
  const remainingHashArray = partiallyResolved
    .filter(([, data]) => !data)
    .map(([lowercaseHash]) => lowercaseHash);

  while (remainingHashArray.length > 0) {
    console.log("batch")
    const hashQueue = remainingHashArray.splice(0, 50);
    const hashString = hashQueue.join(",");
    promises.push(BeatSaverApi.mapByHash.get({
      urlParams: {
        hash: hashString,
      },
    }));
  }
  console.log("batch wait")
  const data = await Promise.all(promises);
  console.log("batch done")
  const response = data
    .map((x) => x.data)
    .reduce(
      (prev, curr) => ({ ...prev, ...curr }),
      {},
    );
  console.log("batch reduced")

  try {
    // const response = BeatSaverMapByHashResponseSchema.parse(object);

    // if (response) {
    //   Object.entries(response)
    //     .forEach(([lowercaseHash, data]) =>
    //       s3clientEditor.putObject(lowercaseHash, JSON.stringify(data), {
    //         bucketName: buckets.beatSaver.mapByHash,
    //       })
    //     );
    // }
    console.log("batch cached")

    const awaitedCache = await resolvedFromCache;
    console.log("batch cache awaited")
    return { ...response, ...awaitedCache };
  } catch (err) {
    console.error(err);
  }
};

export const batchFetchIds = async (idsArray: BeatSaverMapId[]) => {
  const promises = [] as ReturnType<typeof BeatSaverApi.mapsByIds.get>[];
  const remainingIdsArray = [...idsArray];

  while (remainingIdsArray.length > 0) {
    const idsQueue = remainingIdsArray.splice(0, 50);
    const idsString = idsQueue.join(",");
    promises.push(BeatSaverApi.mapsByIds.get({
      urlParams: {
        ids: idsString,
      },
    }));
  }

  const data = await Promise.all(promises);
  const object = data.map((x) => {
    return x.data;
  }).reduce(
    (prev, curr) => ({ ...prev, ...curr }),
    {},
  );

  try {
    const response = BeatSaverMapByIdResponseSchema.parse(object);

    return response;
  } catch (err) {
    console.error(err);
  }
};

export const fetchAndCacheFromResolvablesRaw = async (
  resolvables: BeatSaverResolvable[],
) => {
  const {
    hashResolvables,
    idResolvables,
  } = splitBeatSaverResolvables(resolvables);

  const hashesFromIdResolvables = await idsToHashesCache(
    idResolvables.map((x) => x.data),
  );

  const hashesArrayFromResolvables = hashResolvables.map((x) => x.data);
  const hashesFromCache = hashesFromIdResolvables
    .filter((x) => x.status === "ok")
    .map((x) => x.data!.hash!);
  const hashesArray = [...hashesFromCache, ...hashesArrayFromResolvables];
  const responseFromHashesP = fetchAndCacheHashes(hashesArray);

  const idsArray = hashesFromIdResolvables
    .filter((x) => x.status === "fetch")
    .map((x) => x.id);
  const responseFromIds = await batchFetchIds(idsArray);

  if (responseFromIds) {
    await dbEditor.BeatSaverIdToHashCache.upsertMany({
      data: Object.entries(responseFromIds).map(([id, x]) => ({
        id,
        hash: x?.versions[0].hash,
        available: !!x,
        outdated: false,
      })),
    });
  }

  return {
    fromHashes: await responseFromHashesP,
    fromIds: responseFromIds,
  };
};

export const fetchAndCacheFromResolvables = async (
  resolvables: BeatSaverResolvable[],
) => {
  const resolved = await fetchAndCacheFromResolvablesRaw(resolvables);
  return [
    ...Object.values(resolved.fromHashes ?? {}),
    ...Object.values(resolved.fromIds ?? {}),
  ];
};
