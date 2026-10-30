import api from "@services/api/api";
import type {
  CompleteFeedbackDto,
  CreateFeedbackDto,
  FeedbackEntry,
  FeedbackListParams,
  MyFeedbackResponse,
  RejectFeedbackDto,
  UpdateFeedbackDto,
} from "../types/feedback";

export async function createFeedback(dto: CreateFeedbackDto): Promise<FeedbackEntry> {
  const { data } = await api.post<FeedbackEntry>("/suggestions", dto);
  return data;
}

export async function getFeedback(params: FeedbackListParams = {}, signal?: AbortSignal): Promise<FeedbackEntry[]> {
  const { data } = await api.get<FeedbackEntry[]>("/suggestions", { params, signal });
  return data;
}

export async function getMyFeedback(signal?: AbortSignal): Promise<MyFeedbackResponse> {
  const { data } = await api.get<MyFeedbackResponse>("/suggestions/my", { signal });
  return data;
}

export async function updateFeedback(id: string, dto: UpdateFeedbackDto): Promise<FeedbackEntry> {
  const { data } = await api.patch<FeedbackEntry>(`/suggestions/${id}`, dto);
  return data;
}

export async function reopenFeedback(id: string): Promise<FeedbackEntry> {
  const { data } = await api.patch<FeedbackEntry>(`/suggestions/${id}/progress`);
  return data;
}

export async function rejectFeedback(id: string, dto: RejectFeedbackDto): Promise<FeedbackEntry> {
  const { data } = await api.patch<FeedbackEntry>(`/suggestions/${id}/reject`, dto);
  return data;
}

export async function completeFeedback(id: string, dto: CompleteFeedbackDto): Promise<FeedbackEntry> {
  const { data } = await api.patch<FeedbackEntry>(`/suggestions/${id}/done`, dto);
  return data;
}

export async function deleteFeedback(id: string): Promise<void> {
  await api.delete(`/suggestions/${id}`);
}
