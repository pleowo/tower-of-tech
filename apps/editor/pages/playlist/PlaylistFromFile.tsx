import { FC, FormEventHandler, useState } from "react";
import { BeatSaberPlaylistSchema, BeatSaberPlaylistWithoutIdSchema } from "@/types/beatsaber-playlist.ts";
import { Playlist } from "./PlaylistItem.tsx";
import { trpc } from "@/trpc/trpc.ts";

export const PlaylistFromFile: FC = () => {
  const [playlists, setPlaylists] = useState<typeof BeatSaberPlaylistWithoutIdSchema._type[] | null>(null);
  const { mutate } = trpc.playlist.createOrUpdate.useMutation();

  const handlePlaylistInput: FormEventHandler<HTMLInputElement> = async (change) => {
    console.log(change.currentTarget.value);
    const input = change.target;
    if (
      "files" in input && input.files instanceof FileList &&
      input.files.length > 0
    ) {
      const readPlaylists = await Promise.all([...input.files].map(async (file) => {
        const reader = new FileReader();
        const content = await new Promise((resolve, reject) => {
          reader.onload = (event) => resolve(event.target?.result);
          reader.onerror = (error) => reject(error);
          reader.readAsText(file);
        });
        const object = JSON.parse(content as string);
        const playlist = await BeatSaberPlaylistWithoutIdSchema.parseAsync(object);
        playlist.id = playlist.id ?? crypto.randomUUID();
        return playlist;
      }));
      setPlaylists(readPlaylists);
    }
  };

  return (
    <div>
      <button onClick={() => playlists && mutate(playlists)}>Publish</button>
      <input
        name="playlist_file"
        type="file"
        multiple
        onInput={handlePlaylistInput}
      />
      {playlists && playlists.map(playlist => <Playlist key={playlist.id} playlist={playlist as typeof BeatSaberPlaylistSchema._type} />)}
    </div>
  );
}