import { VisualNovelContainer } from "@/apps/editor/components/containers/VisualNovelBox.tsx";
import { forwardRef } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "@/packages/trpc/trpc-react.ts";
import { PlaylistMaps } from "@/apps/editor/pages/editor/playlist/PlaylistItem.tsx";
import { VisualNovelDivider } from "@/apps/editor/components/containers/VisualNovelBox.tsx";
import { VisualNovelLink } from "@/apps/editor/components/containers/VisualNovelBox.tsx";
import { VisualNovelAnchor } from "@/apps/editor/components/containers/VisualNovelBox.tsx";
import { links } from "@/apps/editor/routing.config.ts";
import { makePlaylistId } from "@/packages/types/brands.ts";
import { towerOfTechWebsiteOrigin } from "@/packages/utils/constants.ts";
import { getPlaylistFileNameFromPlaylist } from "@/packages/playlist/getPlaylistFileNameFromPlaylist.ts";

export const PlaylistDetails = forwardRef<HTMLDivElement>((_, ref) => {
  const { playlistId } = useParams();
  const { data } = trpc.playlist.getById.useQuery({ id: playlistId! }, {
    enabled: !!playlistId,
  });

  if (!playlistId) return null;
  if (!data) return "Loading...";

  const brandedPlaylistId = makePlaylistId(playlistId);

  return (
    <VisualNovelContainer
      imageUrl={data.imageUrl}
      ref={ref}
      row
      header={
        <div className="text-right mt-5">
          <div className="text-2xl">
            {data?.playlistTitle}
          </div>
          <div className="text-xl">
            {data?.playlistAuthor}
          </div>
          <div className="text-xl">
            Items: {data.songs.length}
          </div>

          <VisualNovelDivider />

          {playlistId && (
            <VisualNovelAnchor
              href={links.api.v1.playlist.oneClick(
                brandedPlaylistId,
                getPlaylistFileNameFromPlaylist(data),
                towerOfTechWebsiteOrigin,
              )}
            >
              OneClick
            </VisualNovelAnchor>
          )}
          <VisualNovelAnchor
            href={links.api.v1.playlist.download(brandedPlaylistId)}
            download
          >
            Download
          </VisualNovelAnchor>
          <VisualNovelLink to="/">
            Home
          </VisualNovelLink>
        </div>
      }
    >
      <div className="ml-3">
        {data.songs && <PlaylistMaps maps={data.songs} />}
      </div>
    </VisualNovelContainer>
  );
});
