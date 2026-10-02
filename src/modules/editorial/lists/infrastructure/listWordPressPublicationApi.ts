import api from "@/shared/infrastructure/http/client";
import type {
  CreateWordPressListPostsResult,
  GenerateBestDiscsWordPressPostResult,
  ListWordPressPublicationPort,
} from "../application/listWordPressPublicationPort";

export const listWordPressPublicationApi: ListWordPressPublicationPort = {
  async publishRadarPosts(listId, position) {
    const response = await api.post<CreateWordPressListPostsResult>(
      `/lists/${listId}/wp-posts`,
      {},
      { params: position ? { position } : undefined },
    );
    return response.data;
  },

  async publishBestDiscsList(listId) {
    const response = await api.post<GenerateBestDiscsWordPressPostResult>(
      `/lists/${listId}/wp-best-post`,
    );
    return response.data;
  },
};
